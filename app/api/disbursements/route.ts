import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

// GET /api/disbursements - Lấy danh sách phiếu cấp phát hoặc danh sách yêu cầu chờ cấp phát
export const GET = requireRole(
  ["admin", "manager", "stocker", "teacher"],
  async (req: NextRequest, user) => {
    try {
      const url = new URL(req.url);
      const pendingOnly = url.searchParams.get("pendingOnly") === "true";
      const search = url.searchParams.get("search") || "";

      // 1. Lấy danh sách yêu cầu ĐÃ DUYỆT nhưng CHƯA CẤP PHÁT (hoặc cấp phát 1 phần)
      if (pendingOnly) {
        const whereClause: any = {
          status: "approved",
          disbursementStatus: { not: "da_cap_phat" },
        };

        if (user.role === "teacher") {
          whereClause.requesterId = user.id;
        }

        if (search) {
          whereClause.OR = [
            { purpose: { contains: search } },
            { requester: { fullName: { contains: search } } },
          ];
        }

        const pendingRequests = await prisma.request.findMany({
          where: whereClause,
          include: {
            requester: {
              select: { id: true, fullName: true, username: true, role: true },
            },
            decidedByUser: {
              select: { id: true, fullName: true, username: true },
            },
            requestItems: {
              where: { status: "approved" },
              include: {
                item: {
                  select: { id: true, name: true, unit: true, quantity: true, price: true, category: true, imageUrl: true },
                },
              },
            },
            disbursements: {
              include: {
                items: true,
              },
            },
            purchaseProposals: {
              select: { id: true, status: true, qty: true, receivedQty: true, proposedName: true, itemId: true },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({
          success: true,
          requests: pendingRequests,
        });
      }

      // 2. Lấy danh sách các phiếu cấp phát ĐÃ THỰC HIỆN
      const disbursementWhere: any = {};
      if (user.role === "teacher") {
        disbursementWhere.recipientId = user.id;
      }

      if (search) {
        disbursementWhere.OR = [
          { code: { contains: search } },
          { recipient: { fullName: { contains: search } } },
          { request: { purpose: { contains: search } } },
        ];
      }

      const disbursements = await prisma.disbursement.findMany({
        where: disbursementWhere,
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
          reuseReturns: {
            select: { id: true, code: true, returnedQty: true, returnedAt: true, condition: true },
          },
        },
        orderBy: { disbursedAt: "desc" },
      });

      return NextResponse.json({
        success: true,
        disbursements,
      });
    } catch (error: any) {
      console.error("GET /api/disbursements error:", error);
      return NextResponse.json(
        { error: error?.message || "Lỗi khi tải danh sách cấp phát" },
        { status: 500 }
      );
    }
  }
);

// POST /api/disbursements - Thực hiện cấp phát đồ dùng theo phiếu yêu cầu
export const POST = requireRole(
  ["admin", "manager", "stocker"],
  async (req: NextRequest, user) => {
    try {
      const body = await req.json();
      const { requestId, items, note = "" } = body;

      if (!requestId) {
        return NextResponse.json(
          { error: "Vui lòng cung cấp mã phiếu yêu cầu (requestId)" },
          { status: 400 }
        );
      }

      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { error: "Danh sách đồ dùng cấp phát không được trống" },
          { status: 400 }
        );
      }

      const request = await prisma.request.findUnique({
        where: { id: requestId },
        include: {
          requester: true,
          requestItems: {
            include: { item: true },
          },
        },
      });

      if (!request) {
        return NextResponse.json(
          { error: "Phiếu yêu cầu không tồn tại" },
          { status: 404 }
        );
      }

      if (request.status !== "approved") {
        return NextResponse.json(
          { error: "Chỉ có thể cấp phát cho phiếu yêu cầu đã được Quản lý duyệt" },
          { status: 400 }
        );
      }

      // Sinh mã phiếu cấp phát duy nhất: CP-YYYYMMDD-XXXX
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const countToday = await prisma.disbursement.count({
        where: {
          code: { startsWith: `CP-${todayStr}` },
        },
      });
      const code = `CP-${todayStr}-${String(countToday + 1).padStart(3, "0")}`;

      const disbursement = await prisma.$transaction(async (tx) => {
        // 1. Tạo phiếu cấp phát
        const createdDisbursement = await tx.disbursement.create({
          data: {
            code,
            requestId: request.id,
            recipientId: request.requesterId,
            disbursedBy: user.id,
            status: "completed",
            note: note || `Cấp phát đồ dùng cho: "${request.purpose}"`,
          },
        });

        let allFullyDisbursed = true;

        // 2. Tạo chi tiết từng món và ghi lịch sử xuất kho
        for (const it of items) {
          const disbursedQty = Math.max(0, parseInt(it.disbursedQty, 10) || 0);
          const requestedQty = parseInt(it.requestedQty, 10) || disbursedQty;
          if (disbursedQty < requestedQty) {
            allFullyDisbursed = false;
          }

          if (disbursedQty === 0) continue;

          const itemId = it.itemId || null;
          const itemName = it.itemName || it.item?.name || "Đồ dùng";
          const itemUnit = it.itemUnit || it.item?.unit || "cái";

          await tx.disbursementItem.create({
            data: {
              disbursementId: createdDisbursement.id,
              itemId,
              itemName,
              itemUnit,
              disbursedQty,
              isReusable: it.isReusable !== false,
            },
          });

          // Ghi nhận nhật ký giao dịch xuất kho cấp phát
          if (itemId) {
            await tx.stockTransaction.create({
              data: {
                itemId,
                type: "xuat_kho_cap_phat",
                quantityChange: -disbursedQty,
                referenceId: createdDisbursement.id,
                performedBy: user.id,
                note: `Cấp phát (${code}) cho GV ${request.requester.fullName}: "${request.purpose}"`,
              },
            });
          }
        }

        // 3. Cập nhật trạng thái cấp phát của Request
        const newDisbursementStatus = allFullyDisbursed ? "da_cap_phat" : "cap_phat_mot_phan";
        await tx.request.update({
          where: { id: request.id },
          data: {
            disbursementStatus: newDisbursementStatus,
          },
        });

        return createdDisbursement;
      });

      return NextResponse.json({
        success: true,
        message: "Cấp phát đồ dùng thành công!",
        disbursement,
      });
    } catch (error: any) {
      console.error("POST /api/disbursements error:", error);
      return NextResponse.json(
        { error: error?.message || "Lỗi khi thực hiện cấp phát" },
        { status: 500 }
      );
    }
  }
);
