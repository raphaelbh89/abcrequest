import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/db";
import { NextRequest } from "next/server";
import { GET as getThemes, POST as createTheme } from "../app/api/themes/route";
import { POST as createRequest } from "../app/api/requests/route";
import { PATCH as approveRequest } from "../app/api/requests/[id]/approve/route";
import { GET as getProposals } from "../app/api/purchase-proposals/route";
import { GET as exportProposals } from "../app/api/purchase-proposals/export/route";
import { createJWT } from "../lib/auth";

describe("Integration Tests: Event Themes & Aggregated Purchase Proposals Workflow", async () => {
  let adminUser: any;
  let teacherA: any;
  let teacherB: any;
  let adminToken: string;
  let teacherAToken: string;
  let teacherBToken: string;

  let testItem1: any;
  let testItem2: any;
  let createdTheme: any;

  test("1. Chuẩn bị dữ liệu tài khoản Giáo viên, Admin và Mặt hàng kho", async () => {
    // 1. Tạo hoặc lấy tài khoản Admin & Giáo viên
    adminUser = await prisma.user.upsert({
      where: { username: "admin_theme_test" },
      update: {},
      create: {
        username: "admin_theme_test",
        passwordHash: "hash",
        fullName: "Hiệu Trưởng Test",
        role: "admin",
      },
    });

    teacherA = await prisma.user.upsert({
      where: { username: "teacher_mam1_test" },
      update: {},
      create: {
        username: "teacher_mam1_test",
        passwordHash: "hash",
        fullName: "Cô Lan (Lớp Mầm 1)",
        role: "teacher",
      },
    });

    teacherB = await prisma.user.upsert({
      where: { username: "teacher_choi1_test" },
      update: {},
      create: {
        username: "teacher_choi1_test",
        passwordHash: "hash",
        fullName: "Cô Mai (Lớp Chồi 1)",
        role: "teacher",
      },
    });

    adminToken = await createJWT({ id: adminUser.id, username: adminUser.username, role: adminUser.role, fullName: adminUser.fullName });
    teacherAToken = await createJWT({ id: teacherA.id, username: teacherA.username, role: teacherA.role, fullName: teacherA.fullName });
    teacherBToken = await createJWT({ id: teacherB.id, username: teacherB.username, role: teacherB.role, fullName: teacherB.fullName });

    // 2. Tạo 2 mặt hàng trong kho với số lượng ít để tạo shortfall
    testItem1 = await prisma.item.create({
      data: {
        name: "Giấy A4 Bìa Màu Đỏ Test Theme",
        category: "hoc_tap",
        unit: "xấp",
        quantity: 2, // Tồn kho = 2
        minStock: 5,
        price: 50000,
      },
    });

    testItem2 = await prisma.item.create({
      data: {
        name: "Bút Sáp Màu 24 Màu Test Theme",
        category: "hoc_tap",
        unit: "hộp",
        quantity: 5, // Tồn kho = 5
        minStock: 10,
        price: 30000,
      },
    });

    assert.ok(adminUser.id);
    assert.ok(teacherA.id);
    assert.ok(testItem1.id);
  });

  test("2. Admin khởi tạo Chủ đề / Sự kiện chung của trường qua /api/themes", async () => {
    const req = new NextRequest("http://localhost:3000/api/themes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `token=${adminToken}`,
      },
      body: JSON.stringify({
        name: "🏮 Lễ hội Trung Thu 2026 Test",
        description: "Kế hoạch tổ chức tết Trung Thu cho các bé toàn trường",
        icon: "🏮",
        isActive: true,
      }),
    });

    const res = await createTheme(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.theme?.id);
    assert.equal(data.theme.name, "🏮 Lễ hội Trung Thu 2026 Test");

    createdTheme = data.theme;

    // Kiểm tra GET /api/themes trả về danh sách có chứa chủ đề vừa tạo
    const getReq = new NextRequest("http://localhost:3000/api/themes", {
      headers: { Cookie: `token=${teacherAToken}` },
    });
    const getRes = await getThemes(getReq);
    const getData = await getRes.json();

    assert.equal(getRes.status, 200);
    assert.ok(getData.themes.some((t: any) => t.name === "🏮 Lễ hội Trung Thu 2026 Test"));
  });

  test("3. Hai giáo viên (Mầm 1 & Chồi 1) tạo 2 phiếu yêu cầu cùng chọn Chủ đề Trung Thu", async () => {
    // Phiếu 1: Cô Lan (Mầm 1) xin 5 Giấy đỏ (Kho có 2 -> Cấp 2, Thiếu 3) & 10 Bút sáp (Kho có 5 -> Cấp 5, Thiếu 5)
    const reqA = new NextRequest("http://localhost:3000/api/requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `token=${teacherAToken}`,
      },
      body: JSON.stringify({
        purpose: "🏮 Lễ hội Trung Thu 2026 Test",
        themeId: createdTheme.id,
        neededDate: "2026-09-15",
        note: "Đồ dùng làm lồng đèn cho lớp Mầm 1",
        items: [
          { itemId: testItem1.id, name: testItem1.name, unit: testItem1.unit, requestedQty: 5 },
          { itemId: testItem2.id, name: testItem2.name, unit: testItem2.unit, requestedQty: 10 },
        ],
      }),
    });

    const resA = await createRequest(reqA);
    const dataA = await resA.json();
    assert.equal(resA.status, 200);
    assert.ok(dataA.request?.id);

    // Phiếu 2: Cô Mai (Chồi 1) xin 4 Giấy đỏ (Kho hết -> Cấp 0, Thiếu 4) & 1 món đề xuất mới "Lồng đèn giấy mẫu"
    const reqB = new NextRequest("http://localhost:3000/api/requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `token=${teacherBToken}`,
      },
      body: JSON.stringify({
        purpose: "🏮 Lễ hội Trung Thu 2026 Test",
        themeId: createdTheme.id,
        neededDate: "2026-09-15",
        note: "Đồ dùng biểu diễn lớp Chồi 1",
        items: [
          { itemId: testItem1.id, name: testItem1.name, unit: testItem1.unit, requestedQty: 4 },
          {
            isNewItemProposal: true,
            name: "Lồng đèn giấy khung tre mẫu",
            unit: "cái",
            requestedQty: 15,
            proposedPrice: 20000,
          },
        ],
      }),
    });

    const resB = await createRequest(reqB);
    const dataB = await resB.json();
    assert.equal(resB.status, 200);
    assert.ok(dataB.request?.id);

    // Admin duyệt cả 2 phiếu
    const decideReqA = new NextRequest(`http://localhost:3000/api/requests/${dataA.request.id}/approve`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `token=${adminToken}`,
      },
      body: JSON.stringify({}),
    });
    const approveResA = await approveRequest(decideReqA, { params: Promise.resolve({ id: dataA.request.id }) });
    assert.equal(approveResA.status, 200);

    const decideReqB = new NextRequest(`http://localhost:3000/api/requests/${dataB.request.id}/approve`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `token=${adminToken}`,
      },
      body: JSON.stringify({}),
    });
    const approveResB = await approveRequest(decideReqB, { params: Promise.resolve({ id: dataB.request.id }) });
    assert.equal(approveResB.status, 200);
  });

  test("4. Kiểm tra Tổng Hợp Đề Xuất Mua Sắm Gộp Theo Chủ Đề (/api/purchase-proposals)", async () => {
    const req = new NextRequest("http://localhost:3000/api/purchase-proposals", {
      headers: { Cookie: `token=${adminToken}` },
    });

    const res = await getProposals(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(data.groupedByTheme));

    // Tìm nhóm chủ đề Trung Thu
    const themeGroup = data.groupedByTheme.find((tg: any) => tg.theme === "🏮 Lễ hội Trung Thu 2026 Test");
    assert.ok(themeGroup, "Phải tìm thấy nhóm chủ đề Trung Thu trong groupedByTheme");

    // 1. Kiểm tra danh sách giáo viên/lớp tham gia: Có cả Cô Lan và Cô Mai
    assert.equal(themeGroup.requesters.length, 2);
    assert.ok(themeGroup.requesters.some((r: any) => r.fullName.includes("Cô Lan")));
    assert.ok(themeGroup.requesters.some((r: any) => r.fullName.includes("Cô Mai")));

    // 2. Kiểm tra mặt hàng Giấy đỏ được gộp chung: Thiếu (3 từ Mầm 1 + 4 từ Chồi 1) = 7 xấp
    const giayDoItem = themeGroup.items.find((it: any) => it.itemId === testItem1.id);
    assert.ok(giayDoItem, "Phải có mặt hàng Giấy đỏ");
    assert.equal(giayDoItem.totalNeededQty, 7, "Tổng số lượng Giấy đỏ cần mua phải = 7");
    assert.equal(giayDoItem.classes.length, 2, "Có 2 lớp đóng góp vào món này");

    // 3. Kiểm tra mặt hàng Bút sáp: Thiếu 5 hộp
    const butSapItem = themeGroup.items.find((it: any) => it.itemId === testItem2.id);
    assert.ok(butSapItem);
    assert.equal(butSapItem.totalNeededQty, 5);

    // 4. Kiểm tra mặt hàng Đề xuất mới: Thiếu 15 cái
    const longDenItem = themeGroup.items.find((it: any) => it.itemName === "Lồng đèn giấy khung tre mẫu");
    assert.ok(longDenItem);
    assert.equal(longDenItem.totalNeededQty, 15);

    // 5. Kiểm tra dự toán kinh phí cho sự kiện Trung Thu:
    // (7 * 50k) + (5 * 30k) + (15 * 20k) = 350k + 150k + 300k = 800,000 đ
    assert.equal(themeGroup.estimatedBudget, 800000, "Dự toán kinh phí phải chuẩn xác 800,000 đ");

    // 6. Kiểm tra lọc theo Chủ đề query param ?theme=...
    const filterReq = new NextRequest(`http://localhost:3000/api/purchase-proposals?theme=${encodeURIComponent("🏮 Lễ hội Trung Thu 2026 Test")}`, {
      headers: { Cookie: `token=${adminToken}` },
    });
    const filterRes = await getProposals(filterReq);
    const filterData = await filterRes.json();
    assert.equal(filterRes.status, 200);
    assert.ok(filterData.proposals.every((p: any) => p.sourceRequest.purpose === "🏮 Lễ hội Trung Thu 2026 Test"));
  });

  test("5. Kiểm tra Xuất Excel Yêu Cầu Mua Sắm riêng cho Chủ Đề (/api/purchase-proposals/export?theme=...)", async () => {
    const exportReq = new NextRequest(
      `http://localhost:3000/api/purchase-proposals/export?theme=${encodeURIComponent("🏮 Lễ hội Trung Thu 2026 Test")}`,
      { headers: { Cookie: `token=${adminToken}` } }
    );

    const res = await exportProposals(exportReq);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("Content-Type"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    const contentDisposition = res.headers.get("Content-Disposition") || "";
    assert.ok(contentDisposition.includes("attachment; filename="));
    assert.ok(contentDisposition.includes(".xlsx"));
  });

  test("6. Dọn dẹp dữ liệu kiểm thử an toàn", async () => {
    if (createdTheme?.id) {
      await prisma.purchaseProposal.deleteMany({
        where: { sourceRequest: { themeId: createdTheme.id } },
      });
      await prisma.requestItem.deleteMany({
        where: { request: { themeId: createdTheme.id } },
      });
      await prisma.request.deleteMany({
        where: { themeId: createdTheme.id },
      });
      await prisma.eventTheme.deleteMany({
        where: { id: createdTheme.id },
      });
    }

    if (testItem1?.id) {
      await prisma.stockTransaction.deleteMany({ where: { itemId: testItem1.id } });
      await prisma.item.delete({ where: { id: testItem1.id } });
    }
    if (testItem2?.id) {
      await prisma.stockTransaction.deleteMany({ where: { itemId: testItem2.id } });
      await prisma.item.delete({ where: { id: testItem2.id } });
    }

    await prisma.user.deleteMany({
      where: { username: { in: ["admin_theme_test", "teacher_mam1_test", "teacher_choi1_test"] } },
    });
  });
});
