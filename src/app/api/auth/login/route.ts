import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AuthService } from "@/services/auth.service";
import { AuditService } from "@/services/audit.service";
import { errorResponse, successResponse } from "@/lib/api-response";
import { loginSchema } from "@/validations/auth.schema";
import { createSessionToken, SESSION_COOKIE_NAME, invalidateUserSessionCache } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(
        parseResult.error.issues[0].message,
        "VALIDATION_ERROR",
        400
      );
    }

    const { email, password } = parseResult.data;

    const user = await AuthService.verifyCredentials(email, password);
    if (!user) {
      return errorResponse(
        "Invalid corporate email or password",
        "INVALID_CREDENTIALS",
        401
      );
    }

    // Explicitly set active company context cookie to guarantee immediate tenant isolation
    const companyId = user.activeCompany?.id || user.employee?.organizationId;

    // Generate secure session token
    const token = createSessionToken({
      id: user.id,
      email: user.email,
      roleCode: user.roleCode,
      activeCompanyId: companyId,
    });

    // Set HTTP-only session cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    if (companyId) {
      cookieStore.set("nfvs_active_company", companyId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });
    }

    invalidateUserSessionCache(user.id);

    // Audit log
    await AuditService.logMutation({
      actorId: user.id,
      organizationId: companyId || undefined,
      action: "AUTH_LOGIN_SUCCESS",
      entity: "User",
      entityId: user.id,
      newValue: { email: user.email, role: user.roleCode, companyId },
      metadata: { source: "login_route" },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "Browser",
    });

    const designation = (user.employee?.designation || "").trim().toLowerCase();
    const isAccountant =
      designation.includes("accountant") ||
      designation.includes("accounts") ||
      (user.roleCode as string) === "ACCOUNTANT";

    const targetDashboard =
      isAccountant
        ? "/app/accounts"
        : user.roleCode === "SUPER_ADMIN"
          ? "/app/super-admin"
          : user.roleCode === "ADMIN"
            ? "/app/dashboard/admin"
            : user.roleCode === "CEO" || user.roleCode === "CHAIRPERSON"
              ? "/app/dashboard/ceo"
              : user.roleCode === "CFO"
                ? "/app/dashboard/cfo"
                : user.roleCode === "COO"
                  ? "/app/dashboard/coo"
                  : user.roleCode === "CTO" || user.roleCode === "CIO"
                    ? "/app/dashboard/cto"
                    : user.roleCode === "CMO"
                      ? "/app/dashboard/cmo"
                      : user.roleCode === "HR"
                        ? "/app/dashboard/hr"
                        : "/app/overview";
    return successResponse({ ...user, targetDashboard });
  } catch (error) {
    console.error("[Login API Error]:", error);
    return errorResponse(
      "Authentication failed due to server error",
      "INTERNAL_ERROR",
      500
    );
  }
}
