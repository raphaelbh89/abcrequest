import { test, describe } from "node:test";
import assert from "node:assert";
import { computeAvailableStock, computeItemAllocation } from "../lib/allocation";

describe("Unit Tests: Thuật toán Phân bổ Kho (lib/allocation.ts)", () => {
  test("Trường hợp 1: Tồn kho ĐỦ cho yêu cầu (physicalStock = 10, requested = 5)", () => {
    const physicalStock = 10;
    const pendingSum = 0;
    const requestedQty = 5;

    const available = computeAvailableStock(physicalStock, pendingSum);
    assert.strictEqual(available, 10);

    const result = computeItemAllocation(requestedQty, available);
    assert.strictEqual(result.allocatedQty, 5);
    assert.strictEqual(result.shortfallQty, 0);
  });

  test("Trường hợp 2: Tồn kho THIẾU MỘT PHẦN (physicalStock = 3, requested = 10)", () => {
    const physicalStock = 3;
    const pendingSum = 0;
    const requestedQty = 10;

    const available = computeAvailableStock(physicalStock, pendingSum);
    assert.strictEqual(available, 3);

    const result = computeItemAllocation(requestedQty, available);
    assert.strictEqual(result.allocatedQty, 3);
    assert.strictEqual(result.shortfallQty, 7);
  });

  test("Trường hợp 3: Tồn kho = 0 (physicalStock = 0, requested = 5)", () => {
    const physicalStock = 0;
    const pendingSum = 0;
    const requestedQty = 5;

    const available = computeAvailableStock(physicalStock, pendingSum);
    assert.strictEqual(available, 0);

    const result = computeItemAllocation(requestedQty, available);
    assert.strictEqual(result.allocatedQty, 0);
    assert.strictEqual(result.shortfallQty, 5);
  });

  test("Trường hợp 4: Hai yêu cầu pending cùng xin 1 món vượt quá tồn kho thật (Cross Pending)", () => {
    const physicalStock = 10;

    // Yêu cầu 1: Xin 7 cái khi chưa có giữ chỗ
    const availableReq1 = computeAvailableStock(physicalStock, 0);
    const resultReq1 = computeItemAllocation(7, availableReq1);
    assert.strictEqual(resultReq1.allocatedQty, 7);
    assert.strictEqual(resultReq1.shortfallQty, 0);

    // Yêu cầu 2: Xin 5 cái khi Yêu cầu 1 đang ở trạng thái pending (đã giữ chỗ 7)
    const pendingSumReq2 = resultReq1.allocatedQty; // 7
    const availableReq2 = computeAvailableStock(physicalStock, pendingSumReq2);
    assert.strictEqual(availableReq2, 3); // Còn khả dụng 10 - 7 = 3

    const resultReq2 = computeItemAllocation(5, availableReq2);
    assert.strictEqual(resultReq2.allocatedQty, 3);
    assert.strictEqual(resultReq2.shortfallQty, 2);

    // Đảm bảo tổng số lượng allocated không bao giờ vượt quá tồn kho thật (7 + 3 = 10)
    const totalAllocated = resultReq1.allocatedQty + resultReq2.allocatedQty;
    assert.strictEqual(totalAllocated, 10);
    assert.ok(totalAllocated <= physicalStock);
  });
});
