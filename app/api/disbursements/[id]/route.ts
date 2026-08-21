import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

// GET /api/disbursements/[id] - Lấy chi tiết phiếu cấp phát
export const GET = requireRole(
  ["admin", "manager", "stocker", "teacher"],
  async (req: NextRequest, user, context?: any) => {
    try {
      const params = await context?.params;
      const id = params?.id;

      if (!id) {
        return NextResponse.json({ error: "Mã phiếu không hợp lệ" }, { status: 400 });
      }

      const disbursement = await prisma.disbursement.findUnique({
        where: { id },
        include: {
          recipient: {
            select: { id: true, fullName: true, username: true, role: true },
          },
          disbursedUser: {
            select: { id: true, fullName: true, username: true, role: true },
          },
          request: {
            select: {
              id: true,
              purpose: true,
              neededDate: true,
              note: true,
              status: true,
              createdAt: true,
            },
          },
          items: {
            include: {
              item: {
                select: { id: true, name: true, unit: true, category: true, price: true, imageUrl: true },
              },
            },
          },
          reuseReturns: {
            include: {
              item: { select: { id: true, name: true, unit: true } },
              receivedUser: { select: { id: true, fullName: true } },
            },
            orderBy: { returnedAt: "desc" },
          },
        },
      });

      if (!disbursement) {
        return NextResponse.json({ error: "Phiếu cấp phát không tồn tại" }, { status: 404 });
      }

      // If teacher, can only see their own
      if (user.role === "teacher" && disbursement.recipientId !== user.id) {
        return NextResponse.json(
          { error: "Bạn không có quyền xem phiếu cấp phát của giáo viên khác" },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        disbursement,
      });
    } catch (error: any) {
      console.error("GET /api/disbursements/[id] error:", error);
      return NextResponse.json(
        { error: error?.message || "Lỗi khi tải chi tiết phiếu cấp phát" },
        { status: 500 }
      );
    }
  }
);
