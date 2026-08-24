import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";

const DEFAULT_THEMES = [
  {
    name: "Lễ hội Trung Thu 2026",
    description: "Kế hoạch tổ chức tết Trung Thu cho các bé toàn trường, làm lồng đèn, múa lân, bày cỗ",
    icon: "🏮",
    isActive: true,
  },
  {
    name: "Trang trí Hội Xuân & Tết Nguyên Đán",
    description: "Trang trí cành đào, mai, câu đối đỏ, làm bánh chưng mô hình và góc chợ quê",
    icon: "🌸",
    isActive: true,
  },
  {
    name: "Bé Vui Sáng Tạo & Tạo Hình",
    description: "Hoạt động vẽ tranh, xé dán, nặn tượng, làm thiệp tặng cô và mẹ",
    icon: "🎨",
    isActive: true,
  },
  {
    name: "Ngày Hội Môi Trường & Trồng Cây",
    description: "Chăm sóc vườn rau của bé, tái chế chai nhựa làm chậu hoa, tìm hiểu thiên nhiên",
    icon: "🌱",
    isActive: true,
  },
  {
    name: "Hội Khỏe Măng Non & Thể Dục Vận Động",
    description: "Tổ chức các trò chơi dân gian, kéo co, nhảy bao bố, ném bóng vào rổ",
    icon: "🏃",
    isActive: true,
  },
];

// GET /api/themes - Lấy danh sách các chủ đề / sự kiện của trường
export const GET = requireRole(
  ["admin", "manager", "stocker", "teacher"],
  async (_req: NextRequest) => {
    try {
      // 1. Tự động khởi tạo dữ liệu mẫu nếu chưa có
      const count = await prisma.eventTheme.count();
      if (count === 0) {
        for (const dt of DEFAULT_THEMES) {
          await prisma.eventTheme.create({
            data: dt,
          });
        }
      }

      // 2. Lấy danh sách chủ đề chính thức
      const themes = await prisma.eventTheme.findMany({
        include: {
          _count: {
            select: { requests: true },
          },
        },
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      });

      // 3. Quét thêm các chủ đề đã từng được tạo tự do trong bảng Request (để gợi ý thông minh)
      const existingRequests = await prisma.request.findMany({
        select: { purpose: true },
        distinct: ["purpose"],
      });

      const officialNames = new Set(themes.map((t) => t.name.toLowerCase().trim()));
      const customSuggestedThemes: string[] = [];

      for (const r of existingRequests) {
        if (r.purpose && !officialNames.has(r.purpose.toLowerCase().trim())) {
          customSuggestedThemes.push(r.purpose.trim());
        }
      }

      return NextResponse.json({
        success: true,
        themes: themes.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          icon: t.icon || "🎯",
          isActive: t.isActive,
          startDate: t.startDate,
          endDate: t.endDate,
          requestCount: t._count.requests,
        })),
        customSuggestedThemes,
      });
    } catch (error: any) {
      console.error("GET /api/themes error:", error);
      return NextResponse.json(
        { error: error?.message || "Lỗi khi tải danh sách chủ đề sự kiện" },
        { status: 500 }
      );
    }
  }
);

// POST /api/themes - Quản lý / BGH tạo chủ đề / sự kiện mới cho trường
export const POST = requireRole(
  ["admin", "manager"],
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const { name, description = "", icon = "🎯", startDate = null, endDate = null, isActive = true } = body;

      if (!name || !name.trim()) {
        return NextResponse.json(
          { error: "Vui lòng nhập tên Chủ đề / Sự kiện" },
          { status: 400 }
        );
      }

      const cleanName = name.trim();

      const existing = await prisma.eventTheme.findUnique({
        where: { name: cleanName },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Chủ đề / Sự kiện này đã tồn tại trong hệ thống" },
          { status: 400 }
        );
      }

      const created = await prisma.eventTheme.create({
        data: {
          name: cleanName,
          description: description ? description.trim() : null,
          icon: icon || "🎯",
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          isActive: Boolean(isActive),
        },
      });

      return NextResponse.json({
        success: true,
        theme: created,
        message: "Tạo chủ đề sự kiện thành công!",
      });
    } catch (error: any) {
      console.error("POST /api/themes error:", error);
      return NextResponse.json(
        { error: error?.message || "Lỗi khi tạo chủ đề sự kiện" },
        { status: 500 }
      );
    }
  }
);
