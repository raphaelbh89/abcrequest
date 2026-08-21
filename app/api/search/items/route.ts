import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { searchInternalItems } from "@/lib/search";

// GET /api/search/items?q=...
// API tìm kiếm nội bộ 3 tầng trong bảng items: Exact -> Fuzzy -> Semantic
// KHÔNG BAO GIỜ gọi API Internet trong endpoint này để đảm bảo tốc độ < 300ms và không tốn chi phí.
export const GET = requireAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || searchParams.get("query") || "";

    const searchResponse = await searchInternalItems(query);

    return NextResponse.json(searchResponse);
  } catch (error) {
    console.error("GET /api/search/items error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi tìm kiếm mặt hàng nội bộ" },
      { status: 500 }
    );
  }
});
