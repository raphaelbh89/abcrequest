import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";

// PATCH /api/items/[id] - Admin, Manager, Stocker
export const PATCH = requireRole(["admin", "manager", "stocker"], async (req: NextRequest, user, context?: any) => {
  try {
    const params = await context?.params;
    const itemId = params?.id;

    if (!itemId) {
      return NextResponse.json({ error: "Mã mặt hàng không hợp lệ" }, { status: 400 });
    }

    const body = await req.json();
    const { name, category, unit, quantity, minStock, price, location } = body;

    const existingItem = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Mặt hàng không tồn tại" }, { status: 404 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (category !== undefined) updateData.category = String(category).trim();
    if (unit !== undefined) updateData.unit = String(unit).trim();
    if (minStock !== undefined) updateData.minStock = Math.max(0, parseInt(minStock, 10));
    if (price !== undefined) updateData.price = price !== null && price !== "" ? parseFloat(price) : null;
    if (location !== undefined) updateData.location = location ? String(location).trim() : null;

    let qtyDiff = 0;
    if (quantity !== undefined) {
      const newQty = Math.max(0, parseInt(quantity, 10));
      qtyDiff = newQty - existingItem.quantity;
      updateData.quantity = newQty;
    }

    const updatedItem = await prisma.$transaction(async (tx) => {
      const item = await tx.item.update({
        where: { id: itemId },
        data: updateData,
      });

      if (qtyDiff !== 0) {
        await tx.stockTransaction.create({
          data: {
            itemId: item.id,
            type: "dieu_chinh",
            quantityChange: qtyDiff,
            referenceId: item.id,
            performedBy: user.id,
            note: `Điều chỉnh số lượng kho trực tiếp (${qtyDiff > 0 ? "+" : ""}${qtyDiff})`,
          },
        });
      }

      return item;
    });

    return NextResponse.json({
      message: "Cập nhật mặt hàng thành công",
      item: updatedItem,
    });
  } catch (error) {
    console.error("PATCH /api/items/[id] error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi cập nhật mặt hàng" },
      { status: 500 }
    );
  }
});

// DELETE /api/items/[id] - Admin, Manager, Stocker
export const DELETE = requireRole(["admin", "manager", "stocker"], async (_req: NextRequest, _user, context?: any) => {
  try {
    const params = await context?.params;
    const itemId = params?.id;

    if (!itemId) {
      return NextResponse.json({ error: "Mã mặt hàng không hợp lệ" }, { status: 400 });
    }

    const existingItem = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Mặt hàng không tồn tại" }, { status: 404 });
    }

    // Check if item is used in any RequestItem associated with a Request with status='pending'
    const pendingRequestItems = await prisma.requestItem.findFirst({
      where: {
        itemId: itemId,
        request: {
          status: "pending",
        },
      },
      include: {
        request: true,
      },
    });

    if (pendingRequestItems) {
      return NextResponse.json(
        {
          error: `Không thể xóa mặt hàng "${existingItem.name}" vì đang nằm trong các yêu cầu chờ duyệt (Yêu cầu: "${pendingRequestItems.request.purpose}").`,
        },
        { status: 400 }
      );
    }

    // Check if item is used in any active purchase proposals
    const activeProposal = await prisma.purchaseProposal.findFirst({
      where: {
        itemId: itemId,
        status: { in: ["can_mua", "da_dat_mua"] },
      },
    });

    if (activeProposal) {
      return NextResponse.json(
        {
          error: `Không thể xóa mặt hàng "${existingItem.name}" vì đang có đề xuất mua hàng đang xử lý.`,
        },
        { status: 400 }
      );
    }

    // Safe to delete within transaction
    await prisma.$transaction(async (tx) => {
      await tx.purchaseProposal.deleteMany({ where: { itemId } });
      await tx.stockTransaction.deleteMany({ where: { itemId } });
      await tx.requestItem.deleteMany({ where: { itemId } });
      await tx.item.delete({ where: { id: itemId } });
    });

    return NextResponse.json({
      message: `Đã xóa thành công mặt hàng "${existingItem.name}"`,
    });
  } catch (error) {
    console.error("DELETE /api/items/[id] error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi xóa mặt hàng" },
      { status: 500 }
    );
  }
});
