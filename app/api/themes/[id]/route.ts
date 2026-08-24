import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";

// PATCH /api/themes/[id] - Cập nhật chủ đề / sự kiện
export const PATCH = requireRole(
  ["admin", "manager"],
  async (req: NextRequest, _user, context?: any) => {
    try {
      const params = await context?.params;
      const themeId = params?.id;

      if (!themeId) {
        return NextResponse.json({ error: "Mã chủ đề không hợp lệ" }, { status: 400 });
      }

      const body = await req.json();
      const { name, description, icon, startDate, endDate, isActive } = body;

      const dataToUpdate: any = {};
      if (name !== undefined) dataToUpdate.name = name.trim();
      if (description !== undefined) dataToUpdate.description = description ? description.trim() : null;
      if (icon !== undefined) dataToUpdate.icon = icon;
      if (startDate !== undefined) dataToUpdate.startDate = startDate ? new Date(startDate) : null;
      if (endDate !== undefined) dataToUpdate.endDate = endDate ? new Date(endDate) : null;
      if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);

      const updated = await prisma.eventTheme.update({
        where: { id: themeId },
        data: dataToUpdate,
      });

      return NextResponse.json({
        success: true,
        theme: updated,
        message: "Cập nhật chủ đề thành công!",
      });
    } catch (error: any) {
      console.error("PATCH /api/themes/[id] error:", error);
      return NextResponse.json(
        { error: error?.message || "Lỗi khi cập nhật chủ đề" },
        { status: 500 }
      );
    }
  }
);

// DELETE /api/themes/[id] - Xóa chủ đề
export const DELETE = requireRole(
  ["admin", "manager"],
  async (_req: NextRequest, _user, context?: any) => {
    try {
      const params = await context?.params;
      const themeId = params?.id;

      if (!themeId) {
        return NextResponse.json({ error: "Mã chủ đề không hợp lệ" }, { status: 400 });
      }

      // Check if theme is in use by requests
      const usageCount = await prisma.request.count({
        where: { themeId },
      });

      if (usageCount > 0) {
        // Deactivate instead of hard delete to preserve history
        await prisma.eventTheme.update({
          where: { id: themeId },
          data: { isActive: false },
        });

        return NextResponse.json({
          success: true,
          message: "Chủ đề đang có phiếu yêu cầu sử dụng nên đã được chuyển sang trạng thái Lưu trữ (Đóng).",
        });
      }

      await prisma.eventTheme.delete({
        where: { id: themeId },
      });

      return NextResponse.json({
        success: true,
        message: "Đã xóa chủ đề thành công!",
      });
    } catch (error: any) {
      console.error("DELETE /api/themes/[id] error:", error);
      return NextResponse.json(
        { error: error?.message || "Lỗi khi xóa chủ đề" },
        { status: 500 }
      );
    }
  }
);
