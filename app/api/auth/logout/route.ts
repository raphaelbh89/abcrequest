import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Đã đăng xuất thành công" });
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
  return response;
}
