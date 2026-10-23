import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { EmailService } from "@/services/email.service";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const { searchParams } = new URL(req.url);
    const targetOrgId =
      searchParams.get("organizationId") ||
      req.headers.get("x-company-id") ||
      user.activeCompany?.id ||
      user.employee?.organizationId;

    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (targetOrgId) {
      where.organizationId = targetOrgId;
    }
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { aadhaarNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const submissions = await db.preOnboardingSubmission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        organization: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return successResponse(submissions);
  } catch (err: any) {
    console.warn("[GET Pre-Onboarding Submissions Warning] Database query failed, returning empty queue:", err.message);
    return successResponse([]);
  }
}

/**
 * HR endpoint to dispatch an onboarding form invite directly to a candidate's email
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const body = await req.json();
    const { candidateEmail, candidateName, companyName, formUrl } = body;

    if (!candidateEmail) {
      return errorResponse("Candidate email is required", "VALIDATION_ERROR", 400);
    }

    const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://nfventurestudio.netlify.app").replace(/\/+$/, "");
    const activeOrg = user.activeCompany || {
      name: "Naree Foundation Venture Studio",
      code: "NFVS",
    };

    const targetUrl =
      formUrl ||
      `${appBaseUrl}/onboard?org=${(activeOrg.code || "").toUpperCase() === "NAREE" ? "NF" : "NFVS"}`;

    const effectiveCompanyName = companyName || activeOrg.name || "Naree Foundation & NFVS";

    const emailResult = await EmailService.sendPreOnboardingInvite({
      candidateEmail: candidateEmail.trim(),
      candidateName: candidateName?.trim(),
      companyName: effectiveCompanyName,
      formUrl: targetUrl,
    });

    return successResponse({
      success: true,
      emailResult,
      message: `Pre-onboarding form link successfully forwarded to ${candidateEmail}`,
    });
  } catch (err: any) {
    console.error("[Dispatch Form Invite Error]:", err);
    return errorResponse(err.message || "Failed to dispatch form invite", "INTERNAL_ERROR", 500);
  }
}
