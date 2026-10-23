import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { LeaveService } from "@/services/leave.service";
import { successResponse, errorResponse } from "@/lib/api-response";

function isAuthorized(user: any): boolean {
  if (user.roleLevel >= 70) return true;
  if (["SUPER_ADMIN", "ADMIN", "CEO", "CHAIRPERSON", "HR"].includes(user.roleCode)) return true;
  return user.permissions?.some((p: string) => p.startsWith("leaves.") || p.startsWith("hr."));
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    if (!isAuthorized(user)) {
      return errorResponse("Forbidden: Executive or HR privileges required", "FORBIDDEN", 403);
    }

    const orgId = user.activeCompany?.id || user.employee?.organizationId || "org_nfvs_studio";
    const data = await LeaveService.getOrganizationManagementData(orgId);

    return successResponse(data);
  } catch (error: any) {
    console.error("[Leave Management GET Error]:", error);
    return errorResponse(error.message || "Failed to fetch leave management data", "INTERNAL_ERROR", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    if (!isAuthorized(user)) {
      return errorResponse("Forbidden: Executive or HR privileges required", "FORBIDDEN", 403);
    }

    const orgId = user.activeCompany?.id || user.employee?.organizationId || "org_nfvs_studio";
    const body = await req.json();
    const { action } = body;

    // 1. Update Policy (increase/decrease default days or edit policy)
    if (action === "UPDATE_POLICY") {
      const { policyId, annualAllowance, monthlyLimit, name, description, syncEmployeeBalances } = body;
      if (!policyId) return errorResponse("Policy ID is required", "BAD_REQUEST", 400);

      const updated = await LeaveService.updateLeavePolicy(policyId, {
        annualAllowance: typeof annualAllowance === "number" ? annualAllowance : undefined,
        monthlyLimit: typeof monthlyLimit === "number" ? monthlyLimit : undefined,
        name,
        description,
        syncEmployeeBalances: !!syncEmployeeBalances,
      });

      return successResponse(updated);
    }

    // 2. Adjust Individual Employee Balance (increase or decrease days)
    if (action === "ADJUST_BALANCE") {
      const { balanceId, adjustment } = body;
      if (!balanceId || typeof adjustment !== "number") {
        return errorResponse("Balance ID and adjustment number (+1, -1, etc.) are required", "BAD_REQUEST", 400);
      }

      const updated = await LeaveService.adjustEmployeeBalance(balanceId, adjustment);
      return successResponse(updated);
    }

    // 3. Reset All Organization Balances to Current Policy Defaults
    if (action === "RESET_ALL_BALANCES") {
      const result = await LeaveService.resetOrganizationBalances(orgId);
      return successResponse(result);
    }

    return errorResponse("Invalid action specified", "BAD_REQUEST", 400);
  } catch (error: any) {
    console.error("[Leave Management PATCH Error]:", error);
    return errorResponse(error.message || "Failed to process leave adjustment", "BAD_REQUEST", 400);
  }
}
