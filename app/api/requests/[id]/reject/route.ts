import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";

// PATCH /api/requests/[id]/reject
// Cho phép Admin và Quản lý (Manager) từ chối yêu cầu
export const PATCH = requireRole(["admin", "manager"], async (req: NextRequest, user, context?: any) => {
  try {
    const params = await context?.params;
    const requestId = params?.id;

    if (!requestId) {
      return NextResponse.json({ error: "Mã yêu cầu không hợp lệ" }, { status: 400 });
    }

    const body = await req.json();
    const { rejectReason } = body;

    if (!rejectReason || !String(rejectReason).trim()) {
      return NextResponse.json(
        { error: "Lý do từ chối là bắt buộc và không được để trống" },
        { status: 400 }
      );
    }

    const targetRequest = await prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!targetRequest) {
      return NextResponse.json({ error: "Yêu cầu không tồn tại" }, { status: 404 });
    }

    if (targetRequest.status !== "pending") {
      return NextResponse.json(
        { error: "Chỉ có thể từ chối các yêu cầu đang ở trạng thái Chờ duyệt (pending)" },
        { status: 400 }
      );
    }

    const rejectedRequest = await prisma.request.update({
      where: { id: requestId },
      data: {
        status: "rejected",
        rejectReason: String(rejectReason).trim(),
        decidedAt: new Date(),
        decidedBy: user.id,
      },
      include: {
        requester: {
          select: { id: true, username: true, fullName: true },
        },
        decidedByUser: {
          select: { id: true, username: true, fullName: true },
        },
        requestItems: {
          include: { item: true },
        },
      },
    });

    return NextResponse.json({
      message: "Từ chối yêu cầu đồ dùng thành công",
      request: rejectedRequest,
    });
  } catch (error) {
    console.error("PATCH /api/requests/[id]/reject error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi từ chối yêu cầu" },
      { status: 500 }
    );
  }
});
