import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth-guards";

// GET /api/settings - Read all system settings
export const GET = requireAuth(async () => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const settingsMap: Record<string, string> = {
      school_name: "Trường Mầm Non Họa Mi",
      app_title: "Kho Mầm Non",
      subtitle: "Quản lý đồ dùng & giáo cụ",
      logo_icon: "Boxes",
      logo_url: "",
      phone: "024 3852 1199",
      address: "Số 128 Đường Hoa Hồng, Quận Cầu Giấy, Hà Nội",
      default_min_stock: "5",
    };

    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return NextResponse.json({ settings: settingsMap });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi tải cấu hình hệ thống" },
      { status: 500 }
    );
  }
});

// PATCH /api/settings - Admin updates system settings
export const PATCH = requireRole("admin", async (req: NextRequest) => {
  try {
    const body = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Dữ liệu cấu hình không hợp lệ" },
        { status: 400 }
      );
    }

    const updatedSettings: Record<string, string> = {};

    for (const [key, val] of Object.entries(body)) {
      if (typeof val === "string" || typeof val === "number") {
        const stringVal = String(val).trim();
        await prisma.systemSetting.upsert({
          where: { key },
          update: { value: stringVal },
          create: { key, value: stringVal },
        });
        updatedSettings[key] = stringVal;
      }
    }

    return NextResponse.json({
      message: "Cập nhật cấu hình hệ thống thành công",
      settings: updatedSettings,
    });
  } catch (error) {
    console.error("PATCH /api/settings error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi lưu cấu hình" },
      { status: 500 }
    );
  }
});
