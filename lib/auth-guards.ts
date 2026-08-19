import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromReq, JWTPayload } from "./auth";

export type AuthenticatedHandler = (
  req: NextRequest,
  user: JWTPayload,
  context?: any
) => Promise<NextResponse> | NextResponse;

export function requireAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest, context?: any) => {
    const user = await getAuthUserFromReq(req);
    if (!user) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để thực hiện thao tác này" },
        { status: 401 }
      );
    }
    return handler(req, user, context);
  };
}

export function requireRole(
  requiredRoles: string | string[],
  handler: AuthenticatedHandler
) {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

  return async (req: NextRequest, context?: any) => {
    const user = await getAuthUserFromReq(req);
    if (!user) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để thực hiện thao tác này" },
        { status: 401 }
      );
    }
    if (!roles.includes(user.role)) {
      return NextResponse.json(
        { error: "Bạn không có quyền thực hiện thao tác này" },
        { status: 403 }
      );
    }
    return handler(req, user, context);
  };
}
