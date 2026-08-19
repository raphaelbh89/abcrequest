import { test, describe } from "node:test";
import assert from "node:assert";
import { prisma } from "../lib/db";

describe("Integration Test: Stock-in with Optional Price Update", () => {
  test("1. Nhập kho không truyền giá -> Tồn kho tăng, giữ nguyên giá cũ", async () => {
    // 1. Create a test item with price = 25000, quantity = 10
    const item = await prisma.item.create({
      data: {
        name: "Test Bút chì Định Giá",
        category: "hoc_tap",
        unit: "hộp",
        quantity: 10,
        minStock: 5,
        price: 25000,
      },
    });

    // 2. Perform stock-in without price
    const addQty = 5;
    let newPrice = item.price;
    const priceInput = undefined; // Not provided

    if (priceInput !== undefined && priceInput !== null && !isNaN(Number(priceInput)) && Number(priceInput) >= 0) {
      newPrice = Number(priceInput);
    }

    const updated = await prisma.item.update({
      where: { id: item.id },
      data: {
        quantity: { increment: addQty },
        price: newPrice,
      },
    });

    assert.strictEqual(updated.quantity, 15, "Số lượng phải tăng lên 15");
    assert.strictEqual(updated.price, 25000, "Giá phải được giữ nguyên là 25000");

    // Clean up
    await prisma.item.delete({ where: { id: item.id } });
  });

  test("2. Nhập kho có truyền giá mới -> Tồn kho tăng, cập nhật giá mới", async () => {
    // 1. Create a test item with price = 20000, quantity = 5
    const item = await prisma.item.create({
      data: {
        name: "Test Keo Dán Đổi Giá",
        category: "hoc_tap",
        unit: "thỏi",
        quantity: 5,
        minStock: 5,
        price: 20000,
      },
    });

    // 2. Perform stock-in with new price = 32000
    const addQty = 10;
    const priceInput = 32000;
    let newPrice = item.price;

    if (priceInput !== undefined && priceInput !== null && !isNaN(Number(priceInput)) && Number(priceInput) >= 0) {
      newPrice = Number(priceInput);
    }

    const updated = await prisma.item.update({
      where: { id: item.id },
      data: {
        quantity: { increment: addQty },
        price: newPrice,
      },
    });

    assert.strictEqual(updated.quantity, 15, "Số lượng phải tăng lên 15");
    assert.strictEqual(updated.price, 32000, "Giá phải được cập nhật lên 32000");

    // Clean up
    await prisma.item.delete({ where: { id: item.id } });
  });
});
