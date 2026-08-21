import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";

// GET /api/requests/[id] - Get detailed info of a single request
export const GET = requireAuth(async (_req: NextRequest, user, context?: any) => {
  try {
    const params = await context?.params;
    const requestId = params?.id;

    if (!requestId) {
      return NextResponse.json({ error: "Mã yêu cầu không hợp lệ" }, { status: 400 });
    }

    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          select: { id: true, username: true, fullName: true, role: true },
        },
        decidedByUser: {
          select: { id: true, username: true, fullName: true },
        },
        requestItems: {
          include: {
            item: true,
          },
        },
        purchaseProposals: true,
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Yêu cầu không tồn tại" }, { status: 404 });
    }

    const isManagement = ["admin", "manager", "stocker"].includes(user.role);
    if (!isManagement && request.requesterId !== user.id) {
      return NextResponse.json(
        { error: "Bạn không có quyền xem phiếu yêu cầu này" },
        { status: 403 }
      );
    }

    return NextResponse.json({ request });
  } catch (error) {
    console.error("GET /api/requests/[id] error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi tải thông tin phiếu yêu cầu" },
      { status: 500 }
    );
  }
});
