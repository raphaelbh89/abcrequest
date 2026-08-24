import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { prisma } from "./db";
import { readSystemSettingsFromFile } from "./system-settings-file";

/**
 * Tự động tìm và chèn Logo trường học vào bảng tính Excel xuất ra
 */
export async function embedSchoolLogoInWorksheet(
  workbook: ExcelJS.Workbook,
  worksheet: ExcelJS.Worksheet,
  range: { tl: { col: number; row: number }; br: { col: number; row: number } }
): Promise<boolean> {
  try {
    let logoUrl = "";

    // 1. Ưu tiên đọc từ Database
    try {
      const dbSetting = await prisma.systemSetting.findUnique({
        where: { key: "logo_url" },
      });
      if (dbSetting?.value && dbSetting.value.trim()) {
        logoUrl = dbSetting.value.trim();
      }
    } catch {
      // ignore db error
    }

    // 2. Fallback đọc từ file system-settings.json
    if (!logoUrl) {
      const fileSettings = readSystemSettingsFromFile();
      if (fileSettings?.logo_url && fileSettings.logo_url.trim()) {
        logoUrl = fileSettings.logo_url.trim();
      }
    }

    // 3. Fallback: Nếu vẫn chưa có URL nhưng trong public/uploads có file logo
    const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
    if (!logoUrl && fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir).filter((f) => !f.startsWith("."));
      if (files.length > 0) {
        // Lấy file mới nhất
        const latestFile = files.sort((a, b) => {
          const statA = fs.statSync(path.join(uploadsDir, a));
          const statB = fs.statSync(path.join(uploadsDir, b));
          return statB.mtimeMs - statA.mtimeMs;
        })[0];
        logoUrl = `/uploads/${latestFile}`;
      }
    }

    if (!logoUrl) return false;

    let buffer: Buffer | null = null;
    let extension: "png" | "jpeg" | "gif" = "png";

    // 4. Xử lý theo từng loại dữ liệu ảnh
    if (logoUrl.startsWith("data:")) {
      const match = logoUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        const type = match[1].toLowerCase();
        if (type.includes("jpeg") || type.includes("jpg")) extension = "jpeg";
        else if (type.includes("gif")) extension = "gif";
        else extension = "png";
        buffer = Buffer.from(match[2], "base64");
      }
    } else if (logoUrl.startsWith("/uploads/") || logoUrl.startsWith("uploads/")) {
      const cleanPath = logoUrl.startsWith("/") ? logoUrl.slice(1) : logoUrl;
      const fullPath = path.resolve(process.cwd(), "public", cleanPath);
      if (fs.existsSync(fullPath)) {
        buffer = fs.readFileSync(fullPath);
        const ext = path.extname(fullPath).toLowerCase();
        if (ext === ".jpg" || ext === ".jpeg") extension = "jpeg";
        else if (ext === ".gif") extension = "gif";
        else extension = "png";
      }
    } else if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
      try {
        const res = await fetch(logoUrl, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          buffer = Buffer.from(arrayBuf);
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("jpeg") || contentType.includes("jpg")) extension = "jpeg";
          else if (contentType.includes("gif")) extension = "gif";
          else extension = "png";
        }
      } catch {
        // ignore fetch error
      }
    }

    if (buffer && buffer.length > 0) {
      const imageId = workbook.addImage({
        buffer,
        extension,
      });

      worksheet.addImage(imageId, {
        tl: range.tl,
        br: range.br,
        editAs: "oneCell",
      });
      return true;
    }
  } catch (err) {
    console.error("Error embedding logo in Excel:", err);
  }
  return false;
}
