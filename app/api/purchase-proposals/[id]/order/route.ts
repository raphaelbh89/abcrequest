import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";

// PATCH /api/purchase-proposals/[id]/order - Admin, Manager, Stocker
export const PATCH = requireRole(["admin", "manager", "stocker"], async (_req: NextRequest, _user, context?: any) => {
  try {
    const params = await context?.params;
    const proposalId = params?.id;

    if (!proposalId) {
      return NextResponse.json({ error: "Mã đề xuất không hợp lệ" }, { status: 400 });
    }

    const proposal = await prisma.purchaseProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      return NextResponse.json({ error: "Đề xuất mua không tồn tại" }, { status: 404 });
    }

    if (proposal.status !== "can_mua") {
      return NextResponse.json(
        { error: "Chỉ có thể đánh dấu 'Đã đặt mua' cho đề xuất ở trạng thái Cần mua" },
        { status: 400 }
      );
    }

    const updatedProposal = await prisma.purchaseProposal.update({
      where: { id: proposalId },
      data: {
        status: "da_dat_mua",
      },
      include: {
        item: true,
        sourceRequest: {
          include: {
            requester: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Đã chuyển trạng thái sang Đã đặt mua",
      proposal: updatedProposal,
    });
  } catch (error) {
    console.error("PATCH /api/purchase-proposals/[id]/order error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi cập nhật trạng thái đặt mua" },
      { status: 500 }
    );
  }
});
