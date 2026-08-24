import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";
import { readSystemSettingsFromFile } from "@/lib/system-settings-file";
import { embedSchoolLogoInWorksheet } from "@/lib/excel-logo";
import ExcelJS from "exceljs";

// GET /api/requests/[id]/export - Export single request to Excel (.xlsx)
export const GET = requireAuth(async (_req: NextRequest, _user, context?: any) => {
  try {
    const params = await context?.params;
    const requestId = params?.id;

    if (!requestId) {
      return NextResponse.json({ error: "Mã yêu cầu không hợp lệ" }, { status: 400 });
    }

    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        requester: true,
        decidedByUser: true,
        requestItems: {
          include: { item: true },
        },
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Yêu cầu không tồn tại" }, { status: 404 });
    }

    const currentSettings = readSystemSettingsFromFile();
    const schoolNameUpper = (currentSettings.school_name || "TRƯỜNG MẦM NON").toUpperCase();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Kho Mầm Non";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Phiếu Yêu Cầu", {
      views: [{ showGridLines: true }],
      pageSetup: {
        paperSize: 9, // A4
        orientation: "portrait",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.4,
          right: 0.4,
          top: 0.5,
          bottom: 0.5,
          header: 0.2,
          footer: 0.2,
        },
      },
    });

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

    const hasLogo = await embedSchoolLogoInWorksheet(workbook, worksheet, {
      tl: { col: 0.05, row: 0.05 },
      br: { col: 1.95, row: 2.95 },
    });

    if (!hasLogo) {
      logoCell.value = `${schoolNameUpper}\nKHO ĐỒ DÙNG & GIÁO CỤ`;
      logoCell.font = { name: FONT_FAMILY, size: 10.5, bold: true, color: { argb: "FF047857" } };
      logoCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    }

    // Title Block (C1:F3)
    worksheet.mergeCells("C1:F3");
    const titleCell = worksheet.getCell("C1");
    titleCell.value = "PHIẾU YÊU CẦU ĐỒ DÙNG HỌC TẬP & NGOẠI KHÓA";
    titleCell.font = { name: FONT_FAMILY, size: 14, bold: true, color: { argb: "FF064E3B" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

    // Form Code Block (G1:H3)
    worksheet.mergeCells("G1:H3");
    const codeCell = worksheet.getCell("G1");
    codeCell.value = `Mã phiếu: #${request.id.slice(0, 8).toUpperCase()}\nNgày tạo: ${new Date(request.createdAt).toLocaleDateString("vi-VN")}`;
    codeCell.font = { name: FONT_FAMILY, size: 9.5, italic: true, color: { argb: "FF475569" } };
    codeCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

    for (let r = 1; r <= 3; r++) {
      for (let c = 1; c <= 8; c++) {
        worksheet.getCell(r, c).border = borderThin;
      }
    }
    worksheet.getRow(1).height = 20;
    worksheet.getRow(2).height = 20;
    worksheet.getRow(3).height = 20;

    // -------------------------------------------------------------
    // 2. METADATA INFO SECTION (Rows 5 to 7) - Spanning A:D and E:H (No Text Clipping)
    // -------------------------------------------------------------
    const statusTextMap: Record<string, string> = {
      pending: "Chờ ban giám hiệu duyệt",
      approved: "Đã phê duyệt",
      rejected: "Đã từ chối",
      cancelled: "Đã hủy phiếu",
    };

    const formattedNeededDate = new Date(request.neededDate).toLocaleDateString("vi-VN");

    // Row 5
    worksheet.mergeCells("A5:D5");
    const cellA5 = worksheet.getCell("A5");
    cellA5.value = `• Chủ đề / Hoạt động: ${request.purpose}`;
    cellA5.font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: "FF047857" } };

    worksheet.mergeCells("E5:H5");
    const cellE5 = worksheet.getCell("E5");
    cellE5.value = `• Trạng thái duyệt: ${statusTextMap[request.status] || request.status}`;
    cellE5.font = {
      name: FONT_FAMILY,
      size: 11,
      bold: true,
      color: { argb: request.status === "approved" ? "FF047857" : request.status === "rejected" ? "FFDC2626" : "FFD97706" },
    };

    // Row 6
    worksheet.mergeCells("A6:D6");
    const cellA6 = worksheet.getCell("A6");
    cellA6.value = `• Giáo viên yêu cầu: ${request.requester.fullName} (${request.requester.username})`;
    cellA6.font = { name: FONT_FAMILY, size: 11 };

    worksheet.mergeCells("E6:H6");
    const cellE6 = worksheet.getCell("E6");
    cellE6.value = `• Ngày cần sử dụng: ${formattedNeededDate}`;
    cellE6.font = { name: FONT_FAMILY, size: 11 };

    // Row 7
    worksheet.mergeCells("A7:D7");
    const cellA7 = worksheet.getCell("A7");
    cellA7.value = `• Ghi chú của cô: ${request.note || "(Không có)"}`;
    cellA7.font = { name: FONT_FAMILY, size: 11, italic: !request.note };

    worksheet.mergeCells("E7:H7");
    const cellE7 = worksheet.getCell("E7");
    const approverText = request.rejectReason
      ? `• Lý do từ chối: ${request.rejectReason}`
      : `• Người duyệt: ${request.decidedByUser ? request.decidedByUser.fullName : "Chờ duyệt"}`;
    cellE7.value = approverText;
    cellE7.font = {
      name: FONT_FAMILY,
      size: 11,
      color: { argb: request.rejectReason ? "FFDC2626" : "FF1E293B" },
    };

    worksheet.getRow(5).height = 20;
    worksheet.getRow(6).height = 20;
    worksheet.getRow(7).height = 20;

    // -------------------------------------------------------------
    // 3. TABLE HEADER (Row 9)
    // -------------------------------------------------------------
    const headerRowNumber = 9;
    const headers = [
      "STT",
      "Tên Đồ Dùng / Học Liệu",
      "Phân Loại",
      "ĐVT",
      "SL Xin",
      "Cấp Từ Kho",
      "Cần Mua Mới",
      "Trạng Thái Duyệt",
    ];

    const headerRow = worksheet.getRow(headerRowNumber);
    headerRow.values = headers;
    headerRow.height = 32;

    headerRow.eachCell((cell) => {
      cell.font = { name: FONT_FAMILY, bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF047857" }, // Deep Emerald
      };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = borderThin;
    });

    // -------------------------------------------------------------
    // 4. DATA ROWS
    // -------------------------------------------------------------
    let totalRequestedQty = 0;
    let totalAllocatedQty = 0;
    let totalShortfallQty = 0;

    let currentRow = headerRowNumber + 1;

    request.requestItems.forEach((itemLine, index) => {
      const row = worksheet.getRow(currentRow);
      const isEven = index % 2 === 1;

      const itemName = itemLine.item?.name || itemLine.proposedName || "Mặt hàng đề xuất";
      const itemUnit = itemLine.item?.unit || itemLine.proposedUnit || "cái";
      const categoryLabel =
        itemLine.item?.category === "hoc_tap"
          ? "Học tập"
          : itemLine.item?.category === "ngoai_khoa"
          ? "Ngoại khóa & Sự kiện"
          : "Đề xuất mua mới";
      const isItemRejected = itemLine.status === "rejected";

      const allocQty = isItemRejected ? 0 : itemLine.allocatedQty;
      const shortQty = isItemRejected ? 0 : itemLine.shortfallQty;

      totalRequestedQty += itemLine.requestedQty;
      totalAllocatedQty += allocQty;
      totalShortfallQty += shortQty;

      let statusApprovalText = "Được duyệt";
      if (isItemRejected) {
        statusApprovalText = "Từ chối cấp";
      } else if (itemLine.isNewItemProposal) {
        statusApprovalText = "Đề xuất mua mới (Chưa có trong kho)";
      } else if (itemLine.shortfallQty > 0) {
        statusApprovalText = "Cấp một phần (Chờ mua thêm)";
      }

      row.values = [
        index + 1,
        itemName,
        categoryLabel,
        itemUnit,
        itemLine.requestedQty,
        allocQty,
        shortQty,
        statusApprovalText,
      ];
      row.height = 28;

      for (let c = 1; c <= 8; c++) {
        const cell = row.getCell(c);
        cell.font = { name: FONT_FAMILY, size: 11, color: { argb: "FF1E293B" } };
        cell.border = borderThin;
        if (isEven) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8FAFC" },
          };
        }
      }

      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(2).alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      row.getCell(2).font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: "FF0F172A" } };
      row.getCell(3).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(8).alignment = { horizontal: "center", vertical: "middle", wrapText: true };

      if (isItemRejected) {
        row.getCell(2).font = { name: FONT_FAMILY, size: 11, strike: true, color: { argb: "FF94A3B8" } };
        row.getCell(8).font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: "FFDC2626" } };
      } else if (itemLine.shortfallQty > 0) {
        row.getCell(7).font = { name: FONT_FAMILY, size: 11.5, bold: true, color: { argb: "FFD97706" } };
        row.getCell(7).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFFBEB" }, // Soft amber tint
        };
      }

      currentRow++;
    });

    // -------------------------------------------------------------
    // 5. TOTALS SUMMARY ROW
    // -------------------------------------------------------------
    const totalRow = worksheet.getRow(currentRow);
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    totalRow.getCell(1).value = `TỔNG CỘNG (${request.requestItems.length} MÓN):`;
    totalRow.getCell(5).value = totalRequestedQty;
    totalRow.getCell(6).value = totalAllocatedQty;
    totalRow.getCell(7).value = totalShortfallQty;
    totalRow.getCell(8).value = "";
    totalRow.height = 28;

    for (let c = 1; c <= 8; c++) {
      const cell = totalRow.getCell(c);
      cell.font = { name: FONT_FAMILY, size: 11.5, bold: true, color: { argb: "FF0F172A" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE2E8F0" },
      };
      cell.border = borderDoubleBottom;
    }

    totalRow.getCell(1).alignment = { horizontal: "right", vertical: "middle" };
    totalRow.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
    totalRow.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
    totalRow.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
    totalRow.getCell(7).font = { name: FONT_FAMILY, size: 12, bold: true, color: { argb: "FFD97706" } };

    // -------------------------------------------------------------
    // 6. THREE-COLUMN SIGNATURE BOX (Proper width spans)
    // -------------------------------------------------------------
    currentRow += 3;
    const sigHeaderRow = currentRow;
    const sigDateRow = currentRow + 1;
    const sigSpaceRow = currentRow + 2;

    worksheet.mergeCells(`A${sigHeaderRow}:C${sigHeaderRow}`);
    worksheet.getCell(`A${sigHeaderRow}`).value = "GIÁO VIÊN YÊU CẦU";

    worksheet.mergeCells(`D${sigHeaderRow}:F${sigHeaderRow}`);
    worksheet.getCell(`D${sigHeaderRow}`).value = "BỘ PHẬN CẤP PHÁT / THỦ KHO";

    worksheet.mergeCells(`G${sigHeaderRow}:H${sigHeaderRow}`);
    worksheet.getCell(`G${sigHeaderRow}`).value = "BAN GIÁM HIỆU PHÊ DUYỆT";

    worksheet.getRow(sigHeaderRow).height = 34;

    worksheet.mergeCells(`A${sigDateRow}:C${sigDateRow}`);
    worksheet.getCell(`A${sigDateRow}`).value = "(Ký và ghi rõ họ tên)";

    worksheet.mergeCells(`D${sigDateRow}:F${sigDateRow}`);
    worksheet.getCell(`D${sigDateRow}`).value = "(Ký và ghi rõ họ tên)";

    worksheet.mergeCells(`G${sigDateRow}:H${sigDateRow}`);
    worksheet.getCell(`G${sigDateRow}`).value = "(Ký và ghi rõ họ tên)";

    worksheet.getRow(sigDateRow).height = 18;

    worksheet.mergeCells(`A${sigSpaceRow}:C${sigSpaceRow}`);
    worksheet.mergeCells(`D${sigSpaceRow}:F${sigSpaceRow}`);
    worksheet.mergeCells(`G${sigSpaceRow}:H${sigSpaceRow}`);
    worksheet.getRow(sigSpaceRow).height = 58;

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
    // 7. COLUMN WIDTHS (Optimized for zero text clipping)
    // -------------------------------------------------------------
    worksheet.getColumn(1).width = 6;   // STT
    worksheet.getColumn(2).width = 34;  // Tên đồ dùng
    worksheet.getColumn(3).width = 20;  // Phân loại
    worksheet.getColumn(4).width = 9;   // ĐVT
    worksheet.getColumn(5).width = 12;  // SL Xin
    worksheet.getColumn(6).width = 13;  // Cấp từ kho
    worksheet.getColumn(7).width = 14;  // Cần mua mới
    worksheet.getColumn(8).width = 30;  // Trạng thái duyệt

    const buffer = await workbook.xlsx.writeBuffer();
    const sanitizedFilename = `Phieu_Yeu_Cau_${request.id.slice(0, 8)}.xlsx`;

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${sanitizedFilename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/requests/[id]/export error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi xuất file Excel phiếu yêu cầu" },
      { status: 500 }
    );
  }
});
