import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth-guards";
import { computeAvailableStock } from "@/lib/allocation";
import { normalizeVietnamese } from "@/lib/search";

// GET /api/items - Anyone logged in can view items with real-time available & reserved quantities
export const GET = requireAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const lowStock = searchParams.get("lowStock") === "true";

    const whereClause: any = {};

    if (search.trim()) {
      whereClause.name = {
        contains: search.trim(),
      };
    }

    if (category && category !== "all") {
      whereClause.category = category;
    }

    const items = await prisma.item.findMany({
      where: whereClause,
      include: {
        requestItems: {
          where: {
            request: {
              status: "pending",
            },
            status: "approved", // Only count approved line items
          },
          select: {
            allocatedQty: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enrichedItems = items.map((item) => {
      const pendingAllocatedQty = item.requestItems.reduce(
        (sum, ri) => sum + (ri.allocatedQty || 0),
        0
      );
      const availableQuantity = computeAvailableStock(item.quantity, pendingAllocatedQty);

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        quantity: item.quantity, // Physical stock in warehouse
        pendingAllocatedQty,     // Held for pending requests
        availableQuantity,       // Real available stock
        minStock: item.minStock,
        price: item.price,
        location: item.location,
        imageUrl: item.imageUrl,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    // Filter low stock if requested (availableQuantity < minStock or quantity < minStock)
    const filteredItems = lowStock
      ? enrichedItems.filter((item) => item.availableQuantity < item.minStock || item.quantity < item.minStock)
      : enrichedItems;

    return NextResponse.json({ items: filteredItems });
  } catch (error) {
    console.error("GET /api/items error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi tải danh sách đồ dùng" },
      { status: 500 }
    );
  }
});

// POST /api/items - Admin, Manager, and Stocker can create items
export const POST = requireRole(["admin", "manager", "stocker"], async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { name, category, unit, quantity, minStock, price, location, imageUrl } = body;

    if (!name || !category || !unit) {
      return NextResponse.json(
        { error: "Tên đồ dùng, loại và đơn vị tính là bắt buộc" },
        { status: 400 }
      );
    }

    const qty = Math.max(0, parseInt(quantity || "0", 10));
    const minStk = Math.max(0, parseInt(minStock || "0", 10));
    const prc = price !== undefined && price !== null && price !== "" ? parseFloat(price) : null;

    const newItem = await prisma.$transaction(async (tx) => {
      const trimmedName = String(name).trim();
      const item = await tx.item.create({
        data: {
          name: trimmedName,
          nameNormalized: normalizeVietnamese(trimmedName),
          category: String(category).trim(),
          unit: String(unit).trim(),
          quantity: qty,
          minStock: minStk,
          price: prc,
          location: location ? String(location).trim() : null,
          imageUrl: imageUrl ? String(imageUrl).trim() : null,
        },
      });

      if (qty > 0) {
        await tx.stockTransaction.create({
          data: {
            itemId: item.id,
            type: "nhap_kho",
            quantityChange: qty,
            referenceId: item.id,
            performedBy: user.id,
            note: "Khởi tạo mặt hàng mới vào hệ thống",
          },
        });
      }

      return item;
    });

    return NextResponse.json({
      message: "Thêm mặt hàng mới thành công",
      item: newItem,
    });
  } catch (error) {
    console.error("POST /api/items error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi thêm mặt hàng mới" },
      { status: 500 }
    );
  }
});
