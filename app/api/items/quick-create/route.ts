import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";
import { removeVietnameseTones, inferStationeryUnit } from "@/lib/ai-suggestions";

// POST /api/items/quick-create - Teachers or Admins can quick-create an item with 0 stock
export const POST = requireAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { name, category, unit, minStock } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Tên mặt hàng là bắt buộc" },
        { status: 400 }
      );
    }

    const trimmedName = String(name).trim();
    const cleanName = removeVietnameseTones(trimmedName);

    // Check if an item with exact or same normalized name already exists
    const existingItems = await prisma.item.findMany();
    const existing = existingItems.find(
      (item) => removeVietnameseTones(item.name) === cleanName
    );

    if (existing) {
      return NextResponse.json({
        message: "Mặt hàng đã tồn tại trong danh mục",
        item: existing,
        isNew: false,
      });
    }

    let determinedUnit = unit ? String(unit).trim() : "";
    if (!determinedUnit) {
      determinedUnit = inferStationeryUnit(trimmedName);
    }

    // Create item with stock = 0
    const newItem = await prisma.item.create({
      data: {
        name: trimmedName,
        category: category === "ngoai_khoa" ? "ngoai_khoa" : "hoc_tap",
        unit: determinedUnit,
        quantity: 0,
        minStock: parseInt(minStock || "5", 10),
      },
    });

    return NextResponse.json({
      message: "Tạo mặt hàng mới thành công với tồn kho = 0",
      item: newItem,
      isNew: true,
    });
  } catch (error) {
    console.error("POST /api/items/quick-create error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi tạo mặt hàng mới" },
      { status: 500 }
    );
  }
});
