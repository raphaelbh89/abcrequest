import { test, describe } from "node:test";
import assert from "node:assert";
import { searchInternalItems, computeTrigramSimilarity, normalizeVietnamese, computeSemanticSimilarity } from "../lib/search";

describe("Unit & Integration Tests: 3-Tier Internal Items Search (lib/search.ts)", () => {
  test("1. Kiểm tra chuẩn hóa tiếng Việt (normalizeVietnamese)", () => {
    assert.strictEqual(normalizeVietnamese("Bút chì 2B Thân Gỗ"), "but chi 2b than go");
    assert.strictEqual(normalizeVietnamese("Ruy-băng Trang Trí & Hoa"), "ruy bang trang tri hoa");
    assert.strictEqual(normalizeVietnamese("  ĐẤT   NẶN   12 MÀU  "), "dat nan 12 mau");
  });

  test("2. Kiểm tra thuật toán Trigram Similarity (tương đương pg_trgm)", () => {
    const sim1 = computeTrigramSimilarity("but chi", "but chi 2b");
    assert.ok(sim1 > 0.4, `Trigram similarity (${sim1}) phải > 0.4`);

    const simTypo = computeTrigramSimilarity("but chii", "but chi");
    assert.ok(simTypo > 0.5, `Trigram similarity khi gõ sai chính tả (${simTypo}) phải > 0.5`);

    const simDifferent = computeTrigramSimilarity("but chi", "keo dan nen");
    assert.ok(simDifferent < 0.15, `Trigram similarity món khác nhau (${simDifferent}) phải < 0.15`);
  });

  test("3. Tầng A — Exact / Prefix match: Tìm 'Bút chì' -> Tìm thấy chính xác, dừng ngay không cần Tầng B/C", async () => {
    const res = await searchInternalItems("Bút chì");

    assert.ok(res.results.length > 0, "Phải tìm thấy ít nhất 1 kết quả");
    const top = res.results[0];
    assert.ok(top.name.includes("Bút chì"), "Top 1 phải chứa 'Bút chì'");
    assert.strictEqual(top.matchType, "exact", "matchType phải là exact");
    assert.ok(top.score >= 0.85, "Score phải >= 0.85");
    assert.ok(res.executionTimeMs < 300, `Thời gian tìm kiếm (${res.executionTimeMs}ms) phải < 300ms`);
  });

  test("4. Tầng B — Fuzzy match: Tìm 'but chii' (sai chính tả) -> Tìm thấy 'Bút chì 2B thân gỗ'", async () => {
    const res = await searchInternalItems("but chii");

    assert.ok(res.results.length > 0, "Phải tìm thấy kết quả sửa lỗi chính tả");
    const match = res.results.find((it) => it.name.includes("Bút chì"));
    assert.ok(match, "Phải tìm thấy Bút chì");
    assert.ok(match.matchType === "fuzzy" || match.matchType === "exact");
    assert.ok(res.executionTimeMs < 300, "Thời gian phản hồi phải dưới 300ms");
  });

  test("5. Tầng C — Semantic match: Tìm từ đồng nghĩa 'viết chì' -> Tìm thấy 'Bút chì 2B thân gỗ'", async () => {
    const res = await searchInternalItems("viết chì");

    assert.ok(res.results.length > 0, "Phải tìm thấy kết quả từ đồng nghĩa");
    const match = res.results.find((it) => it.name.includes("Bút chì"));
    assert.ok(match, "Phải tìm thấy Bút chì khi gõ 'viết chì'");
    assert.strictEqual(match.matchType, "semantic", "matchType phải là semantic");
    assert.ok(match.score >= 0.70, "Score ngữ nghĩa phải >= 0.70");
    assert.strictEqual(res.tiersExecuted.tierC, true, "Tầng C phải được thực thi khi từ khóa là đồng nghĩa");
  });

  test("6. Tầng C — Semantic match: Tìm 'viết bi' -> Tìm thấy 'Bút bi Thiên Long'", async () => {
    const res = await searchInternalItems("viết bi");

    assert.ok(res.results.length > 0, "Phải tìm thấy kết quả từ đồng nghĩa");
    const match = res.results.find((it) => it.name.includes("Bút bi"));
    assert.ok(match, "Phải tìm thấy Bút bi khi gõ 'viết bi'");
    assert.strictEqual(match.matchType, "semantic");
  });

  test("7. Kiểm tra giới hạn số lượng và độ trễ phản hồi < 300ms", async () => {
    const res = await searchInternalItems("a");
    assert.ok(res.results.length <= 8, "Kết quả trả về tối đa 8 mặt hàng");
    assert.ok(res.executionTimeMs < 300, `Độ trễ (${res.executionTimeMs}ms) phải < 300ms`);
  });
});
