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
    });

    // 1. Title Block & School Header
    worksheet.mergeCells("A1:H1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = `${schoolNameUpper} - PHIẾU YÊU CẦU ĐỒ DÙNG`;
    titleCell.font = { name: "Times New Roman", size: 16, bold: true, color: { argb: "FF047857" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(1).height = 35;

    // 2. Request Info Metadata
    const statusTextMap: Record<string, string> = {
      pending: "Chờ duyệt",
      approved: "Đã duyệt",
      rejected: "Từ chối",
      cancelled: "Đã hủy",
    };

    const formattedCreatedDate = new Date(request.createdAt).toLocaleDateString("vi-VN");
    const formattedNeededDate = new Date(request.neededDate).toLocaleDateString("vi-VN");

    worksheet.getCell("A3").value = "Chủ đề / Hoạt động:";
    worksheet.getCell("A3").font = { name: "Times New Roman", bold: true };
    worksheet.getCell("B3").value = request.purpose;
    worksheet.getCell("B3").font = { name: "Times New Roman" };

    worksheet.getCell("E3").value = "Trạng thái:";
    worksheet.getCell("E3").font = { name: "Times New Roman", bold: true };
    worksheet.getCell("F3").value = statusTextMap[request.status] || request.status;
    worksheet.getCell("F3").font = { name: "Times New Roman" };

    worksheet.getCell("A4").value = "Người yêu cầu:";
    worksheet.getCell("A4").font = { name: "Times New Roman", bold: true };
    worksheet.getCell("B4").value = `${request.requester.fullName} (${request.requester.username})`;
    worksheet.getCell("B4").font = { name: "Times New Roman" };

    worksheet.getCell("E4").value = "Ngày tạo phiếu:";
    worksheet.getCell("E4").font = { name: "Times New Roman", bold: true };
    worksheet.getCell("F4").value = formattedCreatedDate;
    worksheet.getCell("F4").font = { name: "Times New Roman" };

    worksheet.getCell("A5").value = "Ngày cần sử dụng:";
    worksheet.getCell("A5").font = { name: "Times New Roman", bold: true };
    worksheet.getCell("B5").value = formattedNeededDate;
    worksheet.getCell("B5").font = { name: "Times New Roman" };

    if (request.decidedByUser) {
      worksheet.getCell("E5").value = "Người xử lý:";
      worksheet.getCell("E5").font = { name: "Times New Roman", bold: true };
      worksheet.getCell("F5").value = request.decidedByUser.fullName;
      worksheet.getCell("F5").font = { name: "Times New Roman" };
    }

    if (request.note) {
      worksheet.getCell("A6").value = "Ghi chú:";
      worksheet.getCell("A6").font = { name: "Times New Roman", bold: true };
      worksheet.getCell("B6").value = request.note;
      worksheet.getCell("B6").font = { name: "Times New Roman" };
    }

    if (request.rejectReason) {
      worksheet.getCell("A7").value = "Thông báo từ Quản lý:";
      worksheet.getCell("A7").font = { name: "Times New Roman", bold: true, color: { argb: "FFDC2626" } };
      worksheet.getCell("B7").value = request.rejectReason;
      worksheet.getCell("B7").font = { name: "Times New Roman", color: { argb: "FFDC2626" } };
    }

    // 3. Table Header
    const headerRowNumber = 9;
    const headers = [
      "STT",
      "Tên đồ dùng",
      "Phân loại",
      "Đơn vị tính",
      "Số lượng xin",
      "Cấp từ kho",
      "Cần mua thêm",
      "Trạng thái duyệt",
    ];

    const headerRow = worksheet.getRow(headerRowNumber);
    headerRow.values = headers;
    headerRow.height = 26;

    headerRow.eachCell((cell) => {
      cell.font = { name: "Times New Roman", bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF059669" }, // Emerald 600
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // 4. Data Rows
    request.requestItems.forEach((itemLine, index) => {
      const rowNum = headerRowNumber + 1 + index;
      const row = worksheet.getRow(rowNum);
      const itemName = itemLine.item?.name || itemLine.proposedName || "Mặt hàng đề xuất";
      const itemUnit = itemLine.item?.unit || itemLine.proposedUnit || "cái";
      const categoryLabel = itemLine.item?.category === "hoc_tap" ? "Học tập" : itemLine.item?.category === "ngoai_khoa" ? "Ngoại khóa & Trang trí" : "Đề xuất mới";
      const isItemRejected = itemLine.status === "rejected";

      let statusApprovalText = "Được duyệt";
      if (isItemRejected) {
        statusApprovalText = "Từ chối cấp";
      } else if (itemLine.isNewItemProposal) {
        statusApprovalText = "Đề xuất mua mới (Chưa có trong kho)";
      } else if (itemLine.shortfallQty > 0) {
        statusApprovalText = "Cấp một phần (Chờ mua)";
      }

      row.values = [
        index + 1,
        itemName,
        categoryLabel,
        itemUnit,
        itemLine.requestedQty,
        isItemRejected ? 0 : itemLine.allocatedQty,
        isItemRejected ? 0 : itemLine.shortfallQty,
        statusApprovalText,
      ];

      row.alignment = { vertical: "middle" };
      for (let c = 1; c <= 8; c++) {
        row.getCell(c).font = { name: "Times New Roman", size: 11 };
        row.getCell(c).border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
      }

      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(6).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(7).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(8).alignment = { horizontal: "center", vertical: "middle" };

      if (isItemRejected) {
        row.getCell(2).font = { name: "Times New Roman", size: 11, strike: true, color: { argb: "FF9CA3AF" } };
        row.getCell(8).font = { name: "Times New Roman", size: 11, bold: true, color: { argb: "FFDC2626" } };
      } else if (itemLine.shortfallQty > 0) {
        row.getCell(7).font = { name: "Times New Roman", size: 11, bold: true, color: { argb: "FFD97706" } };
      }
    });

    // Column widths
    worksheet.getColumn(1).width = 8;
    worksheet.getColumn(2).width = 30;
    worksheet.getColumn(3).width = 22;
    worksheet.getColumn(4).width = 12;
    worksheet.getColumn(5).width = 14;
    worksheet.getColumn(6).width = 16;
    worksheet.getColumn(7).width = 16;
    worksheet.getColumn(8).width = 22;

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
