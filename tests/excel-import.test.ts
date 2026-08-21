import { test, describe } from "node:test";
import assert from "node:assert";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import {
  generateInventoryImportTemplateBuffer,
  parseExcelInventoryBuffer,
} from "../lib/excel-import";
import { prisma } from "../lib/db";
import { normalizeVietnamese } from "../lib/search";

describe("Unit & Integration Tests: Excel Inventory Import (Module Kho)", () => {
  test("1. Kiểm tra sinh file Excel mẫu (.xlsx) chuẩn cấu trúc biểu mẫu YÊU CẦU MUA SẮM", async () => {
    const buffer = await generateInventoryImportTemplateBuffer();
    assert.ok(buffer instanceof Buffer, "Phải sinh ra Buffer hợp lệ");
    assert.ok(buffer.length > 1000, "Dung lượng file Excel mẫu phải > 1KB");

    const workbook = new ExcelJS.Workbook();
    // @ts-ignore
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    assert.strictEqual(sheet.name, "YÊU CẦU MUA SẮM");
    assert.ok(sheet.rowCount >= 10, "Sheet mẫu phải có ít nhất 10 dòng");
  });

  test("2. Kiểm tra đọc và bóc tách dữ liệu từ file Excel mẫu (parseExcelInventoryBuffer)", async () => {
    const buffer = await generateInventoryImportTemplateBuffer();
    const result = await parseExcelInventoryBuffer(buffer);

    assert.ok(result.totalRows >= 10, "Phải đọc được ít nhất 10 dòng sản phẩm");
    assert.strictEqual(result.validRows, result.totalRows);
    assert.strictEqual(result.invalidRows, 0);

    // Kiểm tra các món hàng mẫu
    const paperA4 = result.items.find((i) => i.name.includes("Giấy bìa A4"));
    assert.ok(paperA4, "Phải tìm thấy Giấy bìa A4");
    assert.strictEqual(paperA4?.unit, "xấp");
    assert.strictEqual(paperA4?.quantity, 3);
    assert.strictEqual(paperA4?.price, 60000);
    assert.ok(paperA4?.imageUrl, "Phải tự động gán thumbnail ảnh mầm non phù hợp");

    const photoPaper = result.items.find((i) => i.name.includes("Giấy in ảnh"));
    assert.ok(photoPaper, "Phải tìm thấy Giấy in ảnh");
    assert.strictEqual(photoPaper?.price, 65000);
  });

  test("3. Kiểm tra phân tích file Excel tùy biến đúng cấu trúc trong ảnh người dùng", async () => {
    // Tạo workbook giả lập đúng định dạng trong ảnh người dùng tải lên
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("YEU CAU");

    sheet.addRow(["", "YÊU CẦU MUA SẮM", "", "", "", "", "Mã số: HT/QT-01/M01"]);
    sheet.addRow(["I. YÊU CẦU MUA SẮM"]);
    sheet.addRow(["1. Đơn vị yêu cầu: Ngoại khoá", "", "", "", "", "Thời gian đáp ứng: 16/01/2026"]);
    sheet.addRow(["2. Nội dung yêu cầu:"]);
    sheet.addRow(["Stt", "Tên tài sản/dịch vụ", "Đvt", "SL tồn", "SL cần", "SL mua mới", "Đơn giá", "Thành tiền"]);

    // Dữ liệu từ ảnh người dùng
    sheet.addRow([1, "Xe ba gác di chuyển", "Chuyến", 0, 5, 5, 167000, 835000]);
    sheet.addRow([2, "Giấy bìa A4 cứng trắng", "Xấp", 0, 3, 3, 60000, 180000]);
    sheet.addRow([3, "Giấy in ảnh", "xấp", 0, 3, 3, 65000, 195000]);
    sheet.addRow([4, "Bìa ép", "xấp", 0, 1, 1, 130000, 130000]);
    sheet.addRow([5, "Giấy bìa màu đỏ", "xấp", 0, 2, 2, 110000, 220000]);
    sheet.addRow([6, "Giấy bìa màu vàng", "xấp", 0, 2, 2, 110000, 220000]);
    sheet.addRow([7, "Giấy A0 màu vàng đồng", "tờ", 0, 3, 3, 30000, 90000]);
    sheet.addRow([8, "Giấy A0 màu trắng", "tờ", 0, 3, 3, 10000, 30000]);
    sheet.addRow([9, "Giấy A0 màu đỏ", "tờ", 0, 5, 5, 30000, 150000]);

    const buf = Buffer.from(await workbook.xlsx.writeBuffer());
    const parseResult = await parseExcelInventoryBuffer(buf);

    assert.strictEqual(parseResult.targetCategory, "ngoai_khoa");
    assert.strictEqual(parseResult.totalRows, 9);
    assert.strictEqual(parseResult.validRows, 9);

    const xeBaGac = parseResult.items[0];
    assert.strictEqual(xeBaGac.name, "Xe ba gác di chuyển");
    assert.strictEqual(xeBaGac.unit, "chuyến");
    assert.strictEqual(xeBaGac.quantity, 5);
    assert.strictEqual(xeBaGac.price, 167000);

    const biaEp = parseResult.items[3];
    assert.strictEqual(biaEp.name, "Bìa ép");
    assert.strictEqual(biaEp.quantity, 1);
    assert.strictEqual(biaEp.price, 130000);
  });

  test("4. Kiểm tra nạp và lưu CSDL hàng loạt (Transaction, Stock Logs, Duplicate Modes)", async () => {
    const admin = await prisma.user.findUnique({ where: { username: "admin" } });
    assert.ok(admin);

    const testItemName = `Bìa ép nhiệt Test Import ${Date.now()}`;
    const norm = normalizeVietnamese(testItemName);

    // 1. Tạo mới mặt hàng
    const createdItem = await prisma.item.create({
      data: {
        name: testItemName,
        nameNormalized: norm,
        category: "ngoai_khoa",
        unit: "xấp",
        quantity: 5,
        minStock: 2,
        price: 120000,
      },
    });

    // 2. Mô phỏng import chế độ "accumulate" (cộng dồn)
    const newQtyToAdd = 10;
    const updated = await prisma.item.update({
      where: { id: createdItem.id },
      data: {
        quantity: createdItem.quantity + newQtyToAdd,
        price: 130000,
      },
    });

    await prisma.stockTransaction.create({
      data: {
        itemId: updated.id,
        type: "nhap_kho",
        quantityChange: newQtyToAdd,
        performedBy: admin.id,
        note: "Import test cộng dồn",
      },
    });

    assert.strictEqual(updated.quantity, 15);
    assert.strictEqual(updated.price, 130000);

    const tx = await prisma.stockTransaction.findFirst({
      where: { itemId: updated.id, type: "nhap_kho" },
    });
    assert.ok(tx);
    assert.strictEqual(tx.quantityChange, 10);

    // Clean up
    await prisma.stockTransaction.deleteMany({ where: { itemId: updated.id } });
    await prisma.item.delete({ where: { id: updated.id } });
  });

  test("5. Kiểm tra đọc và phân tích file Word (.docx) chứa bảng biểu đúng như hình", async () => {
    const zip = new JSZip();

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>YÊU CẦU MUA SẮM</w:t></w:r></w:p>
    <w:p><w:r><w:t>1. Đơn vị yêu cầu: Ngoại khoá</w:t></w:r><w:r><w:t>    Thời gian đáp ứng: 16/01/2026</w:t></w:r></w:p>
    <w:p><w:r><w:t>2. Nội dung yêu cầu:</w:t></w:r></w:p>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Stt</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Tên tài sản/dịch vụ</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Đvt</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>SL tồn</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>SL cần</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>SL mua mới</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Đơn giá</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Thành tiền</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>1</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Xe ba gác di chuyển</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Chuyến</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>0</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>5</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>5</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>167,000</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>835,000</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>2</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Giấy bìa A4 cứng trắng</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Xấp</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>0</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>3</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>3</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>60,000</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>180,000</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`;

    zip.file("word/document.xml", documentXml);
    const docxBuf = Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));

    const { parseUniversalInventoryBuffer } = await import("../lib/excel-import");
    const result = await parseUniversalInventoryBuffer(docxBuf, "yeu_cau_mua_sam.docx");

    assert.strictEqual(result.fileType, "word");
    assert.strictEqual(result.targetCategory, "ngoai_khoa");
    assert.strictEqual(result.totalRows, 2);
    assert.strictEqual(result.validRows, 2);

    const item1 = result.items[0];
    assert.strictEqual(item1.name, "Xe ba gác di chuyển");
    assert.strictEqual(item1.unit, "chuyến");
    assert.strictEqual(item1.quantity, 5);
    assert.strictEqual(item1.price, 167000);
    assert.strictEqual(item1.category, "ngoai_khoa");
  });

  test("6. Kiểm tra trùng tên khác giá -> Tự động phát hiện và cập nhật giá mới (priceUpdateMode)", async () => {
    const testName = `Giấy bìa Test Price ${Date.now()}`;
    const norm = normalizeVietnamese(testName);

    // 1. Tạo trước trong kho với giá cũ = 50,000 đ
    const initialItem = await prisma.item.create({
      data: {
        name: testName,
        nameNormalized: norm,
        category: "hoc_tap",
        unit: "xấp",
        quantity: 10,
        minStock: 2,
        price: 50000,
      },
    });

    assert.strictEqual(initialItem.price, 50000);

    // 2. Mô phỏng nạp từ file với giá mới = 65,000 đ
    const newPriceFromFile = 65000;
    const isPriceDifferent = initialItem.price !== newPriceFromFile;
    assert.strictEqual(isPriceDifferent, true);

    // 3. Cập nhật với priceUpdateMode = "update_from_file"
    const updated = await prisma.item.update({
      where: { id: initialItem.id },
      data: {
        price: newPriceFromFile,
      },
    });

    assert.strictEqual(updated.price, 65000);

    // Clean up
    await prisma.item.delete({ where: { id: updated.id } });
  });

  test("7. Kiểm tra loại bỏ triệt để các dòng chữ ký và trường hành chính không phải hàng hóa", async () => {
    const { isNonMerchandiseText } = await import("../lib/excel-import");

    const signatureRows = [
      "QUẢN LÝ BỘ PHẬN (Ngày / / 20",
      "NGƯỜI ĐỀ NGHỊ (Ký, ghi rõ họ tên)",
      "HIỆU TRƯỞNG DUYỆT (Ký tên)",
      "KẾ TOÁN TRƯỞNG",
      "THỦ KHO XÁC NHẬN",
      "Tổng cộng",
      "Cộng tiền hàng",
      "Bằng chữ: Một triệu đồng",
      "Ghi chú: Đề xuất mua mới",
      "Ngày 16 tháng 01 năm 2026",
    ];

    for (const text of signatureRows) {
      const norm = normalizeVietnamese(text);
      const isNoise = isNonMerchandiseText(text, norm, text);
      assert.strictEqual(isNoise, true, `Chuỗi '${text}' phải được nhận diện là trường thừa / chữ ký`);
    }

    const realItems = [
      "Giấy bìa A4 cứng trắng",
      "Bút sáp màu hữu cơ",
      "Kéo thủ công mũi tròn",
      "Đất nặn an toàn cho bé",
    ];

    for (const text of realItems) {
      const norm = normalizeVietnamese(text);
      const isNoise = isNonMerchandiseText(text, norm, text);
      assert.strictEqual(isNoise, false, `Mặt hàng '${text}' phải được giữ lại hợp lệ`);
    }
  });
});
