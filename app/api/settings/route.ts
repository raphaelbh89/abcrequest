import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth-guards";
import {
  readSystemSettingsFromFile,
  writeSystemSettingsToFile,
  DEFAULT_SYSTEM_SETTINGS,
} from "@/lib/system-settings-file";

// GET /api/settings - Read all system settings with file fallback
export const GET = requireAuth(async () => {
  try {
    const fileSettings = readSystemSettingsFromFile();
    const dbSettings = await prisma.systemSetting.findMany();

    const settingsMap: Record<string, string> = {
      ...DEFAULT_SYSTEM_SETTINGS,
      ...fileSettings,
    };

    if (dbSettings.length > 0) {
      dbSettings.forEach((s) => {
        settingsMap[s.key] = s.value;
      });
      // Ensure file has any newer DB settings
      writeSystemSettingsToFile(settingsMap);
    } else {
      // DB is empty (e.g. fresh DB on server after git pull) -> auto-populate DB from file!
      for (const [key, value] of Object.entries(settingsMap)) {
        await prisma.systemSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        });
      }
    }

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

    // Read current settings
    const currentSettings = readSystemSettingsFromFile();
    const updatedSettings: Record<string, string> = { ...currentSettings };

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

    // Persist to data/system-settings.json so Git commit/pull preserves settings!
    writeSystemSettingsToFile(updatedSettings);

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
