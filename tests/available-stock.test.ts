import { test, describe } from "node:test";
import assert from "node:assert";
import { prisma } from "../lib/db";
import { computeAvailableStock, computeItemAllocation } from "../lib/allocation";

describe("Integration Test: Real-time Available Stock & Pending Hold Calculation", () => {
  test("1. Kiểm tra logic trừ số lượng tạm giữ (hold) khi có yêu cầu pending", async () => {
    // 1. Tạo mặt hàng test
    const testItem = await prisma.item.create({
      data: {
        name: `Bút màu dạ Test Hold ${Date.now()}`,
        category: "hoc_tap",
        unit: "hộp",
        quantity: 15, // Tồn kho vật lý = 15
        minStock: 5,
      },
    });

    const teacher = await prisma.user.findFirst({
      where: { role: "teacher" },
    });

    assert.ok(teacher, "Cần có user teacher trong DB");

    // 2. Giáo viên gửi yêu cầu xin 10 hộp
    const pendingAlloc = computeItemAllocation(10, testItem.quantity);
    assert.strictEqual(pendingAlloc.allocatedQty, 10, "Được cấp 10 từ kho");
    assert.strictEqual(pendingAlloc.shortfallQty, 0, "Không bị thiếu");

    const req1 = await prisma.request.create({
      data: {
        purpose: "Vẽ tranh chủ đề mùa thu",
        neededDate: new Date(),
        requesterId: teacher.id,
        status: "pending",
        requestItems: {
          create: [
            {
              itemId: testItem.id,
              requestedQty: 10,
              allocatedQty: pendingAlloc.allocatedQty,
              shortfallQty: pendingAlloc.shortfallQty,
              status: "approved",
            },
          ],
        },
      },
    });

    // 3. Tính toán tồn kho khả dụng còn lại của mặt hàng
    const pendingSum = await prisma.requestItem.aggregate({
      where: {
        itemId: testItem.id,
        request: { status: "pending" },
        status: "approved",
      },
      _sum: { allocatedQty: true },
    });

    const pendingHold = pendingSum._sum.allocatedQty || 0;
    const availableQty = computeAvailableStock(testItem.quantity, pendingHold);

    assert.strictEqual(pendingHold, 10, "Số lượng đang tạm giữ phải bằng 10");
    assert.strictEqual(availableQty, 5, "Tồn khả dụng phải còn 15 - 10 = 5 hộp");

    // 4. Giáo viên khác xin thêm 10 hộp nữa trong khi req1 vẫn pending
    const secondAlloc = computeItemAllocation(10, availableQty);
    assert.strictEqual(secondAlloc.allocatedQty, 5, "Chỉ được giữ chỗ 5 hộp còn lại trong kho");
    assert.strictEqual(secondAlloc.shortfallQty, 5, "Bị thiếu 5 hộp cần mua mới");

    // Dọn dẹp
    await prisma.requestItem.deleteMany({ where: { requestId: req1.id } });
    await prisma.request.delete({ where: { id: req1.id } });
    await prisma.item.delete({ where: { id: testItem.id } });
  });
});
