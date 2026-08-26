import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";

// GET /api/users - Admin, Manager, Stocker can retrieve user list for disbursement & assignment
export const GET = requireRole(
  ["admin", "manager", "stocker"],
  async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const roleFilter = searchParams.get("role");

      const whereClause: any = {};
      if (roleFilter && roleFilter !== "all") {
        whereClause.role = roleFilter;
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          createdAt: true,
        },
        orderBy: { fullName: "asc" },
      });

      return NextResponse.json({ users });
    } catch (error: any) {
      console.error("GET /api/users error:", error);
      return NextResponse.json(
        { error: error?.message || "Lỗi khi tải danh sách người dùng" },
        { status: 500 }
      );
    }
  }
);
