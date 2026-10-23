import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";
import { CalendarStore } from "@/lib/calendar-store";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser();
    if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);

    let event: any = null;
    try {
      event = await db.calendarEvent.findUnique({
        where: { id },
        include: { creator: true, department: true },
      });
    } catch {}

    if (!event) {
      event = CalendarStore.getById(id);
    }

    if (!event) return errorResponse("Calendar event not found", "NOT_FOUND", 404);

    return successResponse(event);
  } catch (error: any) {
    console.error("[Calendar GET ID Error]:", error);
    return errorResponse(error.message || "Failed to retrieve event", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser();
    if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);

    let event: any = null;
    try {
      event = await db.calendarEvent.findUnique({ where: { id } });
    } catch {}

    if (!event) {
      event = CalendarStore.getById(id);
    }

    if (!event) return errorResponse("Calendar event not found", "NOT_FOUND", 404);

    const userEmpId = user.employee?.id || user.id;
    const isCreator = event.creatorId === userEmpId;
    const isExec = ["SUPER_ADMIN", "ADMIN", "CEO", "COO", "HR"].includes(user.roleCode);
    if (!isCreator && !isExec) {
      return errorResponse("Forbidden: Only event organizer can delete this event", "FORBIDDEN", 403);
    }

    // Try deleting from database safely
    try {
      await db.calendarEvent.delete({ where: { id } });
    } catch {}

    // Delete from offline store
    CalendarStore.delete(id);

    return successResponse({ deleted: true, id });
  } catch (error: any) {
    console.error("[Calendar Delete Error]:", error);
    return errorResponse(error.message || "Failed to delete calendar event", "DELETE_FAILED", 500);
  }
}
