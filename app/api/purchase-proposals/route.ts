import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";

// GET /api/purchase-proposals - Admin, Manager, Stocker
export const GET = requireRole(["admin", "manager", "stocker"], async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const themeFilter = searchParams.get("theme");

    const whereClause: any = {};
    if (status && status !== "all") {
      whereClause.status = status;
    }

    if (themeFilter && themeFilter !== "all") {
      whereClause.sourceRequest = {
        purpose: themeFilter,
      };
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
            theme: true,
            requestItems: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // -------------------------------------------------------------
    // 1. Group proposals by Item (Toàn trường)
    // -------------------------------------------------------------
    const groupedMap = new Map<string, {
      itemId: string;
      item: any;
      totalQty: number;
      pendingQty: number; // can_mua + da_dat_mua
      proposals: any[];
    }>();

    proposals.forEach((p) => {
      const itemKey = p.itemId || `proposed-${p.proposedName}`;
      if (!groupedMap.has(itemKey)) {
        groupedMap.set(itemKey, {
          itemId: p.itemId || "",
          item: p.item || {
            name: p.proposedName || "Món đề xuất mới",
            unit: p.proposedUnit || "cái",
            category: "hoc_tap",
            quantity: 0,
          },
          totalQty: 0,
          pendingQty: 0,
          proposals: [],
        });
      }

      const group = groupedMap.get(itemKey)!;
      group.totalQty += p.qty;
      if (p.status !== "da_nhap_kho") {
        group.pendingQty += p.qty;
      }
      group.proposals.push(p);
    });

    const grouped = Array.from(groupedMap.values());

    // -------------------------------------------------------------
    // 2. Group proposals by Theme / Event (Gộp theo Chủ đề & Sự kiện)
    // -------------------------------------------------------------
    const themeMap = new Map<string, {
      theme: string;
      themeId: string | null;
      themeIcon: string;
      totalItemsCount: number;
      totalShortfallQty: number;
      pendingShortfallQty: number;
      estimatedBudget: number;
      requesters: Array<{ id: string; fullName: string }>;
      proposals: any[];
      itemsMap: Map<string, {
        key: string;
        itemId: string | null;
        itemName: string;
        itemUnit: string;
        category: string;
        price: number;
        totalNeededQty: number;
        pendingQty: number;
        estimatedCost: number;
        classes: Array<{
          proposalId: string;
          requesterName: string;
          qty: number;
          status: string;
          neededDate?: string;
        }>;
      }>;
    }>();

    proposals.forEach((p) => {
      const themeName = p.sourceRequest?.purpose?.trim() || "Hoạt động chung";
      const themeIcon = p.sourceRequest?.theme?.icon || "🎯";
      const themeId = p.sourceRequest?.themeId || null;

      if (!themeMap.has(themeName)) {
        themeMap.set(themeName, {
          theme: themeName,
          themeId,
          themeIcon,
          totalItemsCount: 0,
          totalShortfallQty: 0,
          pendingShortfallQty: 0,
          estimatedBudget: 0,
          requesters: [],
          proposals: [],
          itemsMap: new Map(),
        });
      }

      const themeGroup = themeMap.get(themeName)!;
      themeGroup.proposals.push(p);
      themeGroup.totalShortfallQty += p.qty;
      if (p.status !== "da_nhap_kho") {
        themeGroup.pendingShortfallQty += p.qty;
      }

      const reqUser = p.sourceRequest?.requester;
      if (reqUser && !themeGroup.requesters.some((r) => r.id === reqUser.id)) {
        themeGroup.requesters.push({ id: reqUser.id, fullName: reqUser.fullName });
      }

      // Aggregate item inside this theme
      const itemKey = p.itemId || `proposed-${p.proposedName}`;
      const itemName = p.item?.name || p.proposedName || "Món đề xuất mới";
      const itemUnit = p.item?.unit || p.proposedUnit || "cái";
      let itemPrice = p.item?.price || 0;
      if (!itemPrice && p.proposedName) {
        const matchingReqItem = p.sourceRequest?.requestItems?.find(
          (ri: any) => ri.proposedName === p.proposedName
        );
        if (matchingReqItem?.proposedPrice) {
          itemPrice = matchingReqItem.proposedPrice;
        }
      }
      const category = p.item?.category || "hoc_tap";

      if (!themeGroup.itemsMap.has(itemKey)) {
        themeGroup.itemsMap.set(itemKey, {
          key: itemKey,
          itemId: p.itemId || null,
          itemName,
          itemUnit,
          category,
          price: itemPrice,
          totalNeededQty: 0,
          pendingQty: 0,
          estimatedCost: 0,
          classes: [],
        });
      }

      const itemInTheme = themeGroup.itemsMap.get(itemKey)!;
      itemInTheme.totalNeededQty += p.qty;
      if (p.status !== "da_nhap_kho") {
        itemInTheme.pendingQty += p.qty;
      }
      itemInTheme.estimatedCost = itemInTheme.totalNeededQty * itemInTheme.price;

      itemInTheme.classes.push({
        proposalId: p.id,
        requesterName: reqUser?.fullName || "Giáo viên",
        qty: p.qty,
        status: p.status,
        neededDate: p.sourceRequest?.neededDate ? new Date(p.sourceRequest.neededDate).toISOString() : undefined,
      });
    });

    // Finalize theme groups
    const groupedByTheme = Array.from(themeMap.values()).map((tg) => {
      const items = Array.from(tg.itemsMap.values());
      const estimatedBudget = items.reduce((sum, it) => sum + it.estimatedCost, 0);

      return {
        theme: tg.theme,
        themeId: tg.themeId,
        themeIcon: tg.themeIcon,
        totalItemsCount: items.length,
        totalShortfallQty: tg.totalShortfallQty,
        pendingShortfallQty: tg.pendingShortfallQty,
        estimatedBudget,
        requesters: tg.requesters,
        items,
        proposals: tg.proposals,
      };
    });

    // -------------------------------------------------------------
    // 3. Extract unique themes list for filter dropdown
    // -------------------------------------------------------------
    const allProposalsForThemes = await prisma.purchaseProposal.findMany({
      select: {
        sourceRequest: {
          select: {
            purpose: true,
          },
        },
      },
    });

    const themesCountMap = new Map<string, number>();
    allProposalsForThemes.forEach((p) => {
      const name = p.sourceRequest?.purpose?.trim();
      if (name) {
        themesCountMap.set(name, (themesCountMap.get(name) || 0) + 1);
      }
    });

    const themesList = Array.from(themesCountMap.entries()).map(([name, count]) => ({
      name,
      count,
    }));

    return NextResponse.json({
      proposals,
      grouped,
      groupedByTheme,
      themesList,
    });
  } catch (error) {
    console.error("GET /api/purchase-proposals error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi tải danh sách đề xuất mua" },
      { status: 500 }
    );
  }
});
