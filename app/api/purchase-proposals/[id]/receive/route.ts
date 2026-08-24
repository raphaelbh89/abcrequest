import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";

// PATCH /api/purchase-proposals/[id]/receive - Admin, Manager, Stocker
export const PATCH = requireRole(["admin", "manager", "stocker"], async (req: NextRequest, user, context?: any) => {
  try {
    const params = await context?.params;
    const proposalId = params?.id;

    if (!proposalId) {
      return NextResponse.json({ error: "Mã đề xuất không hợp lệ" }, { status: 400 });
    }

    const body = await req.json();
    const { receivedQty, note } = body;

    const recvQty = parseInt(receivedQty, 10);
    if (isNaN(recvQty) || recvQty <= 0) {
      return NextResponse.json(
        { error: "Số lượng thực nhận phải là số lớn hơn 0" },
        { status: 400 }
      );
    }

    const proposal = await prisma.purchaseProposal.findUnique({
      where: { id: proposalId },
      include: {
        item: true,
        sourceRequest: true,
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: "Đề xuất mua không tồn tại" }, { status: 404 });
    }

    if (proposal.status === "da_nhap_kho") {
      return NextResponse.json(
        { error: "Đề xuất mua này đã được nhập kho trước đó" },
        { status: 400 }
      );
    }

    const updatedResult = await prisma.$transaction(async (tx) => {
      let targetItemId: string;
      let updatedItem: any;

      if (!proposal.itemId) {
        // Tạo mặt hàng vào kho nếu chưa có itemId
        updatedItem = await tx.item.create({
          data: {
            name: proposal.proposedName || "Mặt hàng mua mới",
            unit: proposal.proposedUnit || "cái",
            category: "hoc_tap",
            quantity: recvQty,
            minStock: 5,
          },
        });
        targetItemId = updatedItem.id;
      } else {
        targetItemId = proposal.itemId;
        // 1. Add physical stock to item.quantity
        updatedItem = await tx.item.update({
          where: { id: targetItemId },
          data: {
            quantity: { increment: recvQty },
          },
        });
      }

      // 2. Log in stock_transactions
      await tx.stockTransaction.create({
        data: {
          itemId: targetItemId,
          type: "nhap_kho",
          quantityChange: recvQty,
          referenceId: proposal.id,
          performedBy: user.id,
          note: note ? String(note).trim() : `Nhập kho từ đề xuất mua (Yêu cầu: "${proposal.sourceRequest.purpose}")`,
        },
      });

      // 3. Mark proposal as da_nhap_kho
      const updatedProposal = await tx.purchaseProposal.update({
        where: { id: proposal.id },
        data: {
          status: "da_nhap_kho",
          receivedQty: recvQty,
          resolvedAt: new Date(),
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

      // 4. Update the matching RequestItem in sourceRequest
      // Allocate the newly received quantity so it becomes ready for disbursement
      const matchingRequestItem = await tx.requestItem.findFirst({
        where: {
          requestId: proposal.sourceRequestId,
          OR: [
            { itemId: targetItemId },
            ...(proposal.itemId ? [{ itemId: proposal.itemId }] : []),
            ...(proposal.proposedName ? [{ proposedName: proposal.proposedName }] : []),
          ],
        },
      });

      if (matchingRequestItem) {
        const newAllocatedQty = matchingRequestItem.allocatedQty + recvQty;
        const newShortfallQty = Math.max(0, matchingRequestItem.shortfallQty - recvQty);

        await tx.requestItem.update({
          where: { id: matchingRequestItem.id },
          data: {
            itemId: targetItemId,
            allocatedQty: newAllocatedQty,
            shortfallQty: newShortfallQty,
          },
        });
      }

      return { item: updatedItem, proposal: updatedProposal };
    });

    return NextResponse.json({
      message: `Đã nhập kho +${recvQty} ${updatedResult.item.unit} cho mặt hàng "${updatedResult.item.name}"`,
      proposal: updatedResult.proposal,
      item: updatedResult.item,
    });
  } catch (error) {
    console.error("PATCH /api/purchase-proposals/[id]/receive error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi nhập kho từ đề xuất mua" },
      { status: 500 }
    );
  }
});
