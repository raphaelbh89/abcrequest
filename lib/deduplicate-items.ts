import { prisma } from "@/lib/db";
import { normalizeVietnamese } from "@/lib/search";

/**
 * Tự động quét và hợp nhất các mặt hàng bị trùng lặp tên trong kho.
 * - Giữ lại 1 bản ghi chính (primary item).
 * - Cộng dồn toàn bộ số lượng tồn kho của các bản ghi trùng lặp vào bản ghi chính.
 * - Giữ lại đơn giá và hình ảnh mới/đầy đủ nhất.
 * - Cập nhật lại toàn bộ khóa ngoại (RequestItem, PurchaseProposal, StockTransaction, DisbursementItem, ReuseReturn).
 * - Xóa bỏ an toàn các bản ghi thừa.
 */
export async function mergeDuplicateItems(): Promise<{ mergedGroupsCount: number; deletedDuplicatesCount: number }> {
  try {
    const allItems = await prisma.item.findMany({
      orderBy: { createdAt: "asc" },
    });

    // Gom nhóm mặt hàng theo tên chuẩn hóa
    const groupsMap = new Map<string, typeof allItems>();

    for (const item of allItems) {
      const normalizedKey = (item.nameNormalized && item.nameNormalized.trim() !== "")
        ? item.nameNormalized.trim().toLowerCase()
        : normalizeVietnamese(item.name).trim().toLowerCase();

      if (!groupsMap.has(normalizedKey)) {
        groupsMap.set(normalizedKey, []);
      }
      groupsMap.get(normalizedKey)!.push(item);
    }

    let mergedGroupsCount = 0;
    let deletedDuplicatesCount = 0;

    for (const [key, items] of groupsMap.entries()) {
      if (items.length <= 1) continue;

      // Có trùng lặp -> Chọn bản ghi chính (ưu tiên bản ghi có giá/ảnh hoặc được tạo trước)
      const primaryItem = items[0];
      const duplicates = items.slice(1);

      let totalAdditionalQty = 0;
      let resolvedPrice = primaryItem.price;
      let resolvedImage = primaryItem.imageUrl;
      let resolvedLocation = primaryItem.location;

      for (const dup of duplicates) {
        totalAdditionalQty += Math.max(0, dup.quantity);
        if (!resolvedPrice && dup.price) {
          resolvedPrice = dup.price;
        }
        if (!resolvedImage && dup.imageUrl) {
          resolvedImage = dup.imageUrl;
        }
        if (!resolvedLocation && dup.location) {
          resolvedLocation = dup.location;
        }
      }

      await prisma.$transaction(async (tx) => {
        for (const dup of duplicates) {
          // Chuyển toàn bộ liên kết khóa ngoại sang primaryItem
          await tx.requestItem.updateMany({
            where: { itemId: dup.id },
            data: { itemId: primaryItem.id },
          });

          await tx.purchaseProposal.updateMany({
            where: { itemId: dup.id },
            data: { itemId: primaryItem.id },
          });

          await tx.stockTransaction.updateMany({
            where: { itemId: dup.id },
            data: { itemId: primaryItem.id },
          });

          await tx.disbursementItem.updateMany({
            where: { itemId: dup.id },
            data: { itemId: primaryItem.id },
          });

          await tx.reuseReturn.updateMany({
            where: { itemId: dup.id },
            data: { itemId: primaryItem.id },
          });

          // Xóa bản ghi trùng thừa
          await tx.item.delete({
            where: { id: dup.id },
          });

          deletedDuplicatesCount++;
        }

        // Cập nhật bản ghi chính với số lượng cộng dồn và giá/ảnh tốt nhất
        await tx.item.update({
          where: { id: primaryItem.id },
          data: {
            nameNormalized: key,
            quantity: { increment: totalAdditionalQty },
            price: resolvedPrice,
            imageUrl: resolvedImage,
            location: resolvedLocation,
          },
        });
      });

      mergedGroupsCount++;
    }

    return { mergedGroupsCount, deletedDuplicatesCount };
  } catch (error) {
    console.error("Auto deduplicate items error:", error);
    return { mergedGroupsCount: 0, deletedDuplicatesCount: 0 };
  }
}
