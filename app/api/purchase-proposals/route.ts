import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";

// GET /api/purchase-proposals - Admin, Manager, Stocker
export const GET = requireRole(["admin", "manager", "stocker"], async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const whereClause: any = {};
    if (status && status !== "all") {
      whereClause.status = status;
    }

    const proposals = await prisma.purchaseProposal.findMany({
      where: whereClause,
      include: {
        item: true,
        sourceRequest: {
          include: {
            requester: {
              select: { id: true, username: true, fullName: true, role: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group proposals by itemId for aggregated view
    const groupedMap = new Map<string, {
      itemId: string;
      item: any;
      totalQty: number;
      pendingQty: number; // can_mua + da_dat_mua
      proposals: any[];
    }>();

    proposals.forEach((p) => {
      if (!groupedMap.has(p.itemId)) {
        groupedMap.set(p.itemId, {
          itemId: p.itemId,
          item: p.item,
          totalQty: 0,
          pendingQty: 0,
          proposals: [],
        });
      }

      const group = groupedMap.get(p.itemId)!;
      group.totalQty += p.qty;
      if (p.status !== "da_nhap_kho") {
        group.pendingQty += p.qty;
      }
      group.proposals.push(p);
    });

    const grouped = Array.from(groupedMap.values());

    return NextResponse.json({ proposals, grouped });
  } catch (error) {
    console.error("GET /api/purchase-proposals error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi tải danh sách đề xuất mua" },
      { status: 500 }
    );
  }
});
