import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guards";
import { parseUniversalInventoryBuffer } from "@/lib/excel-import";
import { prisma } from "@/lib/db";
import { normalizeVietnamese } from "@/lib/search";

export const POST = requireRole(["admin", "manager", "stocker"], async (req: NextRequest) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Vui lòng chọn file Word (.docx) hoặc Excel (.xlsx, .csv) để tải lên" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const parseResult = await parseUniversalInventoryBuffer(arrayBuffer, file.name);

    // Kiểm tra các món hàng đã tồn tại trong kho CSDL
    const existingItems = await prisma.item.findMany({
      select: { id: true, name: true, nameNormalized: true, quantity: true, unit: true, price: true, category: true },
    });

    const existingMap = new Map<string, typeof existingItems[0]>();
    existingItems.forEach((item) => {
      const norm = item.nameNormalized || normalizeVietnamese(item.name);
      existingMap.set(norm, item);
    });

    const enrichedItems = parseResult.items.map((item) => {
      const norm = normalizeVietnamese(item.name);
      const existing = existingMap.get(norm);

      const hasPriceChange = Boolean(
        existing &&
        item.price !== null &&
        existing.price !== null &&
        Math.abs(item.price - existing.price) > 0.01
      );

      return {
        ...item,
        isExisting: Boolean(existing),
        existingId: existing?.id || null,
        existingQuantity: existing?.quantity ?? 0,
        existingUnit: existing?.unit || null,
        existingPrice: existing?.price ?? null,
        priceChanged: hasPriceChange,
        priceDiff: existing && item.price !== null && existing.price !== null ? item.price - existing.price : null,
      };
    });

    return NextResponse.json({
      success: true,
      departmentOrPurpose: parseResult.departmentOrPurpose,
      targetCategory: parseResult.targetCategory,
      totalRows: parseResult.totalRows,
      validRows: parseResult.validRows,
      invalidRows: parseResult.invalidRows,
      items: enrichedItems,
    });
  } catch (error: any) {
    console.error("POST /api/items/import/parse error:", error);
    return NextResponse.json(
      { error: error?.message || "Không thể đọc và phân tích file Excel này. Vui lòng kiểm tra định dạng." },
      { status: 400 }
    );
  }
});
