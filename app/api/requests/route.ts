import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";
import { computeAvailableStock, computeItemAllocation } from "@/lib/allocation";

// GET /api/requests - List requests
export const GET = requireAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const mineOnly = searchParams.get("mine") === "true";
    const status = searchParams.get("status");

    const whereClause: any = {};
    const isManagement = ["admin", "manager", "stocker"].includes(user.role);
    if (mineOnly || !isManagement) {
      whereClause.requesterId = user.id;
    }
    if (status && status !== "all") {
      whereClause.status = status;
    }

    const requests = await prisma.request.findMany({
      where: whereClause,
      include: {
        requester: {
          select: { id: true, username: true, fullName: true, role: true },
        },
        decidedByUser: {
          select: { id: true, username: true, fullName: true },
        },
        requestItems: {
          include: {
            item: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("GET /api/requests error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi tải danh sách yêu cầu" },
      { status: 500 }
    );
  }
});

// POST /api/requests - Create request with allocation logic
export const POST = requireAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { purpose, neededDate, note, items } = body;

    if (!purpose || !purpose.trim()) {
      return NextResponse.json(
        { error: "Chủ đề / hoạt động là thông tin bắt buộc" },
        { status: 400 }
      );
    }

    if (!neededDate) {
      return NextResponse.json(
        { error: "Ngày cần dùng là thông tin bắt buộc" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Vui lòng chọn ít nhất 1 mặt hàng đồ dùng" },
        { status: 400 }
      );
    }

    // Run in DB transaction to ensure atomic allocation & prevent race conditions
    const createdRequest = await prisma.$transaction(async (tx) => {
      // 1. Create the Request record
      const request = await tx.request.create({
        data: {
          requesterId: user.id,
          purpose: String(purpose).trim(),
          neededDate: new Date(neededDate),
          note: note ? String(note).trim() : null,
          status: "pending",
        },
      });

      // 2. Process each requested item
      for (const reqItem of items) {
        const requestedQty = parseInt(reqItem.requestedQty, 10);
        if (isNaN(requestedQty) || requestedQty <= 0) {
          continue;
        }

        // Trường hợp A: Món đề xuất mới từ tìm kiếm mở rộng (Chưa có trong kho)
        if (reqItem.isNewItemProposal) {
          await tx.requestItem.create({
            data: {
              requestId: request.id,
              itemId: null,
              requestedQty,
              allocatedQty: 0, // Chưa có trong kho
              shortfallQty: requestedQty, // 100% cần mua
              isNewItemProposal: true,
              proposedName: String(reqItem.proposedName || reqItem.name || "Món mới đề xuất").trim(),
              proposedUnit: String(reqItem.proposedUnit || reqItem.unit || "cái").trim(),
              proposedPrice: reqItem.proposedPrice ? parseFloat(reqItem.proposedPrice) : null,
              proposedImageUrl: reqItem.proposedImageUrl || null,
              proposedSourceUrl: reqItem.proposedSourceUrl || null,
            },
          });
          continue;
        }

        // Trường hợp B: Món đã có trong kho
        const itemId = reqItem.itemId;
        if (!itemId) continue;

        const item = await tx.item.findUnique({
          where: { id: itemId },
        });

        if (!item) {
          throw new Error(`Mặt hàng (ID: ${itemId}) không tồn tại trong hệ thống`);
        }

        // Sum current allocated_qty for this item in other PENDING requests
        const pendingSum = await tx.requestItem.aggregate({
          where: {
            itemId: itemId,
            request: {
              status: "pending",
              id: { not: request.id }, // Exclude current request
            },
          },
          _sum: {
            allocatedQty: true,
          },
        });

        const pendingAllocatedSum = pendingSum._sum.allocatedQty || 0;
        const availableStock = computeAvailableStock(item.quantity, pendingAllocatedSum);
        const allocation = computeItemAllocation(requestedQty, availableStock);

        await tx.requestItem.create({
          data: {
            requestId: request.id,
            itemId: item.id,
            requestedQty: allocation.requestedQty,
            allocatedQty: allocation.allocatedQty,
            shortfallQty: allocation.shortfallQty,
            isNewItemProposal: false,
            proposedName: reqItem.name && reqItem.name !== item.name ? String(reqItem.name).trim() : null,
            proposedUnit: reqItem.unit && reqItem.unit !== item.unit ? String(reqItem.unit).trim() : null,
            proposedImageUrl: reqItem.imageUrl && reqItem.imageUrl !== item.imageUrl ? String(reqItem.imageUrl).trim() : null,
          },
        });
      }

      // 3. Return full request with items
      return await tx.request.findUnique({
        where: { id: request.id },
        include: {
          requester: {
            select: { id: true, username: true, fullName: true },
          },
          requestItems: {
            include: {
              item: true,
            },
          },
        },
      });
    });

    return NextResponse.json({
      message: "Tạo yêu cầu đồ dùng thành công",
      request: createdRequest,
    });
  } catch (error: any) {
    console.error("POST /api/requests error:", error);
    return NextResponse.json(
      { error: error?.message || "Lỗi hệ thống khi tạo yêu cầu đồ dùng" },
      { status: 500 }
    );
  }
});
