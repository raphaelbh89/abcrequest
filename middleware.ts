import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "kho-mam-non-secret-key-2026-secure-jwt"
);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;

  let userPayload: { role?: string; [key: string]: any } | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      userPayload = payload as { role?: string };
    } catch {
      userPayload = null;
    }
  }

  // Redirect to dashboard if logged in and trying to access /login
  if (pathname === "/login") {
    if (userPayload) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Protected pages & APIs
  const isProtectedPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/inventory") ||
    pathname.startsWith("/requests") ||
    pathname.startsWith("/admin");

  const isAdminOnly = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  if (isProtectedPage && !userPayload) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminOnly) {
    if (!userPayload) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Vui lòng đăng nhập để truy cập tài nguyên này" },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (userPayload.role !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Truy cập bị từ chối: Bạn không có quyền Admin" },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/inventory/:path*",
    "/requests/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
