import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { searchExternalSupplies } from "@/lib/external-search";

// GET /api/search/external?q=...
// TẦNG DỰ PHÒNG: Chỉ được gọi khi người dùng chủ động bấm xác nhận "Tìm gợi ý mở rộng"
// Có rate limit 30 lượt/ngày/user và tự động cache 48 giờ để tiết kiệm chi phí.
export const GET = requireAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || searchParams.get("query") || "";

    if (!query.trim()) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp từ khóa tìm kiếm (q)" },
        { status: 400 }
      );
    }

    const result = await searchExternalSupplies(query, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Không thể thực hiện tìm kiếm mở rộng" },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data, { status: 200 });
  } catch (error) {
    console.error("GET /api/search/external error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi tìm kiếm mở rộng" },
      { status: 500 }
    );
  }
});
