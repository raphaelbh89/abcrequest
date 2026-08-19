import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";

// POST /api/items/[id]/stock-in - Admin, Manager, Stocker
export const POST = requireRole(["admin", "manager", "stocker"], async (req: NextRequest, user, context?: any) => {
  try {
    const params = await context?.params;
    const itemId = params?.id;

    if (!itemId) {
      return NextResponse.json({ error: "Mã mặt hàng không hợp lệ" }, { status: 400 });
    }

    const body = await req.json();
    const { addQuantity, note, price } = body;

    const addQty = parseInt(addQuantity, 10);
    if (isNaN(addQty) || addQty <= 0) {
      return NextResponse.json(
        { error: "Số lượng nhập kho phải là số nguyên dương lớn hơn 0" },
        { status: 400 }
      );
    }

    const existingItem = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Mặt hàng không tồn tại" }, { status: 404 });
    }

    // If price is provided and valid, update price; otherwise keep existing price
    let newPrice = existingItem.price;
    if (price !== undefined && price !== null && price !== "" && !isNaN(Number(price)) && Number(price) >= 0) {
      newPrice = Number(price);
    }

    const updatedItem = await prisma.$transaction(async (tx) => {
      const item = await tx.item.update({
        where: { id: itemId },
        data: {
          quantity: { increment: addQty },
          price: newPrice,
        },
      });

      await tx.stockTransaction.create({
        data: {
          itemId: item.id,
          type: "nhap_kho",
          quantityChange: addQty,
          referenceId: item.id,
          performedBy: user.id,
          note: note ? String(note).trim() : "Nhập kho thủ công",
        },
      });

      return item;
    });

    return NextResponse.json({
      message: `Nhập kho thành công +${addQty} ${updatedItem.unit}`,
      item: updatedItem,
    });
  } catch (error) {
    console.error("POST /api/items/[id]/stock-in error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi thực hiện nhập kho" },
      { status: 500 }
    );
  }
});
