import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";

// GET /api/dashboard/stats - Real-time stats & recent top-5 lists
export const GET = requireAuth(async () => {
  try {
    const allItems = await prisma.item.findMany({
      include: {
        requestItems: {
          where: {
            request: { status: "pending" },
            status: "approved",
          },
          select: { allocatedQty: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enrichedItems = allItems.map((item) => {
      const pendingHold = item.requestItems.reduce((sum, ri) => sum + (ri.allocatedQty || 0), 0);
      const availableQuantity = Math.max(0, item.quantity - pendingHold);
      return {
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        quantity: item.quantity, // Physical stock
        pendingHold,             // Held for pending requests
        availableQuantity,       // Real available
        minStock: item.minStock,
        location: item.location,
      };
    });

    const totalItems = enrichedItems.length;
    const lowStockItems = enrichedItems.filter(
      (i) => i.availableQuantity < i.minStock || i.quantity < i.minStock
    );
    const lowStockCount = lowStockItems.length;

    const pendingRequestsCount = await prisma.request.count({
      where: { status: "pending" },
    });

    const unprocessedProposalsCount = await prisma.purchaseProposal.count({
      where: { status: { not: "da_nhap_kho" } },
    });

    // Top 5 low stock items (sorted by largest available deficit)
    const recentLowStockItems = [...lowStockItems]
      .sort((a, b) => (b.minStock - b.availableQuantity) - (a.minStock - a.availableQuantity))
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        quantity: item.availableQuantity, // Show available quantity on low stock list
        physicalQuantity: item.quantity,
        pendingHold: item.pendingHold,
        minStock: item.minStock,
        location: item.location,
      }));

    // Top 5 recent pending requests
    const recentPendingRequests = await prisma.request.findMany({
      where: { status: "pending" },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        requester: {
          select: { id: true, username: true, fullName: true },
        },
        _count: {
          select: { requestItems: true },
        },
      },
    });

    return NextResponse.json({
      stats: {
        totalItems,
        lowStockCount,
        pendingRequestsCount,
        unprocessedProposalsCount,
      },
      recentLowStockItems,
      recentPendingRequests: recentPendingRequests.map((r) => ({
        id: r.id,
        purpose: r.purpose,
        neededDate: r.neededDate,
        createdAt: r.createdAt,
        requesterName: r.requester.fullName,
        itemCount: r._count.requestItems,
      })),
    });
  } catch (error) {
    console.error("GET /api/dashboard/stats error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi tải dữ liệu trang Dashboard" },
      { status: 500 }
    );
  }
});
