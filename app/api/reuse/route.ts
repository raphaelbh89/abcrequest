import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

// GET /api/reuse - Lấy danh sách thu hồi tái sử dụng & thống kê ngân sách tiết kiệm
export const GET = requireRole(
  ["admin", "manager", "stocker", "teacher"],
  async (req: NextRequest, user) => {
    try {
      const url = new URL(req.url);
      const search = url.searchParams.get("search") || "";
      const condition = url.searchParams.get("condition") || "";

      const whereClause: any = {};

      if (user.role === "teacher") {
        whereClause.returnerId = user.id;
      }

      if (condition) {
        whereClause.condition = condition;
      }

      if (search) {
        whereClause.OR = [
          { code: { contains: search } },
          { returnerName: { contains: search } },
          { item: { name: { contains: search } } },
          { note: { contains: search } },
        ];
      }

      const returns = await prisma.reuseReturn.findMany({
        where: whereClause,
        include: {
          item: {
            select: { id: true, name: true, unit: true, category: true, price: true, imageUrl: true },
          },
          returnerUser: {
            select: { id: true, fullName: true, username: true, role: true },
          },
          receivedUser: {
            select: { id: true, fullName: true, username: true, role: true },
          },
          disbursement: {
            select: { id: true, code: true, request: { select: { id: true, purpose: true } } },
          },
        },
        orderBy: { returnedAt: "desc" },
      });

      // Tính toán các chỉ số thống kê
      const totalReturnsCount = returns.length;
      let totalItemsReused = 0;
      let totalEstimatedSavings = 0;
      const conditionCounts = {
        tot: 0,
        kha: 0,
        trung_binh: 0,
      };

      for (const r of returns) {
        totalItemsReused += r.returnedQty;
        totalEstimatedSavings += r.estimatedSavings || 0;
        if (r.condition in conditionCounts) {
          conditionCounts[r.condition as keyof typeof conditionCounts] += r.returnedQty;
        }
      }

      return NextResponse.json({
        success: true,
        stats: {
          totalReturnsCount,
          totalItemsReused,
          totalEstimatedSavings,
          conditionCounts,
        },
        returns,
      });
    } catch (error: any) {
      console.error("GET /api/reuse error:", error);
      return NextResponse.json(
        { error: error?.message || "Lỗi khi tải dữ liệu tái sử dụng" },
        { status: 500 }
      );
    }
  }
);

// POST /api/reuse - Nhập lại đồ dùng tái sử dụng vào kho (hỗ trợ nhập 1 hoặc nhiều món cùng lúc)
export const POST = requireRole(
  ["admin", "manager", "stocker"],
  async (req: NextRequest, user) => {
    try {
      const body = await req.json();
      const {
        disbursementId = null,
        returnerId = null,
        returnerName = "",
        note = "",
        condition = "tot",
        items = [], // Mảng các món tái sử dụng: [{ itemId, disbursementItemId, returnedQty, condition, note }]
        // Hỗ trợ đơn lẻ cho backward compatibility
        itemId,
        returnedQty,
        disbursementItemId,
      } = body;

      // Chuẩn hóa danh sách items cần xử lý
      let rawItems: any[] = [];
      if (Array.isArray(items) && items.length > 0) {
        rawItems = items;
      } else if (itemId && returnedQty) {
        rawItems = [{
          itemId,
          disbursementItemId: disbursementItemId || null,
          returnedQty,
          condition: condition || "tot",
          note: note || "",
        }];
      }

      const validItems = rawItems.filter(
        (it) => it.itemId && parseInt(it.returnedQty, 10) > 0
      );

      if (validItems.length === 0) {
        return NextResponse.json(
          { error: "Vui lòng nhập số lượng tái sử dụng lớn hơn 0 cho ít nhất 1 món đồ dùng" },
          { status: 400 }
        );
      }

      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const countToday = await prisma.reuseReturn.count({
        where: {
          code: { startsWith: `TSD-${todayStr}` },
        },
      });

      const results = await prisma.$transaction(async (tx) => {
        const createdRecords = [];
        let seq = countToday + 1;

        for (const it of validItems) {
          const qty = parseInt(it.returnedQty, 10);
          const itemCond = it.condition || condition || "tot";
          const itemNote = it.note || note || "";

          const dbItem = await tx.item.findUnique({
            where: { id: it.itemId },
          });

          if (!dbItem) continue;

          const code = `TSD-${todayStr}-${String(seq++).padStart(3, "0")}`;
          const estimatedSavings = (dbItem.price || 0) * qty;
          const conditionLabel =
            itemCond === "tot" ? "Tốt (90-100%)" : itemCond === "kha" ? "Khá (70-80%)" : "Trung bình (50-60%)";

          // 1. Tạo phiếu thu hồi tái sử dụng
          const createdReturn = await tx.reuseReturn.create({
            data: {
              code,
              disbursementId: disbursementId || null,
              itemId: it.itemId,
              returnedQty: qty,
              condition: itemCond,
              returnerId: returnerId || null,
              returnerName: returnerName || "Giáo viên hoàn trả",
              receivedBy: user.id,
              estimatedSavings,
              note: itemNote || `Thu hồi tái sử dụng ${dbItem.name} (${conditionLabel})`,
            },
          });

          // 2. Tăng tồn kho thực tế
          await tx.item.update({
            where: { id: it.itemId },
            data: {
              quantity: { increment: qty },
            },
          });

          // 3. Ghi lịch sử giao dịch kho
          await tx.stockTransaction.create({
            data: {
              itemId: it.itemId,
              type: "nhap_tai_su_dung",
              quantityChange: qty,
              referenceId: createdReturn.id,
              performedBy: user.id,
              note: `Nhập tái sử dụng (${code}) - ${returnerName || "Giáo viên"}: +${qty} ${dbItem.unit} [${conditionLabel}]`,
            },
          });

          // 4. Nếu có liên kết với DisbursementItem, tăng returnedQty
          if (it.disbursementItemId) {
            await tx.disbursementItem.update({
              where: { id: it.disbursementItemId },
              data: {
                returnedQty: { increment: qty },
              },
            });
          }

          createdRecords.push(createdReturn);
        }

        return createdRecords;
      });

      return NextResponse.json({
        success: true,
        message: `Đã nhập thành công ${results.length} món đồ dùng tái sử dụng vào kho!`,
        count: results.length,
        returns: results,
      });
    } catch (error: any) {
      console.error("POST /api/reuse error:", error);
      return NextResponse.json(
        { error: error?.message || "Lỗi khi nhập đồ dùng tái sử dụng" },
        { status: 500 }
      );
    }
  }
);
