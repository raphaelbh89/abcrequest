import { test, describe } from "node:test";
import assert from "node:assert";
import { searchInternalItems } from "../lib/search";

describe("Bộ Kiểm Thử Độ Chính Xác 40 Câu Truy Vấn Tiếng Việt (searchInternalItems)", () => {
  // =========================================================================
  // NHÓM 1: Gõ đúng tên hoàn toàn (10 câu)
  // Tiêu chí: Top-1 Accuracy >= 90% (Mục tiêu đạt 100%)
  // =========================================================================
  const group1Queries = [
    { query: "Bút chì 2B thân gỗ", expectedTop1: "Bút chì 2B thân gỗ" },
    { query: "Bút bi Thiên Long 0.5mm", expectedTop1: "Bút bi Thiên Long 0.5mm" },
    { query: "Bút màu dạ 12 màu", expectedTop1: "Bút màu dạ 12 màu" },
    { query: "Sáp màu hữu cơ 16 màu", expectedTop1: "Sáp màu hữu cơ 16 màu" },
    { query: "Giấy A4 màu thủ công", expectedTop1: "Giấy A4 màu thủ công" },
    { query: "Đất nặn tạo hình 12 màu", expectedTop1: "Đất nặn tạo hình 12 màu" },
    { query: "Kéo thủ công mũi tròn an toàn", expectedTop1: "Kéo thủ công mũi tròn an toàn" },
    { query: "Băng dính 2 mặt siêu dính", expectedTop1: "Băng dính 2 mặt siêu dính" },
    { query: "Tấm Formex (Format) dày 5mm", expectedTop1: "Tấm Formex (Format) dày 5mm" },
    { query: "Keo dán nến đóng khung", expectedTop1: "Keo dán nến đóng khung" },
  ];

  // =========================================================================
  // NHÓM 2: Gõ sai chính tả nhẹ / gõ không dấu / lỗi phím (10 câu)
  // Tiêu chí: Top-1 Accuracy >= 90%
  // =========================================================================
  const group2Queries = [
    { query: "keó", expectedTop1: "Kéo thủ công mũi tròn an toàn" },
    { query: "giay mau", expectedTop1: "Giấy A4 màu thủ công" },
    { query: "but chii", expectedTop1: "Bút chì 2B thân gỗ" },
    { query: "but bi thien long", expectedTop1: "Bút bi Thiên Long 0.5mm" },
    { query: "but mau da", expectedTop1: "Bút màu dạ 12 màu" },
    { query: "sap mau huu co", expectedTop1: "Sáp màu hữu cơ 16 màu" },
    { query: "dat nan tao hinh", expectedTop1: "Đất nặn tạo hình 12 màu" },
    { query: "bang dinh 2 mat", expectedTop1: "Băng dính 2 mặt siêu dính" },
    { query: "tam formex", expectedTop1: "Tấm Formex (Format) dày 5mm" },
    { query: "keo dan nen", expectedTop1: "Keo dán nến đóng khung" },
  ];

  // =========================================================================
  // NHÓM 3: Gõ từ đồng nghĩa / cách gọi khác (10 câu)
  // Tiêu chí: Top-3 Recall >= 70%
  // =========================================================================
  const group3Queries = [
    { query: "viết chì", targetItem: "Bút chì 2B thân gỗ" },
    { query: "viết bi", targetItem: "Bút bi Thiên Long 0.5mm" },
    { query: "bút sáp", targetItem: "Sáp màu hữu cơ 16 màu" },
    { query: "sáp dầu", targetItem: "Sáp màu hữu cơ 16 màu" },
    { query: "giấy thủ công", targetItem: "Giấy A4 màu thủ công" },
    { query: "đất sét", targetItem: "Đất nặn tạo hình 12 màu" },
    { query: "băng keo 2 mặt", targetItem: "Băng dính 2 mặt siêu dính" },
    { query: "tấm format", targetItem: "Tấm Formex (Format) dày 5mm" },
    { query: "kéo cắt giấy", targetItem: "Kéo thủ công mũi tròn an toàn" },
    { query: "keo nến", targetItem: "Keo dán nến đóng khung" },
  ];

  // =========================================================================
  // NHÓM 4: Gõ tên món hoàn toàn không có trong kho (10 câu)
  // Tiêu chí: Mảng RỖNG 100% (results.length === 0)
  // =========================================================================
  const group4Queries = [
    "Kính hiển vi quang học điện tử",
    "Máy in 3D công nghiệp",
    "Tủ lạnh Panasonic 300L",
    "Xe đạp ba bánh trẻ em mầm non",
    "Cột bóng rổ di động ngoài trời",
    "Xích đu cầu trượt liên hoàn inox",
    "Máy chiếu Epson full HD",
    "Dầu gội đầu Rejoice 650ml",
    "Bộ cờ vua quốc tế cao cấp bằng gỗ",
    "Máy giặt Electrolux 9kg cửa ngang",
  ];

  test("Nhóm 1: 10 câu gõ đúng tên hoàn toàn -> Top-1 Accuracy >= 90%", async () => {
    let top1Correct = 0;

    for (const item of group1Queries) {
      const res = await searchInternalItems(item.query);
      const top1 = res.results[0];

      if (top1 && top1.name === item.expectedTop1) {
        top1Correct++;
      } else {
        console.warn(`❌ [Nhóm 1 Fail] Query: "${item.query}", Expected: "${item.expectedTop1}", Got: "${top1?.name || "NONE"}"`);
      }
    }

    const accuracy = (top1Correct / group1Queries.length) * 100;
    console.log(`\n📊 [Nhóm 1] Kết quả: ${top1Correct}/${group1Queries.length} câu đúng Top-1 (${accuracy}%)`);
    assert.ok(accuracy >= 90, `Nhóm 1 cần đạt tối thiểu 90% accuracy, thực tế: ${accuracy}%`);
  });

  test("Nhóm 2: 10 câu gõ sai chính tả nhẹ / không dấu -> Top-1 Accuracy >= 90%", async () => {
    let top1Correct = 0;

    for (const item of group2Queries) {
      const res = await searchInternalItems(item.query);
      const top1 = res.results[0];

      if (top1 && top1.name === item.expectedTop1) {
        top1Correct++;
      } else {
        console.warn(`❌ [Nhóm 2 Fail] Query: "${item.query}", Expected: "${item.expectedTop1}", Got: "${top1?.name || "NONE"}"`);
      }
    }

    const accuracy = (top1Correct / group2Queries.length) * 100;
    console.log(`📊 [Nhóm 2] Kết quả: ${top1Correct}/${group2Queries.length} câu đúng Top-1 (${accuracy}%)`);
    assert.ok(accuracy >= 90, `Nhóm 2 cần đạt tối thiểu 90% accuracy, thực tế: ${accuracy}%`);
  });

  test("Nhóm 3: 10 câu gõ từ đồng nghĩa / cách gọi khác -> Top-3 Recall >= 70%", async () => {
    let top3RecallCount = 0;

    for (const item of group3Queries) {
      const res = await searchInternalItems(item.query);
      const top3Names = res.results.slice(0, 3).map((r) => r.name);

      if (top3Names.includes(item.targetItem)) {
        top3RecallCount++;
      } else {
        console.warn(`❌ [Nhóm 3 Fail] Query: "${item.query}", Target: "${item.targetItem}", Got Top 3: [${top3Names.join(", ")}]`);
      }
    }

    const recall = (top3RecallCount / group3Queries.length) * 100;
    console.log(`📊 [Nhóm 3] Kết quả: ${top3RecallCount}/${group3Queries.length} câu tìm thấy trong Top-3 Recall (${recall}%)`);
    assert.ok(recall >= 70, `Nhóm 3 cần đạt tối thiểu 70% recall, thực tế: ${recall}%`);
  });

  test("Nhóm 4: 10 câu gõ tên món hoàn toàn KHÔNG có trong kho -> Mảng RỖNG 100%", async () => {
    let emptyCount = 0;

    for (const query of group4Queries) {
      const res = await searchInternalItems(query);

      if (res.results.length === 0) {
        emptyCount++;
      } else {
        console.warn(`❌ [Nhóm 4 Fail] Query: "${query}" phải trả về RỖNG nhưng lại trả về: [${res.results.map((r) => r.name).join(", ")}]`);
      }
    }

    const emptyRate = (emptyCount / group4Queries.length) * 100;
    console.log(`📊 [Nhóm 4] Kết quả: ${emptyCount}/${group4Queries.length} câu trả về Mảng RỖNG chuẩn xác (${emptyRate}%)\n`);
    assert.strictEqual(emptyCount, group4Queries.length, `Nhóm 4 bắt buộc phải trả về mảng RỖNG 100%, thực tế: ${emptyRate}%`);
  });
});
