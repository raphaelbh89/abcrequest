import { requireAuth } from "@/lib/auth-guards";
import { NextResponse } from "next/server";

export const GET = requireAuth((_req, user) => {
  return NextResponse.json({ user });
});
