import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { readSystemSettingsFromFile, writeSystemSettingsToFile } from "@/lib/system-settings-file";
import fs from "fs";
import path from "path";

// POST /api/upload/logo - Chỉ Admin có quyền tải lên logo trường
export const POST = requireRole(["admin"], async (req: NextRequest) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Không tìm thấy file tải lên." }, { status: 400 });
    }

    // Kiểm tra định dạng hợp lệ
    const validMimeTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/svg+xml",
      "image/gif",
    ];

    if (!validMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Định dạng file không hỗ trợ. Vui lòng chọn ảnh PNG, JPG, WEBP hoặc SVG." },
        { status: 400 }
      );
    }

    // Giới hạn dung lượng 5MB
    const MAX_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Dung lượng ảnh vượt quá 5MB. Vui lòng chọn ảnh nhẹ hơn." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Xác định phần mở rộng file
    let ext = "png";
    if (file.type === "image/jpeg" || file.type === "image/jpg") ext = "jpg";
    else if (file.type === "image/webp") ext = "webp";
    else if (file.type === "image/svg+xml") ext = "svg";
    else if (file.type === "image/gif") ext = "gif";
    else {
      const originalExt = file.name.split(".").pop();
      if (originalExt) ext = originalExt.toLowerCase();
    }

    // Thư mục lưu trữ: public/uploads
    const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `school-logo-${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const relativeUrl = `/uploads/${fileName}`;

    // Tạo base64 data URI phục vụ render nhanh và export Excel tức thì
    const base64DataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

    // Lưu cấu hình vào CSDL
    await prisma.systemSetting.upsert({
      where: { key: "logo_url" },
      update: { value: relativeUrl },
      create: { key: "logo_url", value: relativeUrl },
    });

    // Đồng bộ vào file cấu hình
    writeSystemSettingsToFile({ ...readSystemSettingsFromFile(), logo_url: relativeUrl });

    return NextResponse.json({
      success: true,
      message: "Tải lên logo trường thành công!",
      logoUrl: relativeUrl,
      base64: base64DataUri,
      fileName,
      size: file.size,
    });
  } catch (error: any) {
    console.error("POST /api/upload/logo error:", error);
    return NextResponse.json(
      { error: error?.message || "Lỗi khi tải lên file logo." },
      { status: 500 }
    );
  }
});
