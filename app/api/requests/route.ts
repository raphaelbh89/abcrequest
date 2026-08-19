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
    if (mineOnly || user.role !== "admin") {
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
        const itemId = reqItem.itemId;
        const requestedQty = parseInt(reqItem.requestedQty, 10);

        if (!itemId || isNaN(requestedQty) || requestedQty <= 0) {
          continue;
        }

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
