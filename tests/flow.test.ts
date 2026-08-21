import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { PrismaClient } from "@prisma/client";
import { computeAvailableStock, computeItemAllocation } from "../lib/allocation";

const prisma = new PrismaClient();

describe("Integration Test: Luồng Nghiệp vụ (Tạo Yêu Cầu -> Duyệt -> Trừ Kho & Sinh Đề Xuất Mua)", () => {
  let testUserId: string;
  let testAdminId: string;
  let testItemId: string;
  let createdRequestId: string;

  before(async () => {
    // 1. Get or create test users
    const teacher = await prisma.user.upsert({
      where: { username: "test_teacher" },
      update: {},
      create: {
        username: "test_teacher",
        passwordHash: "hash",
        fullName: "Test Teacher",
        role: "teacher",
      },
    });
    testUserId = teacher.id;

    const admin = await prisma.user.upsert({
      where: { username: "test_admin" },
      update: {},
      create: {
        username: "test_admin",
        passwordHash: "hash",
        fullName: "Test Admin",
        role: "admin",
      },
    });
    testAdminId = admin.id;

    // 2. Create test item with physical stock = 10
    const item = await prisma.item.create({
      data: {
        name: "Bìa màu A3 Test Flow",
        category: "hoc_tap",
        unit: "xấp",
        quantity: 10,
        minStock: 5,
        price: 20000,
      },
    });
    testItemId = item.id;
  });

  after(async () => {
    // Cleanup test data
    if (createdRequestId) {
      await prisma.purchaseProposal.deleteMany({ where: { sourceRequestId: createdRequestId } });
      await prisma.stockTransaction.deleteMany({ where: { referenceId: createdRequestId } });
      await prisma.requestItem.deleteMany({ where: { requestId: createdRequestId } });
      await prisma.request.deleteMany({ where: { id: createdRequestId } });
    }
    if (testItemId) {
      await prisma.stockTransaction.deleteMany({ where: { itemId: testItemId } });
      await prisma.item.deleteMany({ where: { id: testItemId } });
    }
    await prisma.user.deleteMany({
      where: { username: { in: ["test_teacher", "test_admin"] } },
    });
    await prisma.$disconnect();
  });

  test("Bước 1: Tạo yêu cầu mới với số lượng xin = 15 (Kho thật = 10)", async () => {
    const requestedQty = 15;
    const initialItem = await prisma.item.findUnique({ where: { id: testItemId } });
    assert.ok(initialItem);
    assert.strictEqual(initialItem.quantity, 10);

    // Calculate allocation
    const pendingSum = await prisma.requestItem.aggregate({
      where: { itemId: testItemId, request: { status: "pending" } },
      _sum: { allocatedQty: true },
    });
    const pendingAllocatedSum = pendingSum._sum.allocatedQty || 0;
    const available = computeAvailableStock(initialItem.quantity, pendingAllocatedSum);
    const allocation = computeItemAllocation(requestedQty, available);

    assert.strictEqual(allocation.allocatedQty, 10);
    assert.strictEqual(allocation.shortfallQty, 5);

    // Create Request
    const request = await prisma.request.create({
      data: {
        requesterId: testUserId,
        purpose: "Hội thi làm thiệp chúc mừng test",
        neededDate: new Date(),
        status: "pending",
        requestItems: {
          create: {
            itemId: testItemId,
            requestedQty: allocation.requestedQty,
            allocatedQty: allocation.allocatedQty,
            shortfallQty: allocation.shortfallQty,
          },
        },
      },
      include: { requestItems: true },
    });

    createdRequestId = request.id;
    assert.strictEqual(request.status, "pending");

    // Physical stock MUST NOT change at this step
    const itemAfterCreate = await prisma.item.findUnique({ where: { id: testItemId } });
    assert.strictEqual(itemAfterCreate?.quantity, 10);
  });

  test("Bước 2: Admin Duyệt yêu cầu -> Trừ kho thật, ghi stock_transactions, sinh purchase_proposals", async () => {
    const targetRequest = await prisma.request.findUnique({
      where: { id: createdRequestId },
      include: { requestItems: true },
    });
    assert.ok(targetRequest);
    assert.strictEqual(targetRequest.status, "pending");

    // Simulate Approval Transaction
    await prisma.$transaction(async (tx) => {
      for (const line of targetRequest.requestItems) {
        if (line.allocatedQty > 0 && line.itemId) {
          await tx.item.update({
            where: { id: line.itemId },
            data: { quantity: { decrement: line.allocatedQty } },
          });

          await tx.stockTransaction.create({
            data: {
              itemId: line.itemId,
              type: "xuat_kho_duyet_yc",
              quantityChange: -line.allocatedQty,
              referenceId: targetRequest.id,
              performedBy: testAdminId,
              note: `Xuất kho duyệt yêu cầu test: ${targetRequest.purpose}`,
            },
          });
        }

        if (line.shortfallQty > 0) {
          await tx.purchaseProposal.create({
            data: {
              itemId: line.itemId,
              qty: line.shortfallQty,
              sourceRequestId: targetRequest.id,
              status: "can_mua",
              receivedQty: 0,
            },
          });
        }
      }

      await tx.request.update({
        where: { id: targetRequest.id },
        data: { status: "approved", decidedAt: new Date(), decidedBy: testAdminId },
      });
    });

    // Verify 1: Item physical stock decremented by 10 (from 10 -> 0)
    const itemAfterApprove = await prisma.item.findUnique({ where: { id: testItemId } });
    assert.strictEqual(itemAfterApprove?.quantity, 0);

    // Verify 2: Audit trail transaction logged
    const stockTx = await prisma.stockTransaction.findFirst({
      where: { referenceId: createdRequestId },
    });
    assert.ok(stockTx);
    assert.strictEqual(stockTx.type, "xuat_kho_duyet_yc");
    assert.strictEqual(stockTx.quantityChange, -10);

    // Verify 3: Purchase Proposal generated for shortfall = 5
    const proposal = await prisma.purchaseProposal.findFirst({
      where: { sourceRequestId: createdRequestId },
    });
    assert.ok(proposal);
    assert.strictEqual(proposal.qty, 5);
    assert.strictEqual(proposal.status, "can_mua");
    assert.strictEqual(proposal.itemId, testItemId);
  });
});
