import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser, invalidateUserSessionCache, ACTIVE_COMPANY_COOKIE_NAME } from "@/lib/auth";
import { invalidateOverviewDashboardCache } from "@/services/overview-dashboard.service";
import { invalidateCeoDashboardCache } from "@/services/ceo-dashboard.service";
import { AuditService } from "@/services/audit.service";
import { errorResponse, successResponse } from "@/lib/api-response";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Unauthenticated session", "UNAUTHORIZED", 401);
    }

    const body = await req.json();
    const { companyId } = body;

    if (!companyId || typeof companyId !== "string") {
      return errorResponse("Missing or invalid companyId", "INVALID_INPUT", 400);
    }

    const isSuperAdmin = user.roleCode === "SUPER_ADMIN" || user.roleLevel >= 100;

    // Verify company exists
    let targetCompany: any = null;
    try {
      targetCompany = await db.organization.findUnique({
        where: { id: companyId },
      });
    } catch (dbErr: any) {
      console.warn("[Switch Company] DB connection warning, using memory fallback:", dbErr.message);
    }

    if (!targetCompany) {
      if (companyId === "org_nfvs_studio" || companyId === "NFVS-STUDIO") {
        targetCompany = {
          id: "org_nfvs_studio",
          name: "Naree Foundation Venture Studio (NFVS)",
          code: "NFVS-STUDIO",
          primaryColor: "#2563eb",
          status: "ACTIVE",
        };
      } else if (companyId === "org_naree_foundation" || companyId === "NAREE") {
        targetCompany = {
          id: "org_naree_foundation",
          name: "Naree Foundation",
          code: "NAREE",
          primaryColor: "#10b981",
          status: "ACTIVE",
        };
      } else if (companyId === "org_nfvs_corp" || companyId === "NFVS-CORP") {
        targetCompany = {
          id: "org_nfvs_corp",
          name: "CRM + NFVS Enterprise Group",
          code: "NFVS-CORP",
          primaryColor: "#2563eb",
          status: "ACTIVE",
        };
      }
    }

    if (!targetCompany || targetCompany.status === "ARCHIVED") {
      return errorResponse("Target company not found or inactive", "NOT_FOUND", 404);
    }

    // Check membership authorization
    if (!isSuperAdmin) {
      const isMember = user.memberships.some((m) => m.companyId === companyId);
      if (!isMember) {
        return errorResponse(
          "Unauthorized: You are not an assigned member of this company",
          "FORBIDDEN",
          403
        );
      }
    }

    // Invalidate session cache and telemetry caches
    invalidateUserSessionCache(user.id);
    invalidateOverviewDashboardCache();
    invalidateCeoDashboardCache();

    // Set active company cookie (lax, httpOnly, 7 days)
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_COMPANY_COOKIE_NAME, companyId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    // Audit log company switch event
    await AuditService.logMutation({
      actorId: user.id,
      action: "COMPANY_SWITCH",
      entity: "Organization",
      entityId: companyId,
      organizationId: companyId,
      newValue: {
        companyId,
        companyName: targetCompany.name,
        companyCode: targetCompany.code,
      },
      metadata: {
        previousCompanyId: user.activeCompany?.id,
        userRole: user.roleCode,
      },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "Browser",
    });

    return successResponse({
      activeCompanyId: targetCompany.id,
      companyName: targetCompany.name,
      companyCode: targetCompany.code,
      primaryColor: targetCompany.primaryColor,
      secondaryColor: targetCompany.secondaryColor,
      message: `Switched context to ${targetCompany.name}`,
    });
  } catch (error) {
    console.error("[Switch Company API Error]:", error);
    return errorResponse("Failed to switch company context", "INTERNAL_ERROR", 500);
  }
}
