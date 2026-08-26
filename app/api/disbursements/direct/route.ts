import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

// POST /api/disbursements/direct - Quản lý, Thủ kho tạo phiếu cấp phát trực tiếp đồ dùng có sẵn trong kho
export const POST = requireRole(
  ["admin", "manager", "stocker"],
  async (req: NextRequest, user) => {
    try {
      const body = await req.json();
      const { recipientId, purpose, themeId, items, note } = body;

      if (!recipientId) {
        return NextResponse.json(
          { error: "Vui lòng chọn người nhận đồ dùng (Giáo viên / Nhân viên)" },
          { status: 400 }
        );
      }

      if (!purpose || !purpose.trim()) {
        return NextResponse.json(
          { error: "Vui lòng nhập mục đích / chủ đề cấp phát" },
          { status: 400 }
        );
      }

      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { error: "Vui lòng chọn ít nhất 1 mặt hàng để cấp phát" },
          { status: 400 }
        );
      }

      // Kiểm tra người nhận
      const recipient = await prisma.user.findUnique({
        where: { id: recipientId },
      });

      if (!recipient) {
        return NextResponse.json(
          { error: "Tài khoản người nhận không tồn tại" },
          { status: 404 }
        );
      }

      // Lọc và kiểm tra các mặt hàng hợp lệ
      const validItems = items
        .map((it: any) => ({
          itemId: String(it.itemId || "").trim(),
          disbursedQty: parseInt(it.disbursedQty, 10) || 0,
          isReusable: it.isReusable !== false,
        }))
        .filter((it: any) => it.itemId && it.disbursedQty > 0);

      if (validItems.length === 0) {
        return NextResponse.json(
          { error: "Số lượng cấp phát của tất cả đồ dùng phải lớn hơn 0" },
          { status: 400 }
        );
      }

      // Kiểm tra tồn kho vật lý của từng mặt hàng
      const itemIds = validItems.map((i: any) => i.itemId);
      const dbItems = await prisma.item.findMany({
        where: { id: { in: itemIds } },
      });

      const itemMap = new Map(dbItems.map((i) => [i.id, i]));

      for (const it of validItems) {
        const dbItem = itemMap.get(it.itemId);
        if (!dbItem) {
          return NextResponse.json(
            { error: `Mặt hàng (ID: ${it.itemId}) không tồn tại trong danh mục kho` },
            { status: 400 }
          );
        }

        if (dbItem.quantity < it.disbursedQty) {
          return NextResponse.json(
            {
              error: `Mặt hàng "${dbItem.name}" hiện chỉ còn ${dbItem.quantity} ${dbItem.unit} trong kho, không đủ để cấp phát ${it.disbursedQty} ${dbItem.unit}.`,
            },
            { status: 400 }
          );
        }
      }

      // Thực thi tạo phiếu cấp phát trực tiếp trong Transaction an toàn
      const disbursement = await prisma.$transaction(async (tx) => {
        // 1. Trừ tồn kho vật lý của các mặt hàng
        for (const it of validItems) {
          await tx.item.update({
            where: { id: it.itemId },
            data: {
              quantity: { decrement: it.disbursedQty },
            },
          });
        }

        // 2. Tự động tạo phiếu Request đã duyệt (để lưu vết lịch sử & liên kết biên bản)
        const createdRequest = await tx.request.create({
          data: {
            requesterId: recipient.id,
            purpose: purpose.trim(),
            neededDate: new Date(),
            status: "approved",
            disbursementStatus: "da_cap_phat",
            decidedAt: new Date(),
            decidedBy: user.id,
            themeId: themeId || null,
            note: note?.trim() || "Cấp phát trực tiếp đồ dùng có sẵn trong kho",
          },
        });

        // 3. Tạo các dòng chi tiết RequestItem
        for (const it of validItems) {
          await tx.requestItem.create({
            data: {
              requestId: createdRequest.id,
              itemId: it.itemId,
              requestedQty: it.disbursedQty,
              allocatedQty: it.disbursedQty,
              shortfallQty: 0,
              status: "approved",
            },
          });
        }

        // 4. Sinh mã phiếu cấp phát duy nhất CP-YYYYMMDD-XXX
        const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const countToday = await tx.disbursement.count({
          where: {
            code: { startsWith: `CP-${todayStr}` },
          },
        });
        const code = `CP-${todayStr}-${String(countToday + 1).padStart(3, "0")}`;

        // 5. Tạo bản ghi Disbursement
        const createdDisbursement = await tx.disbursement.create({
          data: {
            code,
            requestId: createdRequest.id,
            recipientId: recipient.id,
            disbursedBy: user.id,
            status: "completed",
            note: note?.trim() || `Cấp phát trực tiếp đồ dùng cho: "${purpose.trim()}"`,
          },
        });

        // 6. Tạo chi tiết DisbursementItem và ghi nhật ký StockTransaction
        for (const it of validItems) {
          const dbItem = itemMap.get(it.itemId)!;

          await tx.disbursementItem.create({
            data: {
              disbursementId: createdDisbursement.id,
              itemId: dbItem.id,
              itemName: dbItem.name,
              itemUnit: dbItem.unit,
              disbursedQty: it.disbursedQty,
              isReusable: it.isReusable !== false,
            },
          });

          await tx.stockTransaction.create({
            data: {
              itemId: dbItem.id,
              type: "xuat_kho_cap_phat",
              quantityChange: -it.disbursedQty,
              referenceId: createdDisbursement.id,
              performedBy: user.id,
              note: `Cấp phát trực tiếp (${code}) cho ${recipient.fullName}: "${purpose.trim()}"`,
            },
          });
        }

        // 7. Lấy đầy đủ thông tin để trả về cho Frontend hiển thị biên bản
        return await tx.disbursement.findUnique({
          where: { id: createdDisbursement.id },
          include: {
            recipient: {
              select: { id: true, fullName: true, username: true, role: true },
            },
            disbursedUser: {
              select: { id: true, fullName: true, username: true, role: true },
            },
            request: {
              select: { id: true, purpose: true, neededDate: true, status: true },
            },
            items: {
              include: {
                item: {
                  select: { id: true, name: true, unit: true, imageUrl: true, price: true },
                },
              },
            },
            reuseReturns: true,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: `Tạo phiếu cấp phát trực tiếp ${disbursement?.code} thành công!`,
        disbursement,
      });
    } catch (error: any) {
      console.error("POST /api/disbursements/direct error:", error);
      return NextResponse.json(
        { error: error?.message || "Lỗi khi tạo phiếu cấp phát trực tiếp" },
        { status: 500 }
      );
    }
  }
);
