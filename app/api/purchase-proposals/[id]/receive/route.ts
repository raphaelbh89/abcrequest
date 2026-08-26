import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";
import { normalizeVietnamese } from "@/lib/search";

// Handler xử lý nhập kho từ đề xuất mua sắm
async function handleReceive(req: NextRequest, user: any, context?: any) {
  try {
    const params = await context?.params;
    const proposalId = params?.id;

    if (!proposalId) {
      return NextResponse.json({ error: "Mã đề xuất không hợp lệ" }, { status: 400 });
    }

    const body = await req.json();
    const { receivedQty, price, note } = body;

    const recvQty = parseInt(receivedQty, 10);
    if (isNaN(recvQty) || recvQty <= 0) {
      return NextResponse.json(
        { error: "Số lượng thực nhận phải là số lớn hơn 0" },
        { status: 400 }
      );
    }

    const inputPrice =
      price !== undefined && price !== null && !isNaN(parseFloat(price))
        ? Math.max(0, parseFloat(price))
        : undefined;

    const proposal = await prisma.purchaseProposal.findUnique({
      where: { id: proposalId },
      include: {
        item: true,
        sourceRequest: {
          include: {
            requestItems: true,
          },
        },
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

    const matchingReqItem = proposal.sourceRequest.requestItems.find(
      (i) =>
        (proposal.itemId && i.itemId === proposal.itemId) ||
        (proposal.proposedName && i.proposedName === proposal.proposedName)
    );

    const updatedResult = await prisma.$transaction(async (tx) => {
      let targetItemId: string;
      let updatedItem: any;

      if (!proposal.itemId) {
        // 1. Tạo mặt hàng mới vào kho nếu là đề xuất mua mới
        const itemName = proposal.proposedName || "Mặt hàng mua mới";
        updatedItem = await tx.item.create({
          data: {
            name: itemName,
            nameNormalized: normalizeVietnamese(itemName),
            unit: proposal.proposedUnit || matchingReqItem?.proposedUnit || "cái",
            category: "hoc_tap",
            quantity: recvQty,
            minStock: 5,
            price: inputPrice !== undefined ? inputPrice : matchingReqItem?.proposedPrice || null,
            imageUrl: matchingReqItem?.proposedImageUrl || null,
          },
        });
        targetItemId = updatedItem.id;
      } else {
        targetItemId = proposal.itemId;
        // 1. Cộng dồn số lượng tồn kho vật lý và cập nhật giá mới (nếu có)
        updatedItem = await tx.item.update({
          where: { id: targetItemId },
          data: {
            quantity: { increment: recvQty },
            ...(inputPrice !== undefined ? { price: inputPrice } : {}),
          },
        });
      }

      // 2. Ghi nhật ký vào bảng stock_transactions
      await tx.stockTransaction.create({
        data: {
          itemId: targetItemId,
          type: "nhap_kho",
          quantityChange: recvQty,
          referenceId: proposal.id,
          performedBy: user.id,
          note: note
            ? String(note).trim()
            : inputPrice !== undefined
            ? `Nhập kho từ đề xuất mua (Đơn giá: ${inputPrice.toLocaleString("vi-VN")} đ)`
            : `Nhập kho từ đề xuất mua (Chủ đề: "${proposal.sourceRequest.purpose}")`,
        },
      });

      // 3. Cập nhật trạng thái đề xuất mua thành da_nhap_kho
      const updatedProposal = await tx.purchaseProposal.update({
        where: { id: proposal.id },
        data: {
          itemId: targetItemId,
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

      // 4. Cập nhật RequestItem liên kết trong phiếu yêu cầu nguồn
      if (matchingReqItem) {
        const newAllocatedQty = matchingReqItem.allocatedQty + recvQty;
        const newShortfallQty = Math.max(0, matchingReqItem.shortfallQty - recvQty);

        await tx.requestItem.update({
          where: { id: matchingReqItem.id },
          data: {
            itemId: targetItemId,
            allocatedQty: newAllocatedQty,
            shortfallQty: newShortfallQty,
            ...(inputPrice !== undefined && !matchingReqItem.proposedPrice ? { proposedPrice: inputPrice } : {}),
          },
        });
      }

      return { item: updatedItem, proposal: updatedProposal };
    });

    return NextResponse.json({
      success: true,
      message: `Đã nhập kho +${recvQty} ${updatedResult.item.unit} cho mặt hàng "${updatedResult.item.name}"${
        inputPrice !== undefined ? ` (Đơn giá: ${inputPrice.toLocaleString("vi-VN")} đ)` : ""
      }`,
      proposal: updatedResult.proposal,
      item: updatedResult.item,
    });
  } catch (error: any) {
    console.error("Receive purchase proposal error:", error);
    return NextResponse.json(
      { error: error?.message || "Lỗi hệ thống khi nhập kho từ đề xuất mua" },
      { status: 500 }
    );
  }
}

// Hỗ trợ cả POST và PATCH
export const POST = requireRole(["admin", "manager", "stocker"], handleReceive);
export const PATCH = requireRole(["admin", "manager", "stocker"], handleReceive);
