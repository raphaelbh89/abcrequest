import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { normalizeVietnamese } from "@/lib/search";
import { resolveExternalThumbnail } from "@/lib/external-search";

export const POST = requireRole(["admin", "manager", "stocker"], async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { items, duplicateMode = "accumulate", priceUpdateMode = "update_from_file", fileName } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Danh sách mặt hàng nhập kho trống" },
        { status: 400 }
      );
    }

    let createdCount = 0;
    let updatedCount = 0;
    let priceUpdatedCount = 0;
    let skippedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const name = String(item.name || "").trim();
        if (!name || name.length < 2) continue;

        const norm = normalizeVietnamese(name);
        const quantity = Math.max(0, parseInt(item.quantity, 10) || 0);
        const unit = String(item.unit || "cái").trim();
        const category = String(item.category || "hoc_tap").trim();
        const price = item.price ? parseFloat(item.price) : null;
        const location = item.location ? String(item.location).trim() : null;
        const minStock = parseInt(item.minStock, 10) || 5;
        const imageUrl = item.imageUrl || resolveExternalThumbnail(name, name, null);

        // 1. Kiểm tra mặt hàng đã có trong kho chưa
        const existing = await tx.item.findFirst({
          where: {
            OR: [
              { name: { equals: name } },
              { nameNormalized: { equals: norm } },
              item.existingId ? { id: item.existingId } : { id: "non-existent" },
            ],
          },
        });

        if (existing) {
          if (duplicateMode === "skip") {
            skippedCount++;
            continue;
          }

          let newQty = existing.quantity;
          let qtyChange = 0;

          if (duplicateMode === "accumulate") {
            newQty = existing.quantity + quantity;
            qtyChange = quantity;
          } else if (duplicateMode === "overwrite") {
            qtyChange = quantity - existing.quantity;
            newQty = quantity;
          } else if (duplicateMode === "price_only") {
            // Chỉ cập nhật giá, không thay đổi số lượng tồn kho
            newQty = existing.quantity;
            qtyChange = 0;
          }

          // Quyết định đơn giá cuối cùng
          let finalPrice = existing.price;
          if (priceUpdateMode === "update_from_file" && price !== null) {
            if (existing.price !== price) priceUpdatedCount++;
            finalPrice = price;
          } else if (priceUpdateMode === "keep_old") {
            finalPrice = existing.price ?? price;
          } else if (price !== null) {
            finalPrice = price;
          }

          const updated = await tx.item.update({
            where: { id: existing.id },
            data: {
              quantity: newQty,
              unit: unit || existing.unit,
              category: category || existing.category,
              price: finalPrice,
              location: location || existing.location,
              imageUrl: existing.imageUrl || imageUrl,
            },
          });

          // Ghi lịch sử giao dịch kho
          if (qtyChange !== 0) {
            await tx.stockTransaction.create({
              data: {
                itemId: updated.id,
                type: qtyChange > 0 ? "nhap_kho" : "dieu_chinh",
                quantityChange: qtyChange,
                performedBy: user.id,
                note: `Import từ file (${fileName || "Danh sách hàng"}): ${
                  duplicateMode === "accumulate"
                    ? `Cộng thêm +${quantity}`
                    : `Ghi đè tồn ${newQty}`
                }${priceUpdateMode === "update_from_file" && price !== null ? ` | Cập nhật giá mới: ${price.toLocaleString("vi-VN")} đ` : ""}`,
              },
            });
          }

          updatedCount++;
        } else {
          // 2. Tạo mặt hàng mới hoàn toàn
          const created = await tx.item.create({
            data: {
              name,
              nameNormalized: norm,
              category,
              unit,
              quantity,
              minStock,
              price,
              location,
              imageUrl,
            },
          });

          // Ghi lịch sử nhập kho ban đầu
          if (quantity > 0) {
            await tx.stockTransaction.create({
              data: {
                itemId: created.id,
                type: "nhap_kho",
                quantityChange: quantity,
                performedBy: user.id,
                note: `Tạo mới và nhập kho từ file Excel (${fileName || "Danh sách hàng hóa"})`,
              },
            });
          }

          createdCount++;
        }
      }
    });

    return NextResponse.json({
      success: true,
      count: createdCount + updatedCount,
      createdCount,
      updatedCount,
      skippedCount,
      message: `Đã nhập thành công ${createdCount + updatedCount} mặt hàng (Tạo mới: ${createdCount}, Cập nhật tồn: ${updatedCount}).`,
    });
  } catch (error: any) {
    console.error("POST /api/items/import error:", error);
    return NextResponse.json(
      { error: error?.message || "Lỗi hệ thống khi lưu danh sách hàng nhập kho" },
      { status: 500 }
    );
  }
});
