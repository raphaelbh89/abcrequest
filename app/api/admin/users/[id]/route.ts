import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";
import { hashPassword } from "@/lib/auth";

// PATCH /api/admin/users/[id] - Update user details or reset password (Admin only)
export const PATCH = requireRole("admin", async (req: NextRequest, _user, context?: any) => {
  try {
    const params = await context?.params;
    const targetUserId = params?.id;

    if (!targetUserId) {
      return NextResponse.json({ error: "Mã người dùng không hợp lệ" }, { status: 400 });
    }

    const body = await req.json();
    const { fullName, role, newPassword } = body;

    const existingUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Tài khoản người dùng không tồn tại" }, { status: 404 });
    }

    const updateData: any = {};
    if (fullName !== undefined && String(fullName).trim()) {
      updateData.fullName = String(fullName).trim();
    }

    if (role !== undefined) {
      updateData.role = ["admin", "manager", "stocker", "teacher"].includes(role) ? role : "teacher";
    }

    if (newPassword !== undefined && String(newPassword).trim()) {
      const pwdStr = String(newPassword).trim();
      if (pwdStr.length < 4) {
        return NextResponse.json(
          { error: "Mật khẩu mới phải chứa ít nhất 4 ký tự" },
          { status: 400 }
        );
      }
      updateData.passwordHash = await hashPassword(pwdStr);
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      message: `Đã cập nhật thông tin tài khoản "${updatedUser.username}"`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("PATCH /api/admin/users/[id] error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi cập nhật thông tin tài khoản" },
      { status: 500 }
    );
  }
});

// DELETE /api/admin/users/[id] - Delete user with safeguards
export const DELETE = requireRole("admin", async (_req: NextRequest, currentUser, context?: any) => {
  try {
    const params = await context?.params;
    const targetUserId = params?.id;

    if (!targetUserId) {
      return NextResponse.json({ error: "Mã người dùng không hợp lệ" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Tài khoản người dùng không tồn tại" }, { status: 404 });
    }

    // Safeguard 1: Prevent self-deletion
    if (targetUser.id === currentUser.id) {
      return NextResponse.json(
        { error: "Bạn không thể tự xóa tài khoản đang đăng nhập của chính mình!" },
        { status: 400 }
      );
    }

    // Safeguard 2: Prevent deleting the last remaining admin
    if (targetUser.role === "admin") {
      const adminCount = await prisma.user.count({
        where: { role: "admin" },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Không thể xóa tài khoản Admin duy nhất còn lại trong hệ thống!" },
          { status: 400 }
        );
      }
    }

    // Safeguard 3: Prevent deleting user with active pending requests
    const pendingRequest = await prisma.request.findFirst({
      where: {
        requesterId: targetUserId,
        status: "pending",
      },
    });

    if (pendingRequest) {
      return NextResponse.json(
        {
          error: `Không thể xóa người dùng "${targetUser.fullName}" vì đang có phiếu yêu cầu đang chờ duyệt (Yêu cầu: "${pendingRequest.purpose}").`,
        },
        { status: 400 }
      );
    }

    // Safe to delete within transaction
    await prisma.$transaction(async (tx) => {
      // Reassign decided requests if any
      await tx.request.updateMany({
        where: { decidedBy: targetUserId },
        data: { decidedBy: null },
      });

      // Cleanup user's historical requests and cascade children
      const userReqs = await tx.request.findMany({
        where: { requesterId: targetUserId },
        select: { id: true },
      });

      for (const ur of userReqs) {
        await tx.purchaseProposal.deleteMany({ where: { sourceRequestId: ur.id } });
        await tx.requestItem.deleteMany({ where: { requestId: ur.id } });
        await tx.request.delete({ where: { id: ur.id } });
      }

      await tx.stockTransaction.deleteMany({ where: { performedBy: targetUserId } });
      await tx.user.delete({ where: { id: targetUserId } });
    });

    return NextResponse.json({
      message: `Đã xóa tài khoản "${targetUser.username}" (${targetUser.fullName}) thành công`,
    });
  } catch (error) {
    console.error("DELETE /api/admin/users/[id] error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi xóa tài khoản người dùng" },
      { status: 500 }
    );
  }
});
