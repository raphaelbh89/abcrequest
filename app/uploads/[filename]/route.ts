import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// GET /uploads/[filename] - Phục vụ file ảnh tĩnh tải lên tại runtime trong Next.js
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;

    if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return NextResponse.json({ error: "Tên file không hợp lệ" }, { status: 400 });
    }

    const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
    const filePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File không tồn tại" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase();

    let contentType = "application/octet-stream";
    if (ext === ".png") contentType = "image/png";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".webp") contentType = "image/webp";
    else if (ext === ".svg") contentType = "image/svg+xml";
    else if (ext === ".gif") contentType = "image/gif";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.error("GET /uploads/[filename] error:", error);
    return NextResponse.json(
      { error: "Lỗi khi đọc file ảnh" },
      { status: 500 }
    );
  }
}
