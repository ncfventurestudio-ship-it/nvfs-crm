import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { CalendarService } from "@/services/calendar.service";
import { successResponse, errorResponse } from "@/lib/api-response";
import { z } from "zod";

const createEventSchema = z.object({
  title: z.string().min(3, "Event title must be at least 3 characters"),
  description: z.string().optional(),
  type: z.enum(["MEETING", "COMPANY_EVENT", "CLIENT_MEETING", "DEADLINE", "OTHER"]).optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  isAllDay: z.boolean().optional(),
  location: z.string().optional(),
  meetUrl: z.string().optional(),
  departmentId: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  relatedTaskId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);

    if (!user.employee) {
      user.employee = {
        id: `emp_${user.id}`,
        employeeNumber: "EMP-OFFLINE",
        designation: user.roleName || "Corporate Staff",
        organizationName: user.activeCompany?.name || "NFVS Enterprise",
        organizationId: user.activeCompany?.id || "org_nfvs_corp",
        firstName: user.email.split("@")[0] || "Team",
        lastName: "Member",
      } as any;
    }

    const { searchParams } = new URL(req.url);

    // Default to current month window (-7 days to +35 days)
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const startDate = startDateStr ? new Date(startDateStr) : defaultStart;
    const endDate = endDateStr ? new Date(endDateStr) : defaultEnd;

    const typesParam = searchParams.get("types");
    const types = typesParam ? typesParam.split(",") : undefined;
    const departmentId = searchParams.get("departmentId") || undefined;

    const events = await CalendarService.getAggregatedEvents(user, {
      startDate,
      endDate,
      types,
      departmentId,
    });

    return successResponse({ events });
  } catch (error: any) {
    console.error("[Calendar GET Error]:", error);
    return errorResponse(error.message || "Failed to retrieve calendar items", "INTERNAL_ERROR", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);

    if (!user.employee) {
      user.employee = {
        id: `emp_${user.id}`,
        employeeNumber: "EMP-OFFLINE",
        designation: user.roleName || "Corporate Staff",
        organizationName: user.activeCompany?.name || "NFVS Enterprise",
        organizationId: user.activeCompany?.id || "org_nfvs_corp",
        firstName: user.email.split("@")[0] || "Team",
        lastName: "Member",
      } as any;
    }

    const body = await req.json();
    const parse = createEventSchema.safeParse(body);
    if (!parse.success) {
      return errorResponse(parse.error.issues[0].message, "VALIDATION_ERROR", 400);
    }

    const event = await CalendarService.createEvent(user, parse.data);
    return successResponse(event, 201);
  } catch (error: any) {
    console.error("[Calendar Event Create Error]:", error);
    return errorResponse(error.message || "Failed to create calendar event", "EVENT_CREATE_FAILED", 400);
  }
}
