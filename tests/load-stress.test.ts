import { test, describe } from "node:test";
import assert from "node:assert";
import { prisma } from "../lib/db";

describe("Database Load & Stress Testing (Kiểm thử tải & Lưu lượng dữ liệu)", () => {
  let createdItemIds: string[] = [];
  let createdRequestIds: string[] = [];
  let teacherId: string;
  let adminId: string;

  test("1. Chuẩn bị dữ liệu tài khoản và kiểm tra kết nối CSDL", async () => {
    const admin = await prisma.user.findFirst({ where: { role: "admin" } });
    const teacher = await prisma.user.findFirst({ where: { role: "teacher" } });

    assert.ok(admin, "Tài khoản admin phải tồn tại");
    assert.ok(teacher, "Tài khoản teacher phải tồn tại");

    adminId = admin.id;
    teacherId = teacher.id;
  });

  test("2. Bulk Data Ingestion: Nạp hàng loạt 500 mặt hàng và đo lường thời gian ghi", async () => {
    const startTime = Date.now();
    const itemsData = [];

    for (let i = 1; i <= 500; i++) {
      itemsData.push({
        name: `Đồ dùng tải cao #${i} - ${Date.now()}`,
        category: i % 2 === 0 ? "hoc_tap" : "ngoai_khoa",
        unit: i % 3 === 0 ? "hộp" : i % 3 === 1 ? "cái" : "cuộn",
        quantity: Math.floor(Math.random() * 50) + 5,
        minStock: 10,
        price: (Math.floor(Math.random() * 50) + 10) * 1000,
        location: `Kệ Tải ${Math.floor(i / 50) + 1}`,
      });
    }

    // Ghi hàng loạt theo Batch
    await prisma.item.createMany({
      data: itemsData,
    });

    const duration = Date.now() - startTime;
    console.log(`\n   ⚡ Ghi thành công 500 mặt hàng vào DB trong: ${duration}ms (${(duration / 500).toFixed(2)}ms/item)`);
    
    // Thu thập danh sách ID vừa tạo
    const insertedItems = await prisma.item.findMany({
      where: { name: { contains: "Đồ dùng tải cao" } },
      select: { id: true, quantity: true },
      take: 500,
    });

    createdItemIds = insertedItems.map((it) => it.id);
    assert.strictEqual(createdItemIds.length >= 500, true);
    assert.ok(duration < 5000, "Thời gian ghi 500 mặt hàng phải dưới 5 giây");
  });

  test("3. Concurrent Request Ingestion: Tạo 100 phiếu yêu cầu với 300 dòng chi tiết đồng thời", async () => {
    const startTime = Date.now();

    const requestPromises = [];
    for (let i = 0; i < 100; i++) {
      const selectedItemIds = [
        createdItemIds[i % createdItemIds.length],
        createdItemIds[(i + 10) % createdItemIds.length],
        createdItemIds[(i + 20) % createdItemIds.length],
      ];

      const p = prisma.request.create({
        data: {
          requesterId: teacherId,
          purpose: `Hoạt động thử tải đồng thời #${i + 1}`,
          neededDate: new Date(Date.now() + 86400000 * (i + 1)),
          status: "pending",
          requestItems: {
            create: selectedItemIds.map((itemId) => ({
              itemId,
              requestedQty: Math.floor(Math.random() * 8) + 1,
              allocatedQty: 2,
              shortfallQty: 1,
            })),
          },
        },
      });

      requestPromises.push(p);
    }

    const createdRequests = await Promise.all(requestPromises);
    createdRequestIds = createdRequests.map((r) => r.id);

    const duration = Date.now() - startTime;
    console.log(`   ⚡ Tạo đồng thời 100 phiếu yêu cầu (300 dòng) trong: ${duration}ms (${(duration / 100).toFixed(2)}ms/request)`);

    assert.strictEqual(createdRequests.length, 100);
    assert.ok(duration < 8000, "Thời gian tạo 100 phiếu yêu cầu phải dưới 8 giây");
  });

  test("4. Audit Trail Ingestion: Nạp 1,000 dòng nhật ký giao dịch kho (Stock Transactions)", async () => {
    const startTime = Date.now();
    const transactionsData = [];

    for (let i = 0; i < 1000; i++) {
      transactionsData.push({
        itemId: createdItemIds[i % createdItemIds.length],
        type: i % 2 === 0 ? "nhap_kho" : "dieu_chinh",
        quantityChange: i % 2 === 0 ? 10 : -2,
        performedBy: adminId,
        note: `Nhật ký stress test tải cao #${i + 1}`,
      });
    }

    await prisma.stockTransaction.createMany({
      data: transactionsData,
    });

    const duration = Date.now() - startTime;
    console.log(`   ⚡ Nạp 1,000 dòng lịch sử kho (Stock Transactions) trong: ${duration}ms (${(duration / 1000).toFixed(2)}ms/log)`);

    assert.ok(duration < 5000, "Thời gian nạp 1,000 log phải dưới 5 giây");
  });

  test("5. High Concurrency Querying: Mô phỏng 100 truy vấn tìm kiếm, lọc và phân bổ đồng thời", async () => {
    const startTime = Date.now();

    // 100 truy vấn song song đồng thời từ nhiều client
    const queryPromises = [];
    for (let i = 0; i < 100; i++) {
      const p = (async () => {
        // Query 1: Lấy danh sách tồn kho kèm lọc danh mục
        const items = await prisma.item.findMany({
          where: { category: i % 2 === 0 ? "hoc_tap" : "ngoai_khoa" },
          take: 50,
          orderBy: { updatedAt: "desc" },
        });

        // Query 2: Lấy thông tin thống kê Dashboard
        const [totalItems, pendingRequests, lowStockItems] = await Promise.all([
          prisma.item.count(),
          prisma.request.count({ where: { status: "pending" } }),
          prisma.item.count({ where: { quantity: { lte: 10 } } }),
        ]);

        return { itemsCount: items.length, totalItems, pendingRequests, lowStockItems };
      })();

      queryPromises.push(p);
    }

    const results = await Promise.all(queryPromises);
    const duration = Date.now() - startTime;
    const avgLatency = (duration / 100).toFixed(2);

    console.log(`   ⚡ Hoàn thành 100 truy vấn phức tạp đồng thời trong: ${duration}ms (Độ trễ trung bình: ${avgLatency}ms/request)`);

    assert.strictEqual(results.length, 100);
    assert.ok(duration < 6000, "100 truy vấn song song phải hoàn thành dưới 6 giây");
  });

  test("6. Complex Transaction Under Load: Duyệt 50 yêu cầu theo từng cụm tải cao (Batched Concurrency)", async () => {
    const startTime = Date.now();

    // Lấy 50 requests vừa tạo để duyệt
    const targetRequests = await prisma.request.findMany({
      where: { id: { in: createdRequestIds.slice(0, 50) } },
      include: { requestItems: true },
    });

    // Thực thi theo từng nhóm 10 giao dịch đồng thời (Concurreny Pool)
    const chunkSize = 10;
    const approvedResults = [];

    for (let i = 0; i < targetRequests.length; i += chunkSize) {
      const chunk = targetRequests.slice(i, i + chunkSize);
      const chunkPromises = chunk.map((req) =>
        prisma.$transaction(
          async (tx) => {
            // 1. Trừ kho
            for (const rItem of req.requestItems) {
              if (rItem.allocatedQty > 0) {
                await tx.item.update({
                  where: { id: rItem.itemId },
                  data: { quantity: { decrement: rItem.allocatedQty } },
                });

                await tx.stockTransaction.create({
                  data: {
                    itemId: rItem.itemId,
                    type: "xuat_kho_duyet_yc",
                    quantityChange: -rItem.allocatedQty,
                    referenceId: req.id,
                    performedBy: adminId,
                    note: `Duyệt tải cao #${req.id.slice(0, 8)}`,
                  },
                });
              }
            }

            // 2. Cập nhật trạng thái phiếu
            return tx.request.update({
              where: { id: req.id },
              data: {
                status: "approved",
                decidedAt: new Date(),
                decidedBy: adminId,
              },
            });
          },
          { timeout: 15000, maxWait: 10000 }
        )
      );

      const chunkResults = await Promise.all(chunkPromises);
      approvedResults.push(...chunkResults);
    }

    const duration = Date.now() - startTime;
    console.log(`   ⚡ Thực hiện 50 DB Transactions duyệt đơn & trừ kho trong: ${duration}ms (${(duration / 50).toFixed(2)}ms/transaction)`);

    assert.strictEqual(approvedResults.length, 50);
    assert.ok(duration < 8000, "50 giao dịch duyệt phải hoàn tất dưới 8 giây");
  });

  test("7. SQLite Database Integrity & Health Check", async () => {
    // Kiểm tra tính toàn vẹn dữ liệu SQLite sau đợt tải lớn
    const integrityResult = await prisma.$queryRawUnsafe<any[]>("PRAGMA integrity_check;");
    console.log(`   🛡️ SQLite PRAGMA integrity_check: ${JSON.stringify(integrityResult)}`);

    assert.strictEqual(integrityResult[0].integrity_check, "ok");
  });

  test("8. Dọn dẹp dữ liệu kiểm thử tải cao an toàn", async () => {
    const startTime = Date.now();

    // Dọn dẹp an toàn các bản ghi test
    await prisma.stockTransaction.deleteMany({
      where: { note: { contains: "tải" } },
    });

    await prisma.requestItem.deleteMany({
      where: { request: { purpose: { contains: "Hoạt động thử tải" } } },
    });

    await prisma.request.deleteMany({
      where: { purpose: { contains: "Hoạt động thử tải" } },
    });

    await prisma.item.deleteMany({
      where: { name: { contains: "Đồ dùng tải cao" } },
    });

    const duration = Date.now() - startTime;
    console.log(`   🧹 Dọn dẹp an toàn toàn bộ dữ liệu test trong: ${duration}ms\n`);
  });
});
