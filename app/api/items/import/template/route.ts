import { NextResponse } from "next/server";
import { generateInventoryImportTemplateBuffer } from "@/lib/excel-import";

export async function GET() {
  try {
    const buffer = await generateInventoryImportTemplateBuffer();

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="mau_nhap_kho_do_dung_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("GET /api/items/import/template error:", error);
    return NextResponse.json(
      { error: "Không thể sinh file mẫu Excel" },
      { status: 500 }
    );
  }
}
