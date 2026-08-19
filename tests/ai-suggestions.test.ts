import { test, describe } from "node:test";
import assert from "node:assert";
import {
  findSimilarInStockItems,
  getAiSupplySuggestions,
  inferStationeryUnit,
  StockItemLookup,
} from "../lib/ai-suggestions";

describe("Unit Tests: Exact AI Suggestions & Strict Sub-Category Matching", () => {
  const mockStock: StockItemLookup[] = [
    {
      id: "item-1",
      name: "Bút màu dạ 12 màu",
      category: "hoc_tap",
      unit: "hộp",
      quantity: 15,
      availableQuantity: 15,
    },
    {
      id: "item-2",
      name: "Giấy A4 màu thủ công",
      category: "hoc_tap",
      unit: "ram",
      quantity: 3,
      availableQuantity: 3,
    },
    {
      id: "item-3",
      name: "Ruy-băng trang trí hoa",
      category: "ngoai_khoa",
      unit: "cuộn",
      quantity: 20,
      availableQuantity: 20,
    },
    {
      id: "item-4",
      name: "Keo dán nến đóng khung",
      category: "ngoai_khoa",
      unit: "gói",
      quantity: 2,
      availableQuantity: 2,
    },
  ];

  test("1. Tìm 'bút chì' -> AI PHẢI gợi ý đúng Bút chì 2B với ĐVT là 'hộp' hoặc 'cây', TUYỆT ĐỐI KHÔNG ĐƯỢC LÀ 'cuộn'", async () => {
    const aiSuggestions = await getAiSupplySuggestions("bút chì", mockStock);
    assert.ok(aiSuggestions.length > 0, "AI phải trả về các gợi ý bút chì");
    
    const pencil = aiSuggestions.find((s) => s.name.toLowerCase().includes("bút chì"));
    assert.ok(pencil, "Phải có gợi ý Bút chì 2B");
    assert.notStrictEqual(pencil.unit, "cuộn", "Bút chì TUYỆT ĐỐI KHÔNG ĐƯỢC có đơn vị tính là cuộn!");
    assert.ok(pencil.unit === "hộp" || pencil.unit === "cây", "ĐVT bút chì phải là hộp hoặc cây");
  });

  test("2. Kiểm thử hàm inferStationeryUnit cho toàn bộ các mặt hàng mầm non", () => {
    assert.strictEqual(inferStationeryUnit("bút chì 2B"), "hộp");
    assert.strictEqual(inferStationeryUnit("bút bi thiên long"), "hộp");
    assert.strictEqual(inferStationeryUnit("băng keo 2 mặt"), "cuộn");
    assert.strictEqual(inferStationeryUnit("tấm format 3mm"), "tấm");
    assert.strictEqual(inferStationeryUnit("giấy in A4 Double A"), "ram");
    assert.strictEqual(inferStationeryUnit("hồ dán khô Deli"), "thỏi");
    assert.strictEqual(inferStationeryUnit("nước rửa tay Lifebuoy"), "chai");
    assert.strictEqual(inferStationeryUnit("kéo thủ công mũi tròn"), "cái");
  });

  test("3. Tìm 'băng keo 2 mặt' -> AI PHẢI gợi ý đúng các loại Băng dính / Băng keo 2 mặt (ĐVT: cuộn)", async () => {
    const aiSuggestions = await getAiSupplySuggestions("băng keo 2 mặt", mockStock);
    assert.ok(aiSuggestions.length > 0, "AI phải trả về các gợi ý băng keo 2 mặt");
    
    const tape = aiSuggestions.find((s) => s.name.toLowerCase().includes("băng dính 2 mặt") || s.name.toLowerCase().includes("băng keo"));
    assert.ok(tape, "Phải gợi ý Băng dính 2 mặt");
    assert.strictEqual(tape.unit, "cuộn", "Đơn vị tính của băng keo 2 mặt phải là cuộn");
  });

  test("4. Tìm 'băng keo 2 mặt' -> KHÔNG ĐƯỢC gợi ý sai 'Keo dán nến đóng khung' trong kho", () => {
    const similar = findSimilarInStockItems("băng keo 2 mặt", mockStock);
    assert.strictEqual(similar.length, 0, "Kho chỉ có keo nến, không được gán ghép nhầm với băng keo 2 mặt");
  });

  test("5. Tìm 'format' -> AI PHẢI gợi ý đúng Tấm Formex (Format) làm mô hình & trang trí (ĐVT: tấm)", async () => {
    const aiSuggestions = await getAiSupplySuggestions("format", mockStock);
    assert.ok(aiSuggestions.length > 0, "AI phải trả về gợi ý tấm format / formex");
    
    const formex = aiSuggestions.find((s) => s.name.toLowerCase().includes("formex") || s.name.toLowerCase().includes("format"));
    assert.ok(formex, "Phải có gợi ý Tấm Formex (Format)");
    assert.strictEqual(formex.unit, "tấm", "Đơn vị tính phải là tấm");
  });

  test("6. Tìm 'bút bi thiên long' -> AI PHẢI gợi ý đúng các loại Bút bi Thiên Long chính hãng", async () => {
    const aiSuggestions = await getAiSupplySuggestions("bút bi thiên long", mockStock);
    assert.ok(aiSuggestions.length > 0, "AI phải trả về các gợi ý bút bi Thiên Long");
    
    const thienLong = aiSuggestions.find((s) => s.name.includes("Bút bi Thiên Long"));
    assert.ok(thienLong, "Phải gợi ý Bút bi Thiên Long");
    assert.ok(thienLong.name.includes("TL-027") || thienLong.name.includes("TL-079"), "Phải có mã bút thực tế");
  });

  test("7. Tìm 'màu thực phẩm' -> KHÔNG ĐƯỢC gợi ý sai 'Keo dán nến' hay 'Bút màu dạ'", () => {
    const similar = findSimilarInStockItems("màu thực phẩm", mockStock);
    assert.strictEqual(similar.length, 0, "Kho chưa có màu thực phẩm, không được gợi ý bừa");
  });
});
