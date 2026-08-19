import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";

// PATCH /api/requests/[id]/cancel - Cancel a pending request
export const PATCH = requireAuth(async (_req: NextRequest, user, context?: any) => {
  try {
    const params = await context?.params;
    const requestId = params?.id;

    if (!requestId) {
      return NextResponse.json({ error: "Mã yêu cầu không hợp lệ" }, { status: 400 });
    }

    const request = await prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return NextResponse.json({ error: "Yêu cầu không tồn tại" }, { status: 404 });
    }

    if (request.status !== "pending") {
      return NextResponse.json(
        { error: "Chỉ có thể hủy các yêu cầu đang ở trạng thái Chờ duyệt (pending)" },
        { status: 400 }
      );
    }

    if (request.requesterId !== user.id && user.role !== "admin") {
      return NextResponse.json(
        { error: "Bạn chỉ có thể hủy yêu cầu do chính mình tạo ra" },
        { status: 403 }
      );
    }

    const updatedRequest = await prisma.request.update({
      where: { id: requestId },
      data: {
        status: "cancelled",
      },
    });

    return NextResponse.json({
      message: "Đã hủy yêu cầu đồ dùng thành công",
      request: updatedRequest,
    });
  } catch (error) {
    console.error("PATCH /api/requests/[id]/cancel error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi hủy yêu cầu" },
      { status: 500 }
    );
  }
});
