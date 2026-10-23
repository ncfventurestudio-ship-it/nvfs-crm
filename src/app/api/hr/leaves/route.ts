import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { LeaveService } from "@/services/leave.service";
import { LeaveStore } from "@/lib/leave-store";
import { successResponse, errorResponse } from "@/lib/api-response";
import { z } from "zod";

const createLeaveSchema = z.object({
  leavePolicyCode: z.string().min(1, "Leave type is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(3, "Please provide a valid reason (min 3 chars)"),
});

function withDbTimeout<T>(promise: Promise<T>, ms = 350): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Database operation timed out")), ms)
    ),
  ]);
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);

    const employeeId = user.employee?.id || user.id;
    const currentYear = new Date().getFullYear();
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") || "my"; // "my" | "team" | "all"

    // 1. My Leaves scope
    if (scope === "my") {
      let balances: any[] = [];
      let myRequests: any[] = [];

      try {
        [balances, myRequests] = await withDbTimeout(
          Promise.all([
            db.leaveBalance.findMany({
              where: { employeeId, year: currentYear },
              include: { leavePolicy: true },
            }),
            db.leaveRequest.findMany({
              where: { employeeId },
              orderBy: { createdAt: "desc" },
              include: {
                leavePolicy: true,
                approvedBy: {
                  select: { firstName: true, lastName: true, designation: true },
                },
              },
            }),
          ]),
          350
        );
      } catch {
        // Fall back to resilient LeaveStore
        balances = LeaveStore.getBalances(employeeId, currentYear);
        myRequests = LeaveStore.getRequests({ employeeId });
      }

      if (!balances || balances.length === 0) {
        balances = LeaveStore.getBalances(employeeId, currentYear);
      }

      return successResponse({ balances, requests: myRequests });
    }

    // 2. Team Approvals scope (for Managers / Dept Heads)
    if (scope === "team") {
      let teamRequests: any[] = [];

      try {
        teamRequests = await withDbTimeout(
          db.leaveRequest.findMany({
            where: {
              employee: {
                managerId: employeeId,
              },
            },
            orderBy: { createdAt: "desc" },
            include: {
              employee: {
                select: {
                  firstName: true,
                  lastName: true,
                  employeeNumber: true,
                  designation: true,
                  department: { select: { name: true } },
                },
              },
              leavePolicy: true,
            },
          }),
          350
        );
      } catch {
        teamRequests = LeaveStore.getRequests({ managerId: employeeId });
      }

      return successResponse({ requests: teamRequests });
    }

    const companyId = user.activeCompany?.id || user.employee?.organizationId || "org_nfvs_studio";

    // 3. All Organization scope (HR, CEO, Super Admin)
    let allRequests: any[] = [];
    let policies: any[] = [];

    try {
      [allRequests, policies] = await withDbTimeout(
        Promise.all([
          db.leaveRequest.findMany({
            where: { employee: { organizationId: companyId } },
            take: 100,
            orderBy: { createdAt: "desc" },
            include: {
              employee: {
                select: {
                  firstName: true,
                  lastName: true,
                  employeeNumber: true,
                  designation: true,
                  department: { select: { name: true } },
                },
              },
              leavePolicy: true,
              approvedBy: {
                select: { firstName: true, lastName: true },
              },
            },
          }),
          db.leavePolicy.findMany({
            where: { organizationId: companyId },
            orderBy: { code: "asc" },
            include: {
              _count: { select: { leaveRequests: true } },
            },
          }),
        ]),
        350
      );
    } catch {
      allRequests = LeaveStore.getRequests({ orgId: companyId });
      policies = LeaveStore.getPolicies(companyId);
    }

    if (!policies || policies.length === 0) {
      policies = LeaveStore.getPolicies(companyId);
    }

    return successResponse({ requests: allRequests, policies });
  } catch (error: any) {
    console.error("[Leaves GET Error]:", error);
    return errorResponse(error.message || "Failed to retrieve leaves", "INTERNAL_ERROR", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Unauthorized: Active user session required to request leaves", "UNAUTHORIZED", 401);
    }

    const employeeId = user.employee?.id || user.id;

    const body = await req.json();
    const parse = createLeaveSchema.safeParse(body);
    if (!parse.success) {
      return errorResponse(parse.error.issues[0].message, "VALIDATION_ERROR", 400);
    }

    const request = await LeaveService.createLeaveRequest({
      employeeId,
      leavePolicyCode: parse.data.leavePolicyCode,
      startDate: parse.data.startDate,
      endDate: parse.data.endDate,
      reason: parse.data.reason,
    });

    return successResponse(request, 201);
  } catch (error: any) {
    console.error("[Leave Request Creation Error]:", error);
    return errorResponse(error.message || "Failed to create leave request", "BAD_REQUEST", 400);
  }
}
