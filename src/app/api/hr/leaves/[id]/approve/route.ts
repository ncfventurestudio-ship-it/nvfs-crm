import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { LeaveService } from "@/services/leave.service";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const approverEmployeeId = user.employee?.id || user.id;
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const notes = body.notes || "Approved";

    const updated = await LeaveService.approveLeaveRequest(id, approverEmployeeId, notes);
    return successResponse(updated);
  } catch (error: any) {
    console.error("[Leave Approve Error]:", error);
    return errorResponse(error.message || "Failed to approve leave request", "BAD_REQUEST", 400);
  }
}
