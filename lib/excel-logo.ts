import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { readSystemSettingsFromFile } from "./system-settings-file";

/**
 * Tự động chèn Logo trường học vào file Excel xuất ra tại vùng chỉ định
 */
export async function embedSchoolLogoInWorksheet(
  workbook: ExcelJS.Workbook,
  worksheet: ExcelJS.Worksheet,
  range: { tl: { col: number; row: number }; br: { col: number; row: number } }
): Promise<boolean> {
  try {
    const settings = readSystemSettingsFromFile();
    const logoUrl = settings.logo_url?.trim();
    if (!logoUrl) return false;

    let buffer: Buffer | null = null;
    let extension: "png" | "jpeg" | "gif" = "png";

    // 1. Nếu là data URI base64
    if (logoUrl.startsWith("data:")) {
      const match = logoUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        const type = match[1].toLowerCase();
        if (type.includes("jpeg") || type.includes("jpg")) extension = "jpeg";
        else if (type.includes("gif")) extension = "gif";
        else extension = "png";
        buffer = Buffer.from(match[2], "base64");
      }
    }
    // 2. Nếu là đường dẫn file cục bộ trong thư mục public/uploads
    else if (logoUrl.startsWith("/uploads/") || logoUrl.startsWith("uploads/")) {
      const cleanPath = logoUrl.startsWith("/") ? logoUrl.slice(1) : logoUrl;
      const fullPath = path.resolve(process.cwd(), "public", cleanPath);
      if (fs.existsSync(fullPath)) {
        buffer = fs.readFileSync(fullPath);
        const ext = path.extname(fullPath).toLowerCase();
        if (ext === ".jpg" || ext === ".jpeg") extension = "jpeg";
        else if (ext === ".gif") extension = "gif";
        else extension = "png";
      }
    }
    // 3. Nếu là link URL ngoài internet
    else if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
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
