import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const { id } = await params;
    const body = await req.json();
    const { status, createdEmployeeId, notes } = body;

    const updated = await db.preOnboardingSubmission.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(createdEmployeeId !== undefined ? { createdEmployeeId } : {}),
        ...(notes !== undefined ? { notes } : {}),
        updatedAt: new Date(),
      },
    });

    return successResponse(updated);
  } catch (err: any) {
    console.error("[Update Pre-Onboarding Submission Error]:", err);
    return errorResponse(err.message || "Failed to update submission", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const { id } = await params;
    await db.preOnboardingSubmission.delete({
      where: { id },
    });

    return successResponse({ success: true, message: "Submission removed" });
  } catch (err: any) {
    console.error("[Delete Pre-Onboarding Submission Error]:", err);
    return errorResponse(err.message || "Failed to delete submission", "INTERNAL_ERROR", 500);
  }
}
