import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth-guards";

// GET /api/categories - View all active categories
export const GET = requireAuth(async () => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi tải danh mục đồ dùng" },
      { status: 500 }
    );
  }
});

// POST /api/categories - Admin creates a new category
export const POST = requireRole("admin", async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { code, name, description, color, sortOrder } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Tên danh mục là bắt buộc" },
        { status: 400 }
      );
    }

    const generatedCode = (code || name)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    const finalCode = generatedCode || `cat_${Date.now()}`;

    // Check duplicate code
    const existing = await prisma.category.findUnique({
      where: { code: finalCode },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Mã loại đồ dùng hoặc tên danh mục này đã tồn tại" },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        code: finalCode,
        name: name.trim(),
        description: description ? description.trim() : null,
        color: color || "emerald",
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      },
    });

    return NextResponse.json({
      message: "Thêm danh mục đồ dùng mới thành công",
      category,
    });
  } catch (error) {
    console.error("POST /api/categories error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi thêm danh mục" },
      { status: 500 }
    );
  }
});
