import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";

// GET /api/stock-transactions - Audit Trail of stock transactions
export const GET = requireAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");
    const type = searchParams.get("type");

    const whereClause: any = {};
    if (itemId) whereClause.itemId = itemId;
    if (type && type !== "all") whereClause.type = type;

    const transactions = await prisma.stockTransaction.findMany({
      where: whereClause,
      include: {
        item: true,
        performedUser: {
          select: { id: true, username: true, fullName: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("GET /api/stock-transactions error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi tải nhật ký lịch sử kho" },
      { status: 500 }
    );
  }
});
