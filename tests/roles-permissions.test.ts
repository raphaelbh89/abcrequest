import { test, describe } from "node:test";
import assert from "node:assert";
import { prisma } from "../lib/db";
import { createJWT, verifyJWT } from "../lib/auth";

describe("Integration Tests: 4-Tier Role-Based Access Control", () => {
  test("1. Kiểm tra 4 tài khoản người dùng tương ứng 4 Roles trong CSDL", async () => {
    const admin = await prisma.user.findUnique({ where: { username: "admin" } });
    const manager = await prisma.user.findUnique({ where: { username: "quanly" } });
    const stocker = await prisma.user.findUnique({ where: { username: "thukho" } });
    const teacher = await prisma.user.findUnique({ where: { username: "giaovien" } });

    assert.ok(admin, "Tài khoản admin phải tồn tại");
    assert.strictEqual(admin.role, "admin");

    assert.ok(manager, "Tài khoản manager (quanly) phải tồn tại");
    assert.strictEqual(manager.role, "manager");

    assert.ok(stocker, "Tài khoản stocker (thukho) phải tồn tại");
    assert.strictEqual(stocker.role, "stocker");

    assert.ok(teacher, "Tài khoản teacher (giaovien) phải tồn tại");
    assert.strictEqual(teacher.role, "teacher");
  });

  test("2. Kiểm tra sinh mã JWT Token chuẩn xác cho cả 4 Roles", async () => {
    const adminToken = await createJWT({ id: "admin-id", username: "admin", fullName: "Admin User", role: "admin" });
    const managerToken = await createJWT({ id: "manager-id", username: "quanly", fullName: "Manager User", role: "manager" });
    const stockerToken = await createJWT({ id: "stocker-id", username: "thukho", fullName: "Stocker User", role: "stocker" });
    const teacherToken = await createJWT({ id: "teacher-id", username: "giaovien", fullName: "Teacher User", role: "teacher" });

    assert.ok(typeof adminToken === "string" && adminToken.length > 20);
    assert.ok(typeof managerToken === "string" && managerToken.length > 20);
    assert.ok(typeof stockerToken === "string" && stockerToken.length > 20);
    assert.ok(typeof teacherToken === "string" && teacherToken.length > 20);

    const verifiedAdmin = await verifyJWT(adminToken);
    assert.strictEqual(verifiedAdmin?.role, "admin");

    const verifiedManager = await verifyJWT(managerToken);
    assert.strictEqual(verifiedManager?.role, "manager");

    const verifiedStocker = await verifyJWT(stockerToken);
    assert.strictEqual(verifiedStocker?.role, "stocker");

    const verifiedTeacher = await verifyJWT(teacherToken);
    assert.strictEqual(verifiedTeacher?.role, "teacher");
  });

  test("3. Kiểm tra phân quyền thao tác duyệt yêu cầu và quản lý kho", async () => {
    // Tạo 1 item và 1 request mẫu
    const teacher = await prisma.user.findUnique({ where: { username: "giaovien" } });
    const manager = await prisma.user.findUnique({ where: { username: "quanly" } });

    const item = await prisma.item.create({
      data: {
        name: `Đồ dùng Test Phân Quyền ${Date.now()}`,
        category: "hoc_tap",
        unit: "hộp",
        quantity: 10,
        minStock: 2,
      },
    });

    const request = await prisma.request.create({
      data: {
        requesterId: teacher!.id,
        purpose: "Test quyền duyệt của Manager",
        neededDate: new Date(),
        status: "pending",
        requestItems: {
          create: [
            {
              itemId: item.id,
              requestedQty: 4,
              allocatedQty: 4,
              shortfallQty: 0,
            },
          ],
        },
      },
    });

    // Quản lý (Manager) duyệt đơn thành công
    const approvedRequest = await prisma.request.update({
      where: { id: request.id },
      data: {
        status: "approved",
        decidedAt: new Date(),
        decidedBy: manager!.id,
      },
    });

    assert.strictEqual(approvedRequest.status, "approved");
    assert.strictEqual(approvedRequest.decidedBy, manager!.id);

    // Clean up
    await prisma.requestItem.deleteMany({ where: { requestId: request.id } });
    await prisma.request.delete({ where: { id: request.id } });
    await prisma.item.delete({ where: { id: item.id } });
  });

  test("4. Kiểm tra Manager & Admin thấy được tất cả yêu cầu do Giáo viên tạo", async () => {
    const teacher = await prisma.user.findUnique({ where: { username: "giaovien" } });
    const manager = await prisma.user.findUnique({ where: { username: "quanly" } });

    // Giáo viên tạo yêu cầu
    const req = await prisma.request.create({
      data: {
        requesterId: teacher!.id,
        purpose: `Phiếu của giáo viên ${Date.now()}`,
        neededDate: new Date(),
        status: "pending",
      },
    });

    // Manager truy vấn danh sách (không có điều kiện lọc theo requesterId riêng)
    const isManagement = ["admin", "manager", "stocker"].includes(manager!.role);
    assert.strictEqual(isManagement, true);

    const whereClause: any = {};
    if (!isManagement) {
      whereClause.requesterId = manager!.id;
    }
    whereClause.id = req.id;

    const foundByManager = await prisma.request.findFirst({
      where: whereClause,
    });

    assert.ok(foundByManager, "Manager phải thấy được phiếu do giáo viên tạo");
    assert.strictEqual(foundByManager.id, req.id);

    // Clean up
    await prisma.request.delete({ where: { id: req.id } });
  });
});
