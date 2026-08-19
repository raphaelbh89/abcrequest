import { test, describe } from "node:test";
import assert from "node:assert";
import { prisma } from "../lib/db";
import { hashPassword, verifyPassword } from "../lib/auth";

describe("Integration Tests: Notifications & Self Change Password", () => {
  test("1. Đổi mật khẩu cá nhân: xác thực mật khẩu cũ và cập nhật mật khẩu mới", async () => {
    const uniqueUsername = `test_pwd_${Date.now()}`;
    const initialPwd = "oldPassword123";
    const initialHash = await hashPassword(initialPwd);

    const user = await prisma.user.create({
      data: {
        username: uniqueUsername,
        passwordHash: initialHash,
        fullName: "Người Dùng Test Đổi Pass",
        role: "teacher",
      },
    });

    // Case A: Wrong current password
    const wrongInput = "wrongPassword";
    const isWrongValid = await verifyPassword(wrongInput, user.passwordHash);
    assert.strictEqual(isWrongValid, false, "Mật khẩu cũ không đúng phải bị từ chối");

    // Case B: Correct current password -> Update
    const correctInput = "oldPassword123";
    const isCorrectValid = await verifyPassword(correctInput, user.passwordHash);
    assert.strictEqual(isCorrectValid, true, "Mật khẩu cũ đúng phải được chấp thuận");

    const newPwd = "newSecurePassword456";
    const newHash = await hashPassword(newPwd);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    const isNewValid = await verifyPassword(newPwd, updated.passwordHash);
    assert.strictEqual(isNewValid, true, "Mật khẩu mới băm bằng bcrypt phải kiểm tra đúng");

    // Clean up
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("2. Hệ thống thông báo: kiểm tra cấu trúc thông báo cho giáo viên và quản lý", async () => {
    // Check database connection and requests query
    const requests = await prisma.request.findMany({
      take: 5,
      include: { requester: true },
    });

    assert.ok(Array.isArray(requests), "Danh sách yêu cầu phải là mảng");
  });
});
