import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";
import { computeAvailableStock } from "@/lib/allocation";
import {
  findSimilarInStockItems,
  getAiSupplySuggestions,
  removeVietnameseTones,
  StockItemLookup,
} from "@/lib/ai-suggestions";

// GET /api/items/ai-suggest?query=...
export const GET = requireAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";

    if (!query.trim()) {
      return NextResponse.json({
        query: "",
        exactMatches: [],
        similarInStock: [],
        aiSuggestions: [],
      });
    }

    // 1. Fetch all items with current stock and pending allocations
    const items = await prisma.item.findMany({
      orderBy: { name: "asc" },
    });

    const pendingAllocations = await prisma.requestItem.groupBy({
      by: ["itemId"],
      where: {
        request: {
          status: "pending",
        },
      },
      _sum: {
        allocatedQty: true,
      },
    });

    const pendingMap = new Map<string, number>();
    pendingAllocations.forEach((pa) => {
      pendingMap.set(pa.itemId, pa._sum.allocatedQty || 0);
    });

    const stockItemsLookup: StockItemLookup[] = items.map((item) => {
      const pendingAllocatedQty = pendingMap.get(item.id) || 0;
      const availableQuantity = computeAvailableStock(item.quantity, pendingAllocatedQty);

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        quantity: item.quantity,
        availableQuantity,
      };
    });

    // 2. Exact or substring matches
    const cleanQuery = removeVietnameseTones(query);
    const exactMatches = stockItemsLookup.filter((item) =>
      removeVietnameseTones(item.name).includes(cleanQuery)
    );

    // 3. Similar items in warehouse stock (e.g. searching "giấy a4 trắng" -> finds "Giấy A4 màu thủ công")
    const similarInStock = findSimilarInStockItems(query, stockItemsLookup);

    // 4. AI Catalog smart suggestions with real photographic images & accurate names
    const aiSuggestions = await getAiSupplySuggestions(query, stockItemsLookup);

    return NextResponse.json({
      query,
      exactMatches,
      similarInStock,
      aiSuggestions,
    });
  } catch (error) {
    console.error("GET /api/items/ai-suggest error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi tìm kiếm gợi ý AI" },
      { status: 500 }
    );
  }
});
