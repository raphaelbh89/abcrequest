import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";

// PATCH /api/requests/[id]/approve - Admin and Manager only
// Cho phép Admin và Quản lý (Manager) xét duyệt yêu cầu
export const PATCH = requireRole(["admin", "manager"], async (req: NextRequest, user, context?: any) => {
  try {
    const params = await context?.params;
    const requestId = params?.id;

    if (!requestId) {
      return NextResponse.json({ error: "Mã yêu cầu không hợp lệ" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { rejectedItemIds = [] } = body; // Array of requestItem.id or itemId to reject

    const targetRequest = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        requestItems: {
          include: { item: true },
        },
      },
    });

    if (!targetRequest) {
      return NextResponse.json({ error: "Yêu cầu không tồn tại" }, { status: 404 });
    }

    if (targetRequest.status !== "pending") {
      return NextResponse.json(
        { error: "Chỉ có thể duyệt các yêu cầu đang ở trạng thái Chờ duyệt (pending)" },
        { status: 400 }
      );
    }

    const rejectedItemNames: string[] = [];

    // Execute approval inside a database transaction
    const approvedRequest = await prisma.$transaction(async (tx) => {
      for (const itemLine of targetRequest.requestItems) {
        const itemId = itemLine.itemId;
        const isRejected =
          rejectedItemIds.includes(itemLine.id) ||
          rejectedItemIds.includes(itemId);

        if (isRejected) {
          // 1. Mark this specific item as rejected
          rejectedItemNames.push(itemLine.item.name);
          await tx.requestItem.update({
            where: { id: itemLine.id },
            data: {
              status: "rejected",
              allocatedQty: 0,
              shortfallQty: 0,
            },
          });
          // Do NOT deduct physical stock, do NOT create purchase proposal
          continue;
        }

        // 2. Mark as approved
        await tx.requestItem.update({
          where: { id: itemLine.id },
          data: {
            status: "approved",
          },
        });

        const allocatedQty = itemLine.allocatedQty;
        const shortfallQty = itemLine.shortfallQty;

        // Deduct physical stock if allocatedQty > 0
        if (allocatedQty > 0) {
          await tx.item.update({
            where: { id: itemId },
            data: {
              quantity: { decrement: allocatedQty },
            },
          });

          // Write audit log in stock_transactions
          await tx.stockTransaction.create({
            data: {
              itemId: itemId,
              type: "xuat_kho_duyet_yc",
              quantityChange: -allocatedQty,
              referenceId: targetRequest.id,
              performedBy: user.id,
              note: `Xuất kho duyệt yêu cầu: "${targetRequest.purpose}"`,
            },
          });
        }

        // Insert purchase_proposal if shortfallQty > 0
        if (shortfallQty > 0) {
          await tx.purchaseProposal.create({
            data: {
              itemId: itemId,
              qty: shortfallQty,
              sourceRequestId: targetRequest.id,
              status: "can_mua",
              receivedQty: 0,
            },
          });
        }
      }

      // 3. Update request with approval and notification notes if any items were rejected
      let decisionNote = targetRequest.rejectReason;
      if (rejectedItemNames.length > 0) {
        decisionNote = `Quản lý đã duyệt đơn nhưng từ chối cấp các món: ${rejectedItemNames.join(", ")}`;
      }

      return await tx.request.update({
        where: { id: targetRequest.id },
        data: {
          status: "approved",
          decidedAt: new Date(),
          decidedBy: user.id,
          rejectReason: decisionNote,
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
          purchaseProposals: true,
        },
      });
    });

    const successMessage =
      rejectedItemNames.length > 0
        ? `Duyệt yêu cầu thành công (Đã loại bỏ ${rejectedItemNames.length} món: ${rejectedItemNames.join(", ")})`
        : "Duyệt yêu cầu đồ dùng thành công";

    return NextResponse.json({
      message: successMessage,
      request: approvedRequest,
      rejectedItemNames,
    });
  } catch (error) {
    console.error("PATCH /api/requests/[id]/approve error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi thực hiện duyệt yêu cầu" },
      { status: 500 }
    );
  }
});
