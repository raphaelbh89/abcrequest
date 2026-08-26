import { test, describe } from "node:test";
import assert from "node:assert";
import { prisma } from "../lib/db";
import { mergeDuplicateItems } from "../lib/deduplicate-items";
import { normalizeVietnamese } from "../lib/search";

describe("Unit & Integration Test: Auto-Deduplication & Merge Duplicate Items in Warehouse", () => {
  test("1. Tạo 2 mặt hàng trùng tên (10 cái giá 25k và 1 cái giá null) -> Tự động hợp nhất thành 1 mặt hàng (11 cái giá 25k)", async () => {
    const itemName = `Bao tay test trùng lặp ${Date.now()}`;
    const norm = normalizeVietnamese(itemName);

    // Tạo Item 1
    const item1 = await prisma.item.create({
      data: {
        name: itemName,
        nameNormalized: norm,
        category: "hoc_tap",
        unit: "cái",
        quantity: 10,
        minStock: 5,
        price: 25000,
      },
    });

    // Tạo Item 2 (Trùng tên, do luồng khác tạo)
    const item2 = await prisma.item.create({
      data: {
        name: itemName,
        nameNormalized: norm,
        category: "hoc_tap",
        unit: "cái",
        quantity: 1,
        minStock: 5,
        price: null,
      },
    });

    // Chạy hàm merge tự động
    const result = await mergeDuplicateItems();
    assert.ok(result.mergedGroupsCount >= 1);
    assert.ok(result.deletedDuplicatesCount >= 1);

    // Kiểm tra trong DB: Chỉ còn đúng 1 mặt hàng
    const remainingItems = await prisma.item.findMany({
      where: { name: itemName },
    });

    assert.strictEqual(remainingItems.length, 1);
    assert.strictEqual(remainingItems[0].id, item1.id);
    assert.strictEqual(remainingItems[0].quantity, 11); // 10 + 1
    assert.strictEqual(remainingItems[0].price, 25000); // Giữ lại giá 25k

    // Dọn dẹp dữ liệu test
    await prisma.item.delete({ where: { id: item1.id } });
  });
});
