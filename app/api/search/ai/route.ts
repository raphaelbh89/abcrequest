import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { searchPreschoolItemsWithAI } from "@/lib/ai-search";

// GET /api/search/ai?q=...
export const GET = requireAuth(async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || "";

    if (!query.trim()) {
      return NextResponse.json({
        query: "",
        results: [],
        modelUsed: "none",
        fromCache: false,
        executionTimeMs: 0,
      });
    }

    const aiResult = await searchPreschoolItemsWithAI(query);

    return NextResponse.json({
      success: !aiResult.error,
      ...aiResult,
    });
  } catch (error: any) {
    console.error("GET /api/search/ai error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Lỗi khi tìm kiếm sản phẩm bằng AI",
        results: [],
      },
      { status: 500 }
    );
  }
});
