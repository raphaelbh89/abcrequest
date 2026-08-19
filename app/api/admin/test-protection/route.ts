import { requireRole } from "@/lib/auth-guards";
import { NextResponse } from "next/server";

export const GET = requireRole("admin", (_req, user) => {
  return NextResponse.json({
    message: "Bạn đã gọi thành công API Quản trị viên (Admin)",
    user,
  });
});
