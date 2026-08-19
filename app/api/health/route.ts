import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", system: "Kho Mam Non API" });
}
