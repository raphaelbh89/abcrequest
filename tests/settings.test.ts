import { test, describe } from "node:test";
import assert from "node:assert";
import { prisma } from "../lib/db";

describe("Integration Tests: System Settings & Category Management", () => {
  test("1. Cài đặt hệ thống: Lưu và đọc cấu hình tên trường & logo", async () => {
    // 1. Lưu cài đặt mới
    const testSchoolName = `Trường Mầm Non Họa Mi Test ${Date.now()}`;
    const testAppTitle = "Kho Mầm Non ABC";
    const testLogoIcon = "School";

    await prisma.systemSetting.upsert({
      where: { key: "school_name" },
      update: { value: testSchoolName },
      create: { key: "school_name", value: testSchoolName },
    });

    await prisma.systemSetting.upsert({
      where: { key: "app_title" },
      update: { value: testAppTitle },
      create: { key: "app_title", value: testAppTitle },
    });

    await prisma.systemSetting.upsert({
      where: { key: "logo_icon" },
      update: { value: testLogoIcon },
      create: { key: "logo_icon", value: testLogoIcon },
    });

    // 2. Đọc lại từ database
    const settings = await prisma.systemSetting.findMany();
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    assert.strictEqual(settingsMap["school_name"], testSchoolName);
    assert.strictEqual(settingsMap["app_title"], testAppTitle);
    assert.strictEqual(settingsMap["logo_icon"], testLogoIcon);
  });

  test("2. Quản lý danh mục: Thêm mới, cập nhật và xóa danh mục loại đồ dùng", async () => {
    const uniqueCode = `test_cat_${Date.now()}`;
    const initialName = "Đồ dùng Âm nhạc & Vận động";

    // 1. Tạo danh mục mới
    const newCat = await prisma.category.create({
      data: {
        code: uniqueCode,
        name: initialName,
        description: "Xúc xắc, trống con, phách tre...",
        color: "amber",
        sortOrder: 10,
      },
    });

    assert.strictEqual(newCat.code, uniqueCode);
    assert.strictEqual(newCat.name, initialName);
    assert.strictEqual(newCat.color, "amber");

    // 2. Cập nhật danh mục
    const updated = await prisma.category.update({
      where: { id: newCat.id },
      data: {
        name: "Âm nhạc & Nhạc cụ",
        color: "purple",
      },
    });

    assert.strictEqual(updated.name, "Âm nhạc & Nhạc cụ");
    assert.strictEqual(updated.color, "purple");

    // 3. Xóa danh mục
    await prisma.category.delete({
      where: { id: newCat.id },
    });

    const checkDeleted = await prisma.category.findUnique({
      where: { id: newCat.id },
    });

    assert.strictEqual(checkDeleted, null, "Danh mục đã được xóa");
  });

  test("3. Kiểm tra tính năng đồng bộ và phục hồi cài đặt qua data/system-settings.json", async () => {
    const { readSystemSettingsFromFile, writeSystemSettingsToFile } = await import("../lib/system-settings-file");

    const customSettings = {
      school_name: "Trường Mầm Non Hoa Sen Test",
      app_title: "Kho Hoa Sen",
      subtitle: "Hệ thống quản lý giáo cụ",
      logo_icon: "Heart",
      logo_url: "",
      phone: "0987 654 321",
      address: "Số 99 Đường Giải Phóng, Hà Nội",
      default_min_stock: "10",
    };

    // 1. Ghi ra file
    writeSystemSettingsToFile(customSettings);

    // 2. Đọc lại từ file
    const loaded = readSystemSettingsFromFile();
    assert.strictEqual(loaded.school_name, "Trường Mầm Non Hoa Sen Test");
    assert.strictEqual(loaded.app_title, "Kho Hoa Sen");
    assert.strictEqual(loaded.logo_icon, "Heart");
    assert.strictEqual(loaded.phone, "0987 654 321");
    assert.strictEqual(loaded.address, "Số 99 Đường Giải Phóng, Hà Nội");
    assert.strictEqual(loaded.default_min_stock, "10");
  });
});
