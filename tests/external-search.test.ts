import { test, describe } from "node:test";
import assert from "node:assert";
import {
  searchExternalSupplies,
  inferPreschoolUnit,
  extractPriceRangeFromText,
  cleanProductName,
  checkAndIncrementRateLimit,
  ALLOWED_UNITS,
} from "../lib/external-search";
import { prisma } from "../lib/db";

describe("Unit & Integration Tests: External Search Layer (lib/external-search.ts)", () => {
  const testUserId = `test-user-${Date.now()}`;

  test("1. Kiểm tra hàm suy luận đơn vị tính chuẩn mầm non (inferPreschoolUnit)", () => {
    assert.strictEqual(inferPreschoolUnit("Bút sáp màu dầu", "Hộp 16 màu cho bé"), "hộp");
    assert.strictEqual(inferPreschoolUnit("Băng dính 2 mặt xốp", "Cuộn dài 5m siêu dính"), "cuộn");
    assert.strictEqual(inferPreschoolUnit("Giấy in A4 Double A", "Ram 500 tờ định lượng 70gsm"), "ram");
    assert.strictEqual(inferPreschoolUnit("Kéo cắt thủ công", "Kéo mũi tròn an toàn"), "cái");
    assert.strictEqual(inferPreschoolUnit("Bộ cờ vua nam châm", "Bộ đồ chơi giáo dục"), "bộ");
  });

  test("2. Kiểm tra hàm trích xuất khoảng giá thực tế từ kết quả tìm kiếm THẬT (extractPriceRangeFromText)", () => {
    const price1 = extractPriceRangeFromText("Giá khuyến mãi: 25.000đ đến 45.000 VNĐ / hộp");
    assert.deepStrictEqual(price1, [25000, 45000]);

    const priceK = extractPriceRangeFromText("Combo 3 cuộn băng dính giá chỉ 35k - 50k");
    assert.deepStrictEqual(priceK, [35000, 50000]);

    const noPrice = extractPriceRangeFromText("Giới thiệu sản phẩm mới chất lượng cao cho trường mầm non");
    assert.strictEqual(noPrice, null);
  });

  test("3. Kiểm tra chuẩn hoá tên sản phẩm tiếng Việt ngắn gọn (cleanProductName)", () => {
    const cleaned = cleanProductName("Bút màu dạ 12 màu cho bé - Mua sắm Shopee giá sỉ chính hãng freeship");
    assert.ok(!cleaned.toLowerCase().includes("shopee"));
    assert.ok(!cleaned.toLowerCase().includes("freeship"));
    assert.ok(cleaned.length > 5 && cleaned.length <= 70);
  });

  test("4. Kiểm tra Rate Limit: Tối đa 30 lượt gọi/ngày cho mỗi tài khoản", async () => {
    process.env.ENABLE_EXTERNAL_SEARCH_RATE_LIMIT = "true";
    process.env.DAILY_EXTERNAL_SEARCH_QUOTA = "30";

    try {
      // Tạo bản ghi cho testUserId
      const res1 = await checkAndIncrementRateLimit(testUserId);
      assert.strictEqual(res1.allowed, true);
      assert.strictEqual(res1.currentCount, 1);
      assert.strictEqual(res1.remainingQuota, 29);

      // Cập nhật giả lập chạm ngưỡng 30
      const todayKey = new Date().toISOString().split("T")[0];
      await prisma.userApiUsage.update({
        where: {
          userId_endpoint_dateKey: {
            userId: testUserId,
            endpoint: "external_search",
            dateKey: todayKey,
          },
        },
        data: { count: 30 },
      });

      const resBlocked = await checkAndIncrementRateLimit(testUserId);
      assert.strictEqual(resBlocked.allowed, false, "Phải bị chặn khi đạt 30 lượt");
      assert.strictEqual(resBlocked.remainingQuota, 0);
    } finally {
      delete process.env.ENABLE_EXTERNAL_SEARCH_RATE_LIMIT;
      delete process.env.DAILY_EXTERNAL_SEARCH_QUOTA;
    }
  });

  test("5. Kiểm tra luồng gọi tìm kiếm mở rộng, schema validation và lưu Cache 48 giờ", async () => {
    const testQuery = `bút sáp dầu ${Date.now()}`;
    const searchUser = `user-search-${Date.now()}`;

    // Lần 1: Chưa có cache -> Thực thi tìm kiếm và lưu cache
    const firstCall = await searchExternalSupplies(testQuery, searchUser);
    assert.strictEqual(firstCall.success, true);
    assert.strictEqual(firstCall.data?.fromCache, false);
    assert.ok(firstCall.data?.results.length! > 0, "Phải có kết quả");

    // Kiểm tra tính hợp lệ của từng kết quả theo schema bắt buộc
    for (const item of firstCall.data?.results!) {
      assert.ok(item.name && item.name.length > 0, "Tên không được rỗng");
      assert.ok(ALLOWED_UNITS.includes(item.unit as any), `Đơn vị (${item.unit}) phải nằm trong danh sách cho phép`);
      assert.ok(item.sourceUrl && item.sourceUrl.startsWith("http"), "Mọi kết quả bắt buộc phải có sourceUrl hợp lệ");
    }

    // Lần 2: Cùng query -> PHẢI trả về từ Cache, không gọi API ngoài
    const secondCall = await searchExternalSupplies(testQuery, searchUser);
    assert.strictEqual(secondCall.success, true);
    assert.strictEqual(secondCall.data?.fromCache, true, "Lần gọi thứ 2 phải lấy từ Cache");

    // Dọn dẹp cache test
    await prisma.externalSearchCache.deleteMany({
      where: { queryNormalized: { contains: "but sap dau" } },
    });
    await prisma.userApiUsage.deleteMany({
      where: { userId: { in: [testUserId, searchUser] } },
    });
  });
});
