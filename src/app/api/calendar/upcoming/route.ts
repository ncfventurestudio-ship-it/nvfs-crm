import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";
import { CalendarStore } from "@/lib/calendar-store";

function withDbTimeout<T>(promise: Promise<T>, ms = 400): Promise<T> {
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
    if (!user) {
      return errorResponse("Unauthenticated", "UNAUTHORIZED", 401);
    }

    const orgId = user.employee?.organizationId || user.activeCompany?.id || "org_nfvs_corp";
    const employeeId = user.employee?.id || user.id;
    const departmentId = user.employee?.departmentId || null;

    const now = new Date();
    const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let events: any[] = [];
    try {
      events = await withDbTimeout(
        db.calendarEvent.findMany({
          where: {
            organizationId: orgId,
            startDate: { gte: now, lte: endOfWeek },
            OR: [
              { creatorId: employeeId },
              { departmentId: departmentId },
              { departmentId: null }, // Org-wide events
            ],
          },
          orderBy: { startDate: "asc" },
          take: 5,
        }),
        400
      );
    } catch {
      events = CalendarStore.getByOrgAndDateRange(orgId, now, endOfWeek).slice(0, 5);
    }

    return successResponse(events);
  } catch (error: any) {
    console.error("[Upcoming Calendar API Error]:", error);
    return errorResponse("Failed to fetch upcoming schedule", "INTERNAL_ERROR", 500);
  }
}
