import { test, describe } from "node:test";
import assert from "node:assert";
import { prisma } from "../lib/db";

describe("Integration Test: External Item Proposals & Admin Approval Workflow (Prompt 3)", () => {
  let teacherUser: any;
  let adminUser: any;

  test("1. Chuẩn bị tài khoản Giáo viên & Admin", async () => {
    teacherUser = await prisma.user.findFirst({
      where: { role: "teacher" },
    });
    if (!teacherUser) {
      teacherUser = await prisma.user.create({
        data: {
          username: `teacher_test_${Date.now()}`,
          passwordHash: "hash123",
          fullName: "Giáo Viên Test",
          role: "teacher",
        },
      });
    }

    adminUser = await prisma.user.findFirst({
      where: { role: "admin" },
    });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          username: `admin_test_${Date.now()}`,
          passwordHash: "hash123",
          fullName: "Admin Test",
          role: "admin",
        },
      });
    }

    assert.ok(teacherUser && adminUser);
  });

  test("2. Giáo viên tạo yêu cầu có 1 món trong kho và 1 món Đề xuất mới từ tìm kiếm mở rộng (isNewItemProposal)", async () => {
    // 1 món nội bộ có sẵn
    const existingItem = await prisma.item.findFirst();
    assert.ok(existingItem, "Phải có ít nhất 1 món nội bộ trong DB");

    // Tạo phiếu yêu cầu gồm:
    // - Item 1: Món có sẵn trong kho (5 cái)
    // - Item 2: Món đề xuất mới chưa có trong kho (10 cái)
    const newRequest = await prisma.$transaction(async (tx) => {
      const req = await tx.request.create({
        data: {
          requesterId: teacherUser.id,
          purpose: "Trang trí ngày hội sáng tạo khoa học cho bé",
          neededDate: new Date(Date.now() + 3 * 24 * 3600 * 1000),
          note: "Đồ dùng đặc biệt chưa có trong danh mục kho",
          status: "pending",
        },
      });

      // Dòng 1: Món nội bộ
      await tx.requestItem.create({
        data: {
          requestId: req.id,
          itemId: existingItem.id,
          requestedQty: 5,
          allocatedQty: Math.min(5, existingItem.quantity),
          shortfallQty: Math.max(0, 5 - existingItem.quantity),
          isNewItemProposal: false,
        },
      });

      // Dòng 2: Món đề xuất mới
      await tx.requestItem.create({
        data: {
          requestId: req.id,
          itemId: null,
          requestedQty: 10,
          allocatedQty: 0, // Chưa có trong kho
          shortfallQty: 10, // 100% cần mua
          isNewItemProposal: true,
          proposedName: "Bộ kính hiển vi mini mầm non",
          proposedUnit: "bộ",
          proposedPrice: 85000,
          proposedSourceUrl: "https://vppmamnon.vn/san-pham/kinh-hien-vi-mini",
        },
      });

      return await tx.request.findUnique({
        where: { id: req.id },
        include: { requestItems: true },
      });
    });

    assert.ok(newRequest);
    assert.strictEqual(newRequest.requestItems.length, 2);

    const proposedLine = newRequest.requestItems.find((ri) => ri.isNewItemProposal);
    assert.ok(proposedLine, "Phải có dòng món đề xuất mới");
    assert.strictEqual(proposedLine.itemId, null);
    assert.strictEqual(proposedLine.allocatedQty, 0);
    assert.strictEqual(proposedLine.shortfallQty, 10);
    assert.strictEqual(proposedLine.proposedName, "Bộ kính hiển vi mini mầm non");
    assert.strictEqual(proposedLine.proposedUnit, "bộ");

    // 3. Admin duyệt yêu cầu: Hệ thống phải tự sinh đề xuất mua cho món mới mà không bị lỗi DB
    const approved = await prisma.$transaction(async (tx) => {
      for (const line of newRequest.requestItems) {
        await tx.requestItem.update({
          where: { id: line.id },
          data: { status: "approved" },
        });

        if (line.shortfallQty > 0) {
          await tx.purchaseProposal.create({
            data: {
              itemId: line.itemId || null,
              proposedName: line.proposedName || null,
              proposedUnit: line.proposedUnit || null,
              qty: line.shortfallQty,
              sourceRequestId: newRequest.id,
              status: "can_mua",
              receivedQty: 0,
            },
          });
        }
      }

      return await tx.request.update({
        where: { id: newRequest.id },
        data: {
          status: "approved",
          decidedAt: new Date(),
          decidedBy: adminUser.id,
        },
        include: { purchaseProposals: true },
      });
    });

    assert.strictEqual(approved.status, "approved");
    assert.ok(approved.purchaseProposals.length >= 1);

    const proposalForNewItem = approved.purchaseProposals.find(
      (pp) => pp.proposedName === "Bộ kính hiển vi mini mầm non"
    );
    assert.ok(proposalForNewItem, "Phải sinh bản ghi đề xuất mua cho món mới");
    assert.strictEqual(proposalForNewItem.qty, 10);
    assert.strictEqual(proposalForNewItem.proposedUnit, "bộ");
    assert.strictEqual(proposalForNewItem.status, "can_mua");

    // Dọn dẹp dữ liệu test
    await prisma.purchaseProposal.deleteMany({ where: { sourceRequestId: newRequest.id } });
    await prisma.requestItem.deleteMany({ where: { requestId: newRequest.id } });
    await prisma.request.delete({ where: { id: newRequest.id } });
  });
});
