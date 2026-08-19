import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";
import { hashPassword } from "@/lib/auth";

// GET /api/admin/users - Admin only
export const GET = requireRole("admin", async () => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi lấy danh sách tài khoản" },
      { status: 500 }
    );
  }
});

// POST /api/admin/users - Admin only (Create user with bcrypt hashed password)
export const POST = requireRole("admin", async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { username, password, fullName, role } = body;

    const trimmedUsername = username ? String(username).trim() : "";
    const trimmedFullName = fullName ? String(fullName).trim() : "";
    const userRole = ["admin", "manager", "stocker", "teacher"].includes(role) ? role : "teacher";

    if (!trimmedUsername || trimmedUsername.length < 3) {
      return NextResponse.json(
        { error: "Tên đăng nhập phải chứa ít nhất 3 ký tự" },
        { status: 400 }
      );
    }

    if (!password || String(password).length < 4) {
      return NextResponse.json(
        { error: "Mật khẩu phải chứa ít nhất 4 ký tự" },
        { status: 400 }
      );
    }

    if (!trimmedFullName) {
      return NextResponse.json(
        { error: "Họ và tên là thông tin bắt buộc" },
        { status: 400 }
      );
    }

    // Check existing username
    const existingUser = await prisma.user.findUnique({
      where: { username: trimmedUsername },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: `Tên đăng nhập "${trimmedUsername}" đã tồn tại trong hệ thống` },
        { status: 400 }
      );
    }

    // Hash password using bcrypt
    const passwordHash = await hashPassword(String(password));

    const newUser = await prisma.user.create({
      data: {
        username: trimmedUsername,
        passwordHash,
        fullName: trimmedFullName,
        role: userRole,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      message: `Tạo tài khoản ${newUser.username} thành công`,
      user: newUser,
    });
  } catch (error) {
    console.error("POST /api/admin/users error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi tạo tài khoản người dùng" },
      { status: 500 }
    );
  }
});
