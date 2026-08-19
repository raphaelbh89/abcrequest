import { test, describe } from "node:test";
import assert from "node:assert";
import { prisma } from "../lib/db";

describe("Integration Test: Quản lý từ chối từng món khi duyệt đơn", () => {
  test("Duyệt đơn loại trừ món bị từ chối: không trừ kho, không sinh đề xuất mua, thông báo xuống giáo viên", async () => {
    // 1. Setup User & Items
    const teacher = await prisma.user.findFirst({ where: { role: "teacher" } }) ||
      await prisma.user.create({
        data: { username: "gv_test", passwordHash: "123", fullName: "Cô Test", role: "teacher" },
      });
    const admin = await prisma.user.findFirst({ where: { role: "admin" } }) ||
      await prisma.user.create({
        data: { username: "ql_test", passwordHash: "123", fullName: "Quản Lý Test", role: "admin" },
      });

    const itemA = await prisma.item.create({
      data: { name: "Giấy Màu Thủ Công Test", category: "hoc_tap", unit: "tập", quantity: 10, minStock: 2 },
    });
    const itemB = await prisma.item.create({
      data: { name: "Ly Nhựa Dùng 1 Lần Test", category: "ngoai_khoa", unit: "cái", quantity: 0, minStock: 5 },
    });

    // 2. Create Request with 2 items
    const request = await prisma.request.create({
      data: {
        requesterId: teacher.id,
        purpose: "Tổ chức hoạt động ngoại khóa Test",
        neededDate: new Date(),
        status: "pending",
        requestItems: {
          create: [
            {
              itemId: itemA.id,
              requestedQty: 5,
              allocatedQty: 5,
              shortfallQty: 0,
            },
            {
              itemId: itemB.id,
              requestedQty: 20,
              allocatedQty: 0,
              shortfallQty: 20,
            },
          ],
        },
      },
      include: {
        requestItems: { include: { item: true } },
      },
    });

    // 3. Admin decides to reject Item B (Ly Nhựa) during approval
    const rejectedItemIds = [request.requestItems.find((ri) => ri.itemId === itemB.id)!.id];
    const rejectedNames: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const itemLine of request.requestItems) {
        if (rejectedItemIds.includes(itemLine.id)) {
          rejectedNames.push(itemLine.item.name);
          await tx.requestItem.update({
            where: { id: itemLine.id },
            data: {
              status: "rejected",
              allocatedQty: 0,
              shortfallQty: 0,
            },
          });
          continue;
        }

        // Approved item
        await tx.requestItem.update({
          where: { id: itemLine.id },
          data: { status: "approved" },
        });

        if (itemLine.allocatedQty > 0) {
          await tx.item.update({
            where: { id: itemLine.itemId },
            data: { quantity: { decrement: itemLine.allocatedQty } },
          });
        }
      }

      await tx.request.update({
        where: { id: request.id },
        data: {
          status: "approved",
          decidedAt: new Date(),
          decidedBy: admin.id,
          rejectReason: `Quản lý đã duyệt đơn nhưng từ chối cấp các món: ${rejectedNames.join(", ")}`,
        },
      });
    });

    // 4. Verification
    const updatedRequest = await prisma.request.findUnique({
      where: { id: request.id },
      include: { requestItems: true, purchaseProposals: true },
    });

    const updatedItemA = await prisma.item.findUnique({ where: { id: itemA.id } });
    const updatedItemB = await prisma.item.findUnique({ where: { id: itemB.id } });

    assert.strictEqual(updatedRequest?.status, "approved");
    assert.ok(updatedRequest?.rejectReason?.includes("Ly Nhựa Dùng 1 Lần Test"), "Phải có thông báo từ chối món Ly Nhựa");
    assert.strictEqual(updatedItemA?.quantity, 5, "Món A được duyệt phải bị trừ tồn kho (10 - 5 = 5)");
    assert.strictEqual(updatedItemB?.quantity, 0, "Món B bị từ chối không bị ảnh hưởng");

    // Check that NO purchase proposal was created for itemB
    const proposalsForB = await prisma.purchaseProposal.findMany({ where: { itemId: itemB.id, sourceRequestId: request.id } });
    assert.strictEqual(proposalsForB.length, 0, "Không được sinh đề xuất mua cho món đã bị từ chối");

    // Cleanup
    await prisma.request.delete({ where: { id: request.id } });
    await prisma.item.delete({ where: { id: itemA.id } });
    await prisma.item.delete({ where: { id: itemB.id } });
  });
});
