import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";

export interface NotificationItem {
  id: string;
  type: "new_request" | "request_approved" | "request_rejected" | "item_rejected" | "low_stock" | "stock_received";
  title: string;
  message: string;
  timestamp: string;
  link: string;
}

// GET /api/notifications - Real-time notifications for the current user
export const GET = requireAuth(async (_req: NextRequest, user) => {
  try {
    const notifications: NotificationItem[] = [];

    if (user.role === "teacher") {
      // 1. Fetch user's decided requests (approved / rejected)
      const userRequests = await prisma.request.findMany({
        where: {
          requesterId: user.id,
          status: { in: ["approved", "rejected"] },
        },
        orderBy: { decidedAt: "desc" },
        take: 10,
        include: {
          decidedByUser: true,
          requestItems: {
            include: { item: true },
          },
        },
      });

      userRequests.forEach((req) => {
        const timeStr = (req.decidedAt || req.createdAt).toISOString();
        if (req.status === "approved") {
          const rejectedItems = req.requestItems.filter((ri) => ri.status === "rejected");
          if (rejectedItems.length > 0 || req.rejectReason) {
            notifications.push({
              id: `req-app-rej-${req.id}`,
              type: "item_rejected",
              title: "Đơn đã duyệt (Có món bị từ chối)",
              message: req.rejectReason
                ? `${req.rejectReason} (Đơn: "${req.purpose}")`
                : `Yêu cầu "${req.purpose}" đã duyệt nhưng có ${rejectedItems.length} món bị loại bỏ.`,
              timestamp: timeStr,
              link: `/requests/${req.id}`,
            });
          } else {
            notifications.push({
              id: `req-app-${req.id}`,
              type: "request_approved",
              title: "Yêu cầu đã được phê duyệt",
              message: `Quản lý đã duyệt cấp đồ dùng cho hoạt động "${req.purpose}".`,
              timestamp: timeStr,
              link: `/requests/${req.id}`,
            });
          }
        } else if (req.status === "rejected") {
          notifications.push({
            id: `req-rej-${req.id}`,
            type: "request_rejected",
            title: "Yêu cầu đã bị từ chối",
            message: `Yêu cầu "${req.purpose}" bị từ chối. Lý do: ${req.rejectReason || "Không đạt yêu cầu"}`,
            timestamp: timeStr,
            link: `/requests/${req.id}`,
          });
        }
      });

      // 2. Fetch received purchase proposals related to teacher's requests
      const receivedProposals = await prisma.purchaseProposal.findMany({
        where: {
          status: "da_nhap_kho",
          sourceRequest: {
            requesterId: user.id,
          },
        },
        orderBy: { resolvedAt: "desc" },
        take: 5,
        include: {
          item: true,
          sourceRequest: true,
        },
      });

      receivedProposals.forEach((p) => {
        notifications.push({
          id: `prop-rec-${p.id}`,
          type: "stock_received",
          title: "Đồ dùng đặt mua đã nhập kho",
          message: `Món "${p.item.name}" (SL: ${p.receivedQty} ${p.item.unit}) cho hoạt động "${p.sourceRequest.purpose}" đã về kho!`,
          timestamp: (p.resolvedAt || p.createdAt).toISOString(),
          link: `/requests/${p.sourceRequestId}`,
        });
      });
    } else {
      // ADMIN NOTIFICATIONS
      // 1. Pending requests waiting for approval
      const pendingRequests = await prisma.request.findMany({
        where: { status: "pending" },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          requester: true,
          requestItems: true,
        },
      });

      pendingRequests.forEach((req) => {
        notifications.push({
          id: `admin-pending-${req.id}`,
          type: "new_request",
          title: "Phiếu yêu cầu mới chờ duyệt",
          message: `${req.requester.fullName} vừa gửi yêu cầu "${req.purpose}" (${req.requestItems.length} món đồ dùng).`,
          timestamp: req.createdAt.toISOString(),
          link: `/requests`,
        });
      });

      // 2. Out of stock / Low stock items
      const lowStockItems = await prisma.item.findMany({
        where: {
          quantity: { lte: prisma.item.fields.minStock },
        },
        orderBy: { quantity: "asc" },
        take: 5,
      });

      lowStockItems.forEach((item) => {
        const isZero = item.quantity === 0;
        notifications.push({
          id: `admin-stock-${item.id}`,
          type: "low_stock",
          title: isZero ? "Cảnh báo hết hàng" : "Cảnh báo sắp hết hàng",
          message: `Mặt hàng "${item.name}" còn ${item.quantity} ${item.unit} (Ngưỡng tối thiểu: ${item.minStock}).`,
          timestamp: item.updatedAt.toISOString(),
          link: `/inventory`,
        });
      });

      // 3. Recently completed proposals
      const completedProposals = await prisma.purchaseProposal.findMany({
        where: { status: "da_nhap_kho" },
        orderBy: { resolvedAt: "desc" },
        take: 5,
        include: { item: true },
      });

      completedProposals.forEach((p) => {
        notifications.push({
          id: `admin-prop-rec-${p.id}`,
          type: "stock_received",
          title: "Nhập kho mua mới hoàn tất",
          message: `Đã nhập kho +${p.receivedQty} ${p.item.unit} cho "${p.item.name}".`,
          timestamp: (p.resolvedAt || p.createdAt).toISOString(),
          link: `/purchase-proposals`,
        });
      });
    }

    // Sort by newest timestamp
    notifications.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({
      notifications: notifications.slice(0, 15),
    });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi tải thông báo" },
      { status: 500 }
    );
  }
});
