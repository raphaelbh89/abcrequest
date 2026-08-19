import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";
import { computeAvailableStock } from "@/lib/allocation";

// GET /api/items/availability - Real-time available stock for all items
export const GET = requireAuth(async () => {
  try {
    const items = await prisma.item.findMany({
      orderBy: { name: "asc" },
    });

    // Sum allocated_qty for pending requests per item
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

    const itemsAvailability = items.map((item) => {
      const pendingAllocatedQty = pendingMap.get(item.id) || 0;
      const availableQuantity = computeAvailableStock(item.quantity, pendingAllocatedQty);

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        quantity: item.quantity, // Physical stock
        pendingAllocatedQty,    // Currently reserved by pending requests
        availableQuantity,      // Real-time available for new requests
        minStock: item.minStock,
        price: item.price,
        location: item.location,
      };
    });

    return NextResponse.json({ items: itemsAvailability });
  } catch (error) {
    console.error("GET /api/items/availability error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi kiểm tra tồn kho khả dụng" },
      { status: 500 }
    );
  }
});
