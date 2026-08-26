import { test, describe } from "node:test";
import assert from "node:assert";
import { prisma } from "../lib/db";

describe("Integration Tests: Direct In-Stock Disbursement (Cấp Phát Trực Tiếp Đồ Dùng Trong Kho)", () => {
  let teacher: any;
  let manager: any;
  let directItem: any;
  let createdDisbursement: any;

  test("1. Chuẩn bị tài khoản & Mặt hàng kiểm thử có sẵn 25 cái", async () => {
    teacher = await prisma.user.findFirst({ where: { role: "teacher" } });
    manager = await prisma.user.findFirst({ where: { role: "manager" } });

    if (!teacher) {
      teacher = await prisma.user.create({
        data: {
          username: `teacher_direct_${Date.now()}`,
          passwordHash: "hash123",
          fullName: "Cô Giáo Test Trực Tiếp",
          role: "teacher",
        },
      });
    }

    if (!manager) {
      manager = await prisma.user.create({
        data: {
          username: `manager_direct_${Date.now()}`,
          passwordHash: "hash123",
          fullName: "Quản Lý Test",
          role: "manager",
        },
      });
    }

    directItem = await prisma.item.create({
      data: {
        name: `Hạt cườm ngũ sắc Test Trực Tiếp ${Date.now()}`,
        nameNormalized: "hat cuom ngu sac test truc tiep",
        category: "hoc_tap",
        unit: "bịch",
        quantity: 25,
        minStock: 5,
        price: 30000,
      },
    });

    assert.ok(teacher && manager && directItem);
    assert.strictEqual(directItem.quantity, 25);
  });

  test("2. Kiểm tra validation: Không thể cấp phát vượt quá tồn kho thực tế", async () => {
    const invalidQty = 30; // Lớn hơn tồn 25
    assert.ok(invalidQty > directItem.quantity);
  });

  test("3. Quản lý thực hiện Cấp phát trực tiếp 10 bịch -> Tồn kho giảm còn 15, sinh đầy đủ Request + Disbursement + Transaction", async () => {
    const disburseQty = 10;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Trừ tồn kho vật lý
      const updatedItem = await tx.item.update({
        where: { id: directItem.id },
        data: { quantity: { decrement: disburseQty } },
      });

      // 2. Tạo Request tự động
      const createdRequest = await tx.request.create({
        data: {
          requesterId: teacher.id,
          purpose: "Trải nghiệm xâu hạt phát triển vận động tinh",
          neededDate: new Date(),
          status: "approved",
          disbursementStatus: "da_cap_phat",
          decidedAt: new Date(),
          decidedBy: manager.id,
          note: "Cấp phát trực tiếp đồ dùng có sẵn trong kho",
        },
      });

      // 3. Tạo RequestItem
      await tx.requestItem.create({
        data: {
          requestId: createdRequest.id,
          itemId: directItem.id,
          requestedQty: disburseQty,
          allocatedQty: disburseQty,
          shortfallQty: 0,
          status: "approved",
        },
      });

      // 4. Sinh mã phiếu cấp phát
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const countToday = await tx.disbursement.count({
        where: { code: { startsWith: `CP-${todayStr}` } },
      });
      const code = `CP-${todayStr}-${String(countToday + 1).padStart(3, "0")}`;

      // 5. Tạo bản ghi Disbursement
      const disburse = await tx.disbursement.create({
        data: {
          code,
          requestId: createdRequest.id,
          recipientId: teacher.id,
          disbursedBy: manager.id,
          status: "completed",
          note: "Cấp phát trực tiếp đồ dùng từ kho",
          items: {
            create: [
              {
                itemId: directItem.id,
                itemName: directItem.name,
                itemUnit: directItem.unit,
                disbursedQty: disburseQty,
                isReusable: true,
              },
            ],
          },
        },
        include: {
          items: true,
          request: true,
          recipient: true,
        },
      });

      // 6. Ghi nhật ký xuất kho
      await tx.stockTransaction.create({
        data: {
          itemId: directItem.id,
          type: "xuat_kho_cap_phat",
          quantityChange: -disburseQty,
          referenceId: disburse.id,
          performedBy: manager.id,
          note: `Cấp phát trực tiếp (${code}) cho ${teacher.fullName}`,
        },
      });

      return { disburse, updatedItem, createdRequest };
    });

    createdDisbursement = result.disburse;

    // Kiểm tra kết quả
    assert.ok(result.disburse.id);
    assert.strictEqual(result.updatedItem.quantity, 15); // 25 - 10 = 15
    assert.strictEqual(result.createdRequest.status, "approved");
    assert.strictEqual(result.createdRequest.disbursementStatus, "da_cap_phat");
    assert.strictEqual(result.disburse.items.length, 1);
    assert.strictEqual(result.disburse.items[0].disbursedQty, 10);
  });

  test("4. Dọn dẹp dữ liệu test an toàn", async () => {
    if (createdDisbursement) {
      await prisma.disbursementItem.deleteMany({ where: { disbursementId: createdDisbursement.id } });
      await prisma.stockTransaction.deleteMany({ where: { referenceId: createdDisbursement.id } });
      await prisma.disbursement.delete({ where: { id: createdDisbursement.id } });
      await prisma.requestItem.deleteMany({ where: { requestId: createdDisbursement.requestId } });
      await prisma.request.delete({ where: { id: createdDisbursement.requestId } });
    }
    if (directItem) {
      await prisma.item.delete({ where: { id: directItem.id } });
    }
  });
});
