import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";
import { verifyPassword, hashPassword } from "@/lib/auth";

// POST /api/auth/change-password - Change current user's password
export const POST = requireAuth(async (req: NextRequest, currentUser) => {
  try {
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ mật khẩu hiện tại và mật khẩu mới." },
        { status: 400 }
      );
    }

    if (String(newPassword).length < 4) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải chứa ít nhất 4 ký tự." },
        { status: 400 }
      );
    }

    // Fetch user with password hash
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });

    if (!user) {
      return NextResponse.json({ error: "Người dùng không tồn tại." }, { status: 404 });
    }

    // Verify current password
    const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return NextResponse.json(
        { error: "Mật khẩu hiện tại không chính xác. Vui lòng kiểm tra lại." },
        { status: 400 }
      );
    }

    // Hash new password and update
    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: currentUser.id },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({
      message: "Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới của bạn.",
    });
  } catch (error) {
    console.error("POST /api/auth/change-password error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi thực hiện đổi mật khẩu." },
      { status: 500 }
    );
  }
});
