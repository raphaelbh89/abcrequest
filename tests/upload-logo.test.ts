import { test, describe } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { POST as uploadLogo } from "../app/api/upload/logo/route";
import { embedSchoolLogoInWorksheet } from "../lib/excel-logo";
import { createJWT } from "../lib/auth";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

describe("Unit & Integration Tests: School Logo Upload & Excel Integration", () => {
  let adminToken: string;
  let teacherToken: string;

  test("1. Chuẩn bị Authentication Tokens", async () => {
    adminToken = await createJWT({
      id: "admin-test-id",
      username: "admin_test",
      fullName: "Quản Trị Viên",
      role: "admin",
    });

    teacherToken = await createJWT({
      id: "teacher-test-id",
      username: "teacher_test",
      fullName: "Cô Giáo",
      role: "teacher",
    });

    assert.ok(adminToken);
    assert.ok(teacherToken);
  });

  test("2. Kiểm tra phân quyền: Giáo viên không thể tải lên Logo trường", async () => {
    const formData = new FormData();
    const blob = new Blob(["fake-image-content"], { type: "image/png" });
    formData.append("file", blob, "logo.png");

    const req = new NextRequest("http://localhost:3000/api/upload/logo", {
      method: "POST",
      headers: {
        Cookie: `token=${teacherToken}`,
      },
      body: formData,
    });

    const res = await uploadLogo(req);
    assert.strictEqual(res.status, 403, "Chặn giáo viên với mã 403 Forbidden");
  });

  test("3. Kiểm tra xác thực định dạng file không hợp lệ (.exe / .pdf)", async () => {
    const formData = new FormData();
    const blob = new Blob(["dangerous-content"], { type: "application/pdf" });
    formData.append("file", blob, "document.pdf");

    const req = new NextRequest("http://localhost:3000/api/upload/logo", {
      method: "POST",
      headers: {
        Cookie: `token=${adminToken}`,
      },
      body: formData,
    });

    const res = await uploadLogo(req);
    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.ok(data.error.includes("Định dạng file không hỗ trợ"));
  });

  test("4. Admin tải lên logo PNG hợp lệ -> Lưu file vào public/uploads & trả về URL", async () => {
    // 1x1 transparent PNG base64
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    const blob = new Blob([pngBuffer], { type: "image/png" });

    const formData = new FormData();
    formData.append("file", blob, "truong-mam-non-logo.png");

    const req = new NextRequest("http://localhost:3000/api/upload/logo", {
      method: "POST",
      headers: {
        Cookie: `token=${adminToken}`,
      },
      body: formData,
    });

    const res = await uploadLogo(req);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.logoUrl.startsWith("/uploads/school-logo-"));

    // Kiểm tra file có thực sự tồn tại trong thư mục public/uploads
    const localFilePath = path.resolve(process.cwd(), "public", data.logoUrl.slice(1));
    assert.ok(fs.existsSync(localFilePath), "File đã được ghi vào thư mục public/uploads");
  });

  test("5. Kiểm tra chèn Logo vào bảng tính Excel (embedSchoolLogoInWorksheet)", async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Test Sheet");

    const embedded = await embedSchoolLogoInWorksheet(workbook, worksheet, {
      tl: { col: 0.1, row: 0.1 },
      br: { col: 1.9, row: 2.9 },
    });

    assert.strictEqual(embedded, true, "Chèn thành công logo vào Worksheet Excel");
    assert.ok(worksheet.getImages().length > 0, "Worksheet có chứa hình ảnh");
  });

  test("6. Kiểm tra Route Handler GET /uploads/[filename] phục vụ ảnh trực tiếp", async () => {
    const { GET: getUploadFile } = await import("../app/uploads/[filename]/route");
    const settings = (await import("../lib/system-settings-file")).readSystemSettingsFromFile();
    const logoUrl = settings.logo_url;
    const filename = logoUrl.replace("/uploads/", "");

    const req = new NextRequest(`http://localhost:3000/uploads/${filename}`);
    const res = await getUploadFile(req, {
      params: Promise.resolve({ filename }),
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get("Content-Type"), "image/png");
    const blob = await res.blob();
    assert.ok(blob.size > 0);
  });
});
