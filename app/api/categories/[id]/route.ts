import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";

// PATCH /api/categories/[id] - Admin updates category
export const PATCH = requireRole("admin", async (req: NextRequest, _user, context: any) => {
  try {
    const params = await context.params;
    const { id } = params;
    const body = await req.json();
    const { name, description, color, sortOrder } = body;

    const existing = await prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Không tìm thấy danh mục đồ dùng" },
        { status: 404 }
      );
    }

    const data: any = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description ? description.trim() : null;
    if (color !== undefined) data.color = color;
    if (typeof sortOrder === "number") data.sortOrder = sortOrder;

    const updated = await prisma.category.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      message: "Cập nhật danh mục thành công",
      category: updated,
    });
  } catch (error) {
    console.error("PATCH /api/categories/[id] error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi cập nhật danh mục" },
      { status: 500 }
    );
  }
});

// DELETE /api/categories/[id] - Admin deletes category
export const DELETE = requireRole("admin", async (_req: NextRequest, _user, context: any) => {
  try {
    const params = await context.params;
    const { id } = params;

    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Không tìm thấy danh mục đồ dùng" },
        { status: 404 }
      );
    }

    if (category.isDefault) {
      return NextResponse.json(
        { error: "Không thể xóa danh mục mặc định của hệ thống" },
        { status: 400 }
      );
    }

    // Check if any items belong to this category code
    const itemsCount = await prisma.item.count({
      where: { category: category.code },
    });

    if (itemsCount > 0) {
      return NextResponse.json(
        {
          error: `Không thể xóa danh mục này vì đang có ${itemsCount} mặt hàng đồ dùng trong kho đang thuộc danh mục.`,
        },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Đã xóa danh mục đồ dùng thành công",
    });
  } catch (error) {
    console.error("DELETE /api/categories/[id] error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi xóa danh mục" },
      { status: 500 }
    );
  }
});
