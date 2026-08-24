import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";
import { readSystemSettingsFromFile } from "@/lib/system-settings-file";
import { embedSchoolLogoInWorksheet } from "@/lib/excel-logo";
import ExcelJS from "exceljs";

// GET /api/purchase-proposals/export - Admin, Manager, Stocker
export const GET = requireRole(["admin", "manager", "stocker"], async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const themeFilter = searchParams.get("theme");

    const whereClause: any = {};
    if (themeFilter && themeFilter !== "all") {
      whereClause.sourceRequest = {
        purpose: themeFilter,
      };
    }

    const proposals = await prisma.purchaseProposal.findMany({
      where: whereClause,
      include: {
        item: true,
        sourceRequest: {
          include: {
            requester: true,
            requestItems: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group active proposals by itemId
    const groupedMap = new Map<string, {
      itemName: string;
      unit: string;
      quyCach: string;
      stockQty: number;
      totalRequestedQty: number;
      totalShortfallQty: number;
      price: number;
      requesters: string[];
    }>();

    proposals.forEach((p) => {
      if (p.status === "da_nhap_kho") return; // Export only active/needed purchase proposals

      const reqItem = p.sourceRequest.requestItems.find(
        (i) => i.itemId === p.itemId || (p.proposedName && i.proposedName === p.proposedName)
      );
      const requestedQty = reqItem ? reqItem.requestedQty : p.qty;
      const itemKey = p.itemId || `proposed-${p.proposedName}`;

      const itemName = p.item?.name || p.proposedName || "Mặt hàng đề xuất";
      const itemUnit = p.item?.unit || p.proposedUnit || "cái";
      const quyCach =
        p.item?.category === "hoc_tap"
          ? "Đồ dùng học tập"
          : p.item?.category === "ngoai_khoa"
          ? "Ngoại khóa & Sự kiện"
          : "Đề xuất mua mới";
      const stockQty = p.item?.quantity ?? 0;
      const itemPrice = p.item?.price || reqItem?.proposedPrice || 0;

      if (!groupedMap.has(itemKey)) {
        groupedMap.set(itemKey, {
          itemName,
          unit: itemUnit,
          quyCach,
          stockQty,
          totalRequestedQty: 0,
          totalShortfallQty: 0,
          price: itemPrice,
          requesters: [],
        });
      }

      const group = groupedMap.get(itemKey)!;
      group.totalRequestedQty += requestedQty;
      group.totalShortfallQty += p.qty;
      const requesterName = p.sourceRequest.requester.fullName || p.sourceRequest.requester.username;
      if (!group.requesters.includes(requesterName)) {
        group.requesters.push(requesterName);
      }
    });

    const groupedData = Array.from(groupedMap.values());

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Kho Mầm Non";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Yêu Cầu Mua Sắm", {
      views: [{ showGridLines: true }],
      pageSetup: {
        paperSize: 9, // A4
        orientation: "portrait",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.5,
          right: 0.5,
          top: 0.6,
          bottom: 0.6,
          header: 0.3,
          footer: 0.3,
        },
      },
    });

    // Font styles
    const FONT_FAMILY = "Times New Roman";

    const borderThin: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "FF334155" } },
      left: { style: "thin", color: { argb: "FF334155" } },
      bottom: { style: "thin", color: { argb: "FF334155" } },
      right: { style: "thin", color: { argb: "FF334155" } },
    };

    const borderDoubleBottom: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "FF334155" } },
      left: { style: "thin", color: { argb: "FF334155" } },
      bottom: { style: "double", color: { argb: "FF0F172A" } },
      right: { style: "thin", color: { argb: "FF334155" } },
    };

    // -------------------------------------------------------------
    // 1. TOP HEADER BOX (Rows 1 to 3)
    // -------------------------------------------------------------
    // Logo / School Info Block (A1:B3)
    worksheet.mergeCells("A1:B3");
    const logoCell = worksheet.getCell("A1");

    const currentSettings = readSystemSettingsFromFile();
    const schoolNameUpper = (currentSettings.school_name || "TRƯỜNG MẦM NON").toUpperCase();

    // Thử chèn logo hình ảnh thực tế nếu trường đã tải logo
    const hasLogo = await embedSchoolLogoInWorksheet(workbook, worksheet, {
      tl: { col: 0.15, row: 0.15 },
      br: { col: 1.85, row: 2.85 },
    });

    if (!hasLogo) {
      logoCell.value = `${schoolNameUpper}\nKHO ĐỒ DÙNG & GIÁO CỤ`;
      logoCell.font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: "FF0F766E" } };
      logoCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    }

    // Title Block (C1:F3)
    worksheet.mergeCells("C1:F3");
    const titleCell = worksheet.getCell("C1");
    titleCell.value = "YÊU CẦU MUA SẮM";
    titleCell.font = { name: FONT_FAMILY, size: 16, bold: true, color: { argb: "FF0F172A" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    // Form Code Block (G1:H3)
    worksheet.mergeCells("G1:H3");
    const codeCell = worksheet.getCell("G1");
    codeCell.value = "Mã số: HT/QT-01/M01\nHiệu lực: 01/11/2018";
    codeCell.font = { name: FONT_FAMILY, size: 9.5, italic: true, color: { argb: "FF475569" } };
    codeCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };

    // Apply borders and height to header box
    for (let r = 1; r <= 3; r++) {
      for (let c = 1; c <= 8; c++) {
        worksheet.getCell(r, c).border = borderThin;
      }
    }
    worksheet.getRow(1).height = 19;
    worksheet.getRow(2).height = 19;
    worksheet.getRow(3).height = 19;

    // -------------------------------------------------------------
    // 2. SECTION I: THÔNG TIN YÊU CẦU
    // -------------------------------------------------------------
    worksheet.getCell("A5").value = "I. YÊU CẦU MUA SẮM";
    worksheet.getCell("A5").font = { name: FONT_FAMILY, size: 12, bold: true, color: { argb: "FF0F766E" } };

    // Info metadata card (Rows 6-7)
    worksheet.mergeCells("A6:E6");
    worksheet.getCell("A6").value = `1. Đơn vị / Chủ đề yêu cầu: ${
      themeFilter && themeFilter !== "all" ? themeFilter : "Tất cả các khối lớp & Sự kiện chung của trường"
    }`;
    worksheet.getCell("A6").font = { name: FONT_FAMILY, size: 11, bold: Boolean(themeFilter && themeFilter !== "all") };

    worksheet.mergeCells("F6:H6");
    worksheet.getCell("F6").value = `Thời gian lập: ${new Date().toLocaleDateString("vi-VN")}`;
    worksheet.getCell("F6").font = { name: FONT_FAMILY, size: 11, italic: true };

    worksheet.getCell("A7").value = "2. Nội dung chi tiết các mặt hàng cần mua sắm:";
    worksheet.getCell("A7").font = { name: FONT_FAMILY, size: 11, bold: true };

    // -------------------------------------------------------------
    // 3. ITEMS TABLE HEADER (Row 8)
    // -------------------------------------------------------------
    const tableHeaderRow = worksheet.getRow(8);
    tableHeaderRow.values = [
      "Stt",
      "Tên tài sản/\ndịch vụ",
      "Đặc điểm/\nQuy cách",
      "Đvt",
      "SL\ntồn",
      "SL\ncần",
      "SL\nmua\nmới",
      "Ghi chú",
    ];
    tableHeaderRow.height = 36;

    for (let c = 1; c <= 8; c++) {
      const cell = tableHeaderRow.getCell(c);
      cell.font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F766E" }, // Dark Teal / Emerald
      };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = borderThin;
    }

    // -------------------------------------------------------------
    // 4. DATA ROWS (Row 9+)
    // -------------------------------------------------------------
    let currentRow = 9;
    let totalStock = 0;
    let totalRequested = 0;
    let totalShortfall = 0;

    if (groupedData.length === 0) {
      const row = worksheet.getRow(currentRow);
      row.values = [1, "(Không có mặt hàng nào cần mua)", "", "", "-", "-", "-", ""];
      row.height = 28;
      for (let c = 1; c <= 8; c++) {
        row.getCell(c).font = { name: FONT_FAMILY, size: 11, italic: true, color: { argb: "FF64748B" } };
        row.getCell(c).border = borderThin;
      }
      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
      currentRow++;
    } else {
      groupedData.forEach((item, idx) => {
        const row = worksheet.getRow(currentRow);
        const isEven = idx % 2 === 1;

        totalStock += item.stockQty;
        totalRequested += item.totalRequestedQty;
        totalShortfall += item.totalShortfallQty;

        row.values = [
          idx + 1,
          item.itemName,
          item.quyCach,
          item.unit,
          item.stockQty,
          item.totalRequestedQty,
          item.totalShortfallQty,
          item.requesters.join(", "),
        ];
        row.height = 26;

        for (let c = 1; c <= 8; c++) {
          const cell = row.getCell(c);
          cell.font = { name: FONT_FAMILY, size: 11, color: { argb: "FF1E293B" } };
          cell.border = borderThin;
          if (isEven) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF8FAFC" }, // Subtle soft light gray tint for even rows
            };
          }
        }

        // Alignments & accents
        row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        row.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
        row.getCell(2).font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: "FF0F172A" } };
        row.getCell(3).alignment = { horizontal: "left", vertical: "middle" };
        row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
        row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
        row.getCell(6).alignment = { horizontal: "center", vertical: "middle" };

        // Highlight SL Mua Mới with bold badge-like accent
        const toBuyCell = row.getCell(7);
        toBuyCell.alignment = { horizontal: "center", vertical: "middle" };
        toBuyCell.font = { name: FONT_FAMILY, size: 11.5, bold: true, color: { argb: "FFDC2626" } };
        toBuyCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEF2F2" }, // Soft rose tint
        };

        row.getCell(8).alignment = { horizontal: "left", vertical: "middle", wrapText: true };

        currentRow++;
      });

      // -------------------------------------------------------------
      // 4.1 TOTALS SUMMARY ROW
      // -------------------------------------------------------------
      const totalRow = worksheet.getRow(currentRow);
      worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
      totalRow.getCell(1).value = `TỔNG CỘNG (${groupedData.length} MẶT HÀNG):`;
      totalRow.getCell(5).value = totalStock;
      totalRow.getCell(6).value = totalRequested;
      totalRow.getCell(7).value = totalShortfall;
      totalRow.getCell(8).value = "";
      totalRow.height = 28;

      for (let c = 1; c <= 8; c++) {
        const cell = totalRow.getCell(c);
        cell.font = { name: FONT_FAMILY, size: 11.5, bold: true, color: { argb: "FF0F172A" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE2E8F0" }, // Soft slate
        };
        cell.border = borderDoubleBottom;
      }

      totalRow.getCell(1).alignment = { horizontal: "right", vertical: "middle" };
      totalRow.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
      totalRow.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
      totalRow.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
      totalRow.getCell(7).font = { name: FONT_FAMILY, size: 12, bold: true, color: { argb: "FFDC2626" } };

      currentRow++;
    }

    // -------------------------------------------------------------
    // 5. SECTION BELOW TABLE (Descriptions & Purpose)
    // -------------------------------------------------------------
    currentRow++;
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value =
      "3. Mô tả chi tiết (đính kèm file nếu có): .................................................................................................................................................................";
    worksheet.getCell(`A${currentRow}`).font = { name: FONT_FAMILY, size: 11 };

    currentRow++;
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value =
      "4. Mục đích sử dụng: Bổ sung, thay thế đồ dùng học tập và trang trí hoạt động trải nghiệm, ngoại khóa cho trẻ.";
    worksheet.getCell(`A${currentRow}`).font = { name: FONT_FAMILY, size: 11 };

    currentRow++;
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value =
      "5. Chi phí sử dụng:               ☑ Trong kế hoạch                           ☐ Ngoài kế hoạch";
    worksheet.getCell(`A${currentRow}`).font = { name: FONT_FAMILY, size: 11 };

    currentRow++;
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value =
      "Trường hợp ngoài kế hoạch thì giải thích lý do: ........................................................................ Chi phí dự kiến (nếu có): ...........................................";
    worksheet.getCell(`A${currentRow}`).font = { name: FONT_FAMILY, size: 11 };

    currentRow += 2;
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = "II. Ý kiến của Đơn vị chuyên môn (nếu có):";
    worksheet.getCell(`A${currentRow}`).font = { name: FONT_FAMILY, size: 12, bold: true, color: { argb: "FF0F766E" } };

    currentRow++;
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value =
      "....................................................................................................................................................................................................................................";
    worksheet.getCell(`A${currentRow}`).font = { name: FONT_FAMILY, size: 11 };

    // -------------------------------------------------------------
    // 6. SIGNATURES BOX (4 Columns Table)
    // -------------------------------------------------------------
    currentRow += 2;
    const sigHeaderRow = currentRow;
    const sigDateRow = currentRow + 1;
    const sigSpaceRow = currentRow + 2;

    // Header labels
    worksheet.mergeCells(`A${sigHeaderRow}:B${sigHeaderRow}`);
    worksheet.getCell(`A${sigHeaderRow}`).value = "BỘ PHẬN\nYÊU CẦU";

    worksheet.mergeCells(`C${sigHeaderRow}:D${sigHeaderRow}`);
    worksheet.getCell(`C${sigHeaderRow}`).value = "QUẢN LÝ\nBỘ PHẬN";

    worksheet.mergeCells(`E${sigHeaderRow}:F${sigHeaderRow}`);
    worksheet.getCell(`E${sigHeaderRow}`).value = "BỘ PHẬN MUA HÀNG\n& THỦ KHO";

    worksheet.mergeCells(`G${sigHeaderRow}:H${sigHeaderRow}`);
    worksheet.getCell(`G${sigHeaderRow}`).value = "BAN GIÁM HIỆU\nPHÊ DUYỆT";

    worksheet.getRow(sigHeaderRow).height = 34;

    // Date sub-labels
    worksheet.mergeCells(`A${sigDateRow}:B${sigDateRow}`);
    worksheet.getCell(`A${sigDateRow}`).value = "(Ngày    /    /20  )";

    worksheet.mergeCells(`C${sigDateRow}:D${sigDateRow}`);
    worksheet.getCell(`C${sigDateRow}`).value = "(Ngày    /    /20  )";

    worksheet.mergeCells(`E${sigDateRow}:F${sigDateRow}`);
    worksheet.getCell(`E${sigDateRow}`).value = "(Ngày    /    /20  )";

    worksheet.mergeCells(`G${sigDateRow}:H${sigDateRow}`);
    worksheet.getCell(`G${sigDateRow}`).value = "(Ngày    /    /20  )";

    worksheet.getRow(sigDateRow).height = 18;

    // Blank signing spaces
    worksheet.mergeCells(`A${sigSpaceRow}:B${sigSpaceRow}`);
    worksheet.mergeCells(`C${sigSpaceRow}:D${sigSpaceRow}`);
    worksheet.mergeCells(`E${sigSpaceRow}:F${sigSpaceRow}`);
    worksheet.mergeCells(`G${sigSpaceRow}:H${sigSpaceRow}`);
    worksheet.getRow(sigSpaceRow).height = 58;

    // Format signature boxes
    for (let r = sigHeaderRow; r <= sigSpaceRow; r++) {
      for (let c = 1; c <= 8; c++) {
        const cell = worksheet.getCell(r, c);
        cell.border = borderThin;
        if (r === sigHeaderRow) {
          cell.font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: "FF0F172A" } };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF1F5F9" },
          };
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        } else if (r === sigDateRow) {
          cell.font = { name: FONT_FAMILY, size: 9.5, italic: true, color: { argb: "FF64748B" } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }
      }
    }

    // -------------------------------------------------------------
    // 7. OPTIMIZED COLUMN WIDTHS (Clean, no text truncated)
    // -------------------------------------------------------------
    worksheet.getColumn(1).width = 7;   // Stt
    worksheet.getColumn(2).width = 30;  // Tên tài sản / dịch vụ
    worksheet.getColumn(3).width = 22;  // Đặc điểm / Quy cách
    worksheet.getColumn(4).width = 10;  // Đvt
    worksheet.getColumn(5).width = 11;  // SL tồn
    worksheet.getColumn(6).width = 11;  // SL cần
    worksheet.getColumn(7).width = 13;  // SL mua mới
    worksheet.getColumn(8).width = 28;  // Ghi chú (Giáo viên / Lớp)

    const buffer = await workbook.xlsx.writeBuffer();

    const safeThemeName =
      themeFilter && themeFilter !== "all"
        ? `_${encodeURIComponent(themeFilter.replace(/[\/\\?%*:|"<>]/g, "_").slice(0, 30))}`
        : "";

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="YEU_CAU_MUA_SAM${safeThemeName}_${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("GET /api/purchase-proposals/export error:", error);
    return NextResponse.json(
      { error: error?.message || "Lỗi hệ thống khi xuất file Excel yêu cầu mua sắm" },
      { status: 500 }
    );
  }
});
