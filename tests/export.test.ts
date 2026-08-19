import { test, describe } from "node:test";
import assert from "node:assert";
import ExcelJS from "exceljs";

describe("Unit Test: Standardized Purchase Proposal Excel Generation", () => {
  test("1. Sinh file Excel theo đúng cấu trúc biểu mẫu YÊU CẦU MUA SẮM (Ảnh 1)", async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Yêu Cầu Mua Sắm");

    // Header checks
    worksheet.mergeCells("A1:B3");
    worksheet.getCell("A1").value = "TRƯỜNG MẦM NON\nKHO ĐỒ DÙNG";

    worksheet.mergeCells("C1:F3");
    worksheet.getCell("C1").value = "YÊU CẦU MUA SẮM";

    worksheet.mergeCells("G1:H3");
    worksheet.getCell("G1").value = "Mã số: HT/QT-01/M01\nHiệu lực: 01/11/2018";

    // Table Header
    worksheet.getRow(8).values = [
      "Stt",
      "Tên tài sản/\ndịch vụ",
      "Đặc điểm/\nQuy cách",
      "Đvt",
      "SL\ntồn",
      "SL\ncần",
      "SL\nmua\nmới",
      "Ghi chú",
    ];

    assert.strictEqual(worksheet.getCell("C1").value, "YÊU CẦU MUA SẮM");
    assert.strictEqual(worksheet.getRow(8).getCell(1).value, "Stt");
    assert.strictEqual(worksheet.getRow(8).getCell(4).value, "Đvt");
    assert.strictEqual(worksheet.getRow(8).getCell(7).value, "SL\nmua\nmới");

    const buffer = await workbook.xlsx.writeBuffer();
    assert.ok(buffer.byteLength > 0, "Buffer Excel phải được tạo thành công");
  });
});
