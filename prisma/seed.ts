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

  // Seed default system settings
  const defaultSettings = [
    { key: "school_name", value: "Trường Mầm Non Họa Mi" },
    { key: "app_title", value: "Kho Mầm Non" },
    { key: "subtitle", value: "Quản lý đồ dùng & giáo cụ" },
    { key: "logo_icon", value: "Boxes" },
    { key: "logo_url", value: "" },
    { key: "phone", value: "024 3852 1199" },
    { key: "address", value: "Số 128 Đường Hoa Hồng, Quận Cầu Giấy, Hà Nội" },
    { key: "default_min_stock", value: "5" },
  ];

  for (const s of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
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

  // Seed sample items
  const sampleItems = [
    {
      name: "Bút màu dạ 12 màu",
      category: "hoc_tap",
      unit: "hộp",
      quantity: 15,
      minStock: 5,
      price: 25000,
      location: "Kệ A1",
    },
    {
      name: "Giấy A4 màu thủ công",
      category: "hoc_tap",
      unit: "ram",
      quantity: 3, // LOW STOCK
      minStock: 10,
      price: 35000,
      location: "Kệ A2",
    },
    {
      name: "Ruy-băng trang trí hoa",
      category: "ngoai_khoa",
      unit: "cuộn",
      quantity: 20,
      minStock: 5,
      price: 12000,
      location: "Tủ 1",
    },
    {
      name: "Keo dán nến đóng khung",
      category: "ngoai_khoa",
      unit: "gói",
      quantity: 2, // LOW STOCK
      minStock: 8,
      price: 8000,
      location: "Tủ 2",
    },
  ];

  for (const itemData of sampleItems) {
    const existing = await prisma.item.findFirst({
      where: { name: itemData.name },
    });
    if (!existing) {
      const item = await prisma.item.create({
        data: itemData,
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
