import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guards";
import { testGeminiApiKey } from "@/lib/ai-search";

// POST /api/settings/test-ai - Admin tests Gemini API key connectivity
export const POST = requireRole("admin", async (req: NextRequest) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { apiKey, model } = body;

    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json(
        { error: "Vui lòng nhập API Key để kiểm tra kết nối" },
        { status: 400 }
      );
    }

    const testResult = await testGeminiApiKey(apiKey.trim(), model);

    return NextResponse.json(testResult, {
      status: testResult.success ? 200 : 400,
    });
  } catch (error: any) {
    console.error("POST /api/settings/test-ai error:", error);
    return NextResponse.json(
      { error: error?.message || "Lỗi hệ thống khi kiểm tra kết nối AI" },
      { status: 500 }
    );
  }
});
