import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createJWT, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên đăng nhập và mật khẩu" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username: String(username).trim() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không chính xác" },
        { status: 401 }
      );
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không chính xác" },
        { status: 401 }
      );
    }

    const token = await createJWT({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    });

    const response = NextResponse.json({
      message: "Đăng nhập thành công",
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi hệ thống khi xử lý đăng nhập" },
      { status: 500 }
    );
  }
}
