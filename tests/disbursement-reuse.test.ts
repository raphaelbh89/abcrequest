import { test, describe } from "node:test";
import assert from "node:assert";
import { prisma } from "../lib/db";

describe("Integration Tests: Disbursement & Reuse Modules (Module Cấp Phát & Tái Sử Dụng)", () => {
  let teacher: any;
  let manager: any;
  let admin: any;
  let testItem: any;
  let testRequest: any;
  let createdDisbursement: any;
  let createdReuseReturn: any;

  test("1. Chuẩn bị tài khoản và mặt hàng đồ dùng", async () => {
    teacher = await prisma.user.findUnique({ where: { username: "giaovien" } });
    manager = await prisma.user.findUnique({ where: { username: "quanly" } });
    admin = await prisma.user.findUnique({ where: { username: "admin" } });

    assert.ok(teacher && manager && admin, "Phải có đầy đủ tài khoản test");

    // Tạo món đồ dùng kiểm thử với tồn ban đầu = 20 cái, giá 15.000 đ
    testItem = await prisma.item.create({
      data: {
        name: `Bút sáp màu Test Cấp Phát ${Date.now()}`,
        nameNormalized: "but sap mau test cap phat",
        category: "hoc_tap",
        unit: "hộp",
        quantity: 20,
        minStock: 5,
        price: 15000,
      },
    });

    assert.ok(testItem.id);
    assert.strictEqual(testItem.quantity, 20);
  });

  test("2. Giáo viên tạo yêu cầu & Quản lý duyệt yêu cầu", async () => {
    testRequest = await prisma.request.create({
      data: {
        requesterId: teacher.id,
        purpose: "Lớp Chồi 1 vẽ tranh mùa xuân",
        neededDate: new Date(),
        status: "approved", // Giả lập đã được Quản lý duyệt
        decidedBy: manager.id,
        decidedAt: new Date(),
        disbursementStatus: "cho_cap_phat",
        requestItems: {
          create: [
            {
              itemId: testItem.id,
              requestedQty: 10,
              allocatedQty: 10,
              shortfallQty: 0,
              status: "approved",
            },
          ],
        },
      },
      include: {
        requestItems: true,
      },
    });

    assert.ok(testRequest.id);
    assert.strictEqual(testRequest.status, "approved");
    assert.strictEqual(testRequest.disbursementStatus, "cho_cap_phat");
    assert.strictEqual(testRequest.requestItems.length, 1);
  });

  test("3. Thủ kho / Quản lý thực hiện Cấp phát đồ dùng cho Giáo viên", async () => {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const code = `CP-${todayStr}-999`;

    // 1. Tạo phiếu cấp phát
    createdDisbursement = await prisma.disbursement.create({
      data: {
        code,
        requestId: testRequest.id,
        recipientId: teacher.id,
        disbursedBy: manager.id,
        status: "completed",
        note: "Bàn giao 10 hộp sáp màu cho cô giáo",
        items: {
          create: [
            {
              itemId: testItem.id,
              itemName: testItem.name,
              itemUnit: testItem.unit,
              disbursedQty: 10,
              isReusable: true,
            },
          ],
        },
      },
      include: {
        items: true,
      },
    });

    assert.ok(createdDisbursement.id);
    assert.strictEqual(createdDisbursement.code, code);
    assert.strictEqual(createdDisbursement.items.length, 1);
    assert.strictEqual(createdDisbursement.items[0].disbursedQty, 10);

    // 2. Trừ tồn kho & ghi lịch sử xuất kho cấp phát
    const updatedItem = await prisma.item.update({
      where: { id: testItem.id },
      data: {
        quantity: { decrement: 10 },
      },
    });

    assert.strictEqual(updatedItem.quantity, 10, "Tồn kho sau khi cấp phát phải giảm từ 20 xuống 10");

    const stockTx = await prisma.stockTransaction.create({
      data: {
        itemId: testItem.id,
        type: "xuat_kho_cap_phat",
        quantityChange: -10,
        referenceId: createdDisbursement.id,
        performedBy: manager.id,
        note: `Cấp phát (${code}) cho cô giáo`,
      },
    });

    assert.ok(stockTx.id);
    assert.strictEqual(stockTx.type, "xuat_kho_cap_phat");
    assert.strictEqual(stockTx.quantityChange, -10);

    // 3. Cập nhật Request disbursementStatus
    const updatedRequest = await prisma.request.update({
      where: { id: testRequest.id },
      data: {
        disbursementStatus: "da_cap_phat",
      },
    });

    assert.strictEqual(updatedRequest.disbursementStatus, "da_cap_phat");
  });

  test("4. Giáo viên hoàn trả & Thủ kho Nhập kho đồ dùng Tái sử dụng", async () => {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const reuseCode = `TSD-${todayStr}-999`;
    const returnedQty = 4; // Trả lại 4 hộp còn tốt
    const estimatedSavings = (testItem.price || 0) * returnedQty;

    // 1. Tạo bản ghi tái sử dụng
    createdReuseReturn = await prisma.reuseReturn.create({
      data: {
        code: reuseCode,
        disbursementId: createdDisbursement.id,
        itemId: testItem.id,
        returnedQty,
        condition: "tot",
        returnerId: teacher.id,
        returnerName: "Cô Lan (Lớp Chồi 1)",
        receivedBy: manager.id,
        estimatedSavings,
        note: "Đồ dùng còn mới 95% sau giờ vẽ",
      },
    });

    assert.ok(createdReuseReturn.id);
    assert.strictEqual(createdReuseReturn.returnedQty, 4);
    assert.strictEqual(createdReuseReturn.condition, "tot");
    assert.strictEqual(createdReuseReturn.estimatedSavings, 60000); // 4 * 15000 = 60000

    // 2. Tăng tồn kho thực tế
    const itemAfterReuse = await prisma.item.update({
      where: { id: testItem.id },
      data: {
        quantity: { increment: returnedQty },
      },
    });

    assert.strictEqual(itemAfterReuse.quantity, 14, "Tồn kho sau tái sử dụng phải tăng từ 10 lên 14");

    // 3. Ghi lịch sử giao dịch kho
    const tx = await prisma.stockTransaction.create({
      data: {
        itemId: testItem.id,
        type: "nhap_tai_su_dung",
        quantityChange: returnedQty,
        referenceId: createdReuseReturn.id,
        performedBy: manager.id,
        note: `Nhập tái sử dụng (${reuseCode}) +${returnedQty}`,
      },
    });

    assert.strictEqual(tx.type, "nhap_tai_su_dung");
    assert.strictEqual(tx.quantityChange, 4);

    // 4. Cập nhật returnedQty trên DisbursementItem
    const disbItem = createdDisbursement.items[0];
    const updatedDisbItem = await prisma.disbursementItem.update({
      where: { id: disbItem.id },
      data: {
        returnedQty: { increment: returnedQty },
      },
    });

    assert.strictEqual(updatedDisbItem.returnedQty, 4);
  });

  test("5. Dọn dẹp dữ liệu test an toàn", async () => {
    if (createdReuseReturn) {
      await prisma.reuseReturn.delete({ where: { id: createdReuseReturn.id } });
    }
    if (createdDisbursement) {
      await prisma.disbursementItem.deleteMany({ where: { disbursementId: createdDisbursement.id } });
      await prisma.disbursement.delete({ where: { id: createdDisbursement.id } });
    }
    if (testRequest) {
      await prisma.requestItem.deleteMany({ where: { requestId: testRequest.id } });
      await prisma.request.delete({ where: { id: testRequest.id } });
    }
    if (testItem) {
      await prisma.stockTransaction.deleteMany({ where: { itemId: testItem.id } });
      await prisma.item.delete({ where: { id: testItem.id } });
    }
  });
});
