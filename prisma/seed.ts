import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin123";
  const managerPassword = process.env.SEED_MANAGER_PASSWORD || "quanly123";
  const stockerPassword = process.env.SEED_STOCKER_PASSWORD || "thukho123";
  const teacherPassword = process.env.SEED_TEACHER_PASSWORD || "giaovien123";

  const adminHash = await bcrypt.hash(adminPassword, 10);
  const managerHash = await bcrypt.hash(managerPassword, 10);
  const stockerHash = await bcrypt.hash(stockerPassword, 10);
  const teacherHash = await bcrypt.hash(teacherPassword, 10);

  // 1. Admin Account (Toàn quyền, cấu hình hệ thống)
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      passwordHash: adminHash,
      fullName: "Quản Trị Viên Hệ Thống",
      role: "admin",
    },
    create: {
      username: "admin",
      passwordHash: adminHash,
      fullName: "Quản Trị Viên Hệ Thống",
      role: "admin",
    },
  });

  // 2. Manager Account (Quản lý / BGH - Duyệt đơn, quản lý kho, theo dõi mua sắm)
  const manager = await prisma.user.upsert({
    where: { username: "quanly" },
    update: {
      passwordHash: managerHash,
      fullName: "Ban Giám Hiệu Quản Lý",
      role: "manager",
    },
    create: {
      username: "quanly",
      passwordHash: managerHash,
      fullName: "Ban Giám Hiệu Quản Lý",
      role: "manager",
    },
  });

  // 3. Stocker Account (Thủ kho & Mua sắm)
  const stocker = await prisma.user.upsert({
    where: { username: "thukho" },
    update: {
      passwordHash: stockerHash,
      fullName: "Thủ Kho & Mua Sắm",
      role: "stocker",
    },
    create: {
      username: "thukho",
      passwordHash: stockerHash,
      fullName: "Thủ Kho & Mua Sắm",
      role: "stocker",
    },
  });

  // 4. Teacher Account (Giáo viên mầm non)
  const teacher = await prisma.user.upsert({
    where: { username: "giaovien" },
    update: {
      passwordHash: teacherHash,
      fullName: "Giáo Viên Mầm Non",
      role: "teacher",
    },
    create: {
      username: "giaovien",
      passwordHash: teacherHash,
      fullName: "Giáo Viên Mầm Non",
      role: "teacher",
    },
  });

  // Seed system settings (from data/system-settings.json if available)
  let systemSettingsData: Record<string, string> = {
    school_name: "Trường Mầm Non Họa Mi",
    app_title: "Kho Mầm Non",
    subtitle: "Quản lý đồ dùng & giáo cụ",
    logo_icon: "Boxes",
    logo_url: "",
    phone: "024 3852 1199",
    address: "Số 128 Đường Hoa Hồng, Quận Cầu Giấy, Hà Nội",
    default_min_stock: "5",
  };

  try {
    const fs = await import("fs");
    const path = await import("path");
    const settingsPath = path.resolve(process.cwd(), "data", "system-settings.json");
    if (fs.existsSync(settingsPath)) {
      const fileRaw = fs.readFileSync(settingsPath, "utf-8");
      const parsed = JSON.parse(fileRaw);
      if (parsed && typeof parsed === "object") {
        systemSettingsData = { ...systemSettingsData, ...parsed };
      }
    }
  } catch (e) {
    // fallback
  }

  for (const [key, value] of Object.entries(systemSettingsData)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  // Seed default categories
  const defaultCategories = [
    {
      code: "hoc_tap",
      name: "Học tập & Giáo cụ",
      description: "Sách vở, bút màu, giấy thủ công, đất nặn, bộ chữ số...",
      color: "sky",
      isDefault: true,
      sortOrder: 1,
    },
    {
      code: "ngoai_khoa",
      name: "Ngoại khóa & Trang trí",
      description: "Ruy băng, xốp kim tuyến, decal, bóng bay, đạo cụ biểu diễn...",
      color: "purple",
      isDefault: true,
      sortOrder: 2,
    },
    {
      code: "ve_sinh_ban_tru",
      name: "Vệ sinh & Bán trú",
      description: "Khăn mặt, xà phòng, dung dịch sát khuẩn, túi đựng đồ...",
      color: "emerald",
      isDefault: false,
      sortOrder: 3,
    },
    {
      code: "su_kien",
      name: "Sự kiện & Lễ hội",
      description: "Trang phục biểu diễn, quà tặng bé, phông bạt, cờ hoa...",
      color: "rose",
      isDefault: false,
      sortOrder: 4,
    },
  ];

  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: { code: cat.code },
      update: {},
      create: cat,
    });
  }

  function normalizeVietnamese(text: string): string {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Seed sample items with realistic thumbnail images
  const sampleItems = [
    {
      name: "Bút màu dạ 12 màu",
      category: "hoc_tap",
      unit: "hộp",
      quantity: 15,
      minStock: 5,
      price: 25000,
      location: "Kệ A1",
      imageUrl: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=150&auto=format&fit=crop&q=80",
    },
    {
      name: "Bút chì 2B thân gỗ",
      category: "hoc_tap",
      unit: "hộp",
      quantity: 20,
      minStock: 5,
      price: 15000,
      location: "Kệ A1",
      imageUrl: "https://images.unsplash.com/photo-1585336261026-78b77d612e4f?w=150&auto=format&fit=crop&q=80",
    },
    {
      name: "Bút bi Thiên Long 0.5mm",
      category: "hoc_tap",
      unit: "cây",
      quantity: 30,
      minStock: 10,
      price: 4000,
      location: "Kệ A1",
      imageUrl: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=150&auto=format&fit=crop&q=80",
    },
    {
      name: "Giấy A4 màu thủ công",
      category: "hoc_tap",
      unit: "ram",
      quantity: 3, // LOW STOCK
      minStock: 10,
      price: 35000,
      location: "Kệ A2",
      imageUrl: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=150&auto=format&fit=crop&q=80",
    },
    {
      name: "Sáp màu hữu cơ 16 màu",
      category: "hoc_tap",
      unit: "hộp",
      quantity: 18,
      minStock: 5,
      price: 28000,
      location: "Kệ A2",
      imageUrl: "https://images.unsplash.com/photo-1560421683-680b9c814e52?w=150&auto=format&fit=crop&q=80",
    },
    {
      name: "Đất nặn tạo hình 12 màu",
      category: "hoc_tap",
      unit: "hộp",
      quantity: 12,
      minStock: 5,
      price: 22000,
      location: "Kệ A3",
      imageUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=150&auto=format&fit=crop&q=80",
    },
    {
      name: "Kéo thủ công mũi tròn an toàn",
      category: "hoc_tap",
      unit: "cái",
      quantity: 25,
      minStock: 8,
      price: 9000,
      location: "Kệ A3",
      imageUrl: "https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?w=150&auto=format&fit=crop&q=80",
    },
    {
      name: "Băng dính 2 mặt siêu dính",
      category: "ngoai_khoa",
      unit: "cuộn",
      quantity: 14,
      minStock: 5,
      price: 6000,
      location: "Tủ 1",
      imageUrl: "https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=150&auto=format&fit=crop&q=80",
    },
    {
      name: "Tấm Formex (Format) dày 5mm",
      category: "ngoai_khoa",
      unit: "tấm",
      quantity: 8,
      minStock: 4,
      price: 45000,
      location: "Tủ 1",
      imageUrl: "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=150&auto=format&fit=crop&q=80",
    },
    {
      name: "Ruy-băng trang trí hoa",
      category: "ngoai_khoa",
      unit: "cuộn",
      quantity: 20,
      minStock: 5,
      price: 12000,
      location: "Tủ 2",
      imageUrl: "https://images.unsplash.com/photo-1512909006721-3d6018887383?w=150&auto=format&fit=crop&q=80",
    },
    {
      name: "Keo dán nến đóng khung",
      category: "ngoai_khoa",
      unit: "gói",
      quantity: 2, // LOW STOCK
      minStock: 8,
      price: 8000,
      location: "Tủ 2",
      imageUrl: "https://images.unsplash.com/photo-1629198688000-71f23e745b6e?w=150&auto=format&fit=crop&q=80",
    },
  ];

  for (const itemData of sampleItems) {
    const existing = await prisma.item.findFirst({
      where: { name: itemData.name },
    });
    const normalized = normalizeVietnamese(itemData.name);
    if (!existing) {
      const item = await prisma.item.create({
        data: {
          ...itemData,
          nameNormalized: normalized,
        },
      });

      await prisma.stockTransaction.create({
        data: {
          itemId: item.id,
          type: "nhap_kho",
          quantityChange: item.quantity,
          referenceId: item.id,
          performedBy: admin.id,
          note: "Khởi tạo dữ liệu mẫu",
        },
      });
    } else {
      await prisma.item.update({
        where: { id: existing.id },
        data: {
          nameNormalized: normalized,
          imageUrl: itemData.imageUrl,
          price: itemData.price,
          unit: itemData.unit,
        },
      });
    }
  }

  // Cập nhật toàn bộ item trong DB có nameNormalized
  const allExistingItems = await prisma.item.findMany();
  for (const it of allExistingItems) {
    if (!it.nameNormalized) {
      await prisma.item.update({
        where: { id: it.id },
        data: { nameNormalized: normalizeVietnamese(it.name) },
      });
    }
  }

  console.log("\n==================================================");
  console.log("🌱 SEED THÀNH CÔNG DỮ LIỆU MẪU 4 ROLES HỆ THỐNG");
  console.log("==================================================");
  console.log("1. 👑 Admin Account (Toàn quyền, Cài đặt):");
  console.log(`   Username: ${admin.username} | Password: ${adminPassword} | Role: ${admin.role}`);
  console.log("--------------------------------------------------");
  console.log("2. 👔 Quản Lý Account (BGH - Duyệt đơn, Quản lý kho):");
  console.log(`   Username: ${manager.username} | Password: ${managerPassword} | Role: ${manager.role}`);
  console.log("--------------------------------------------------");
  console.log("3. 📦 Thủ Kho Account (Kho, Nhập kho & Mua sắm):");
  console.log(`   Username: ${stocker.username} | Password: ${stockerPassword} | Role: ${stocker.role}`);
  console.log("--------------------------------------------------");
  console.log("4. 👩‍🏫 Giáo Viên Account (Tạo yêu cầu, Nhận đồ dùng):");
  console.log(`   Username: ${teacher.username} | Password: ${teacherPassword} | Role: ${teacher.role}`);
  console.log("==================================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed thất bại:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
