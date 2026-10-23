import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { AuditService } from "@/services/audit.service";
import { z } from "zod";

const createHolidaySchema = z.object({
  name: z.string().min(2, "Holiday name is required"),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  type: z.enum(["NATIONAL", "REGIONAL", "OPTIONAL", "COMPANY"]).default("NATIONAL"),
  isRecurring: z.boolean().default(false),
});

const updateWorkDaySchema = z.object({
  configs: z.array(
    z.object({
      dayOfWeek: z.number().min(0).max(6),
      isWorkingDay: z.boolean(),
      isHalfDay: z.boolean().default(false),
      standardHours: z.number().default(8.0),
    })
  ),
});

import { LeaveStore } from "@/lib/leave-store";

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

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString(), 10);
    const orgId = user.employee?.organizationId || user.activeCompany?.id || "org_nfvs_studio";

    let workDays: any[] = [];
    let holidays: any[] = [];

    try {
      [workDays, holidays] = await withDbTimeout(
        Promise.all([
          db.workDayConfig.findMany({
            where: { organizationId: orgId },
            orderBy: { dayOfWeek: "asc" },
          }),
          db.holiday.findMany({
            where: {
              organizationId: orgId,
              year,
            },
            orderBy: { date: "asc" },
          }),
        ]),
        350
      );
    } catch {
      workDays = LeaveStore.getWorkDays(orgId);
      holidays = LeaveStore.getHolidays(orgId, year);
    }

    if (!workDays || workDays.length === 0) {
      workDays = LeaveStore.getWorkDays(orgId);
    }
    if (!holidays || holidays.length === 0) {
      holidays = LeaveStore.getHolidays(orgId, year);
    }

    return successResponse({ workDays, holidays, year });
  } catch (error: any) {
    console.error("[WorkDays GET Error]:", error);
    return errorResponse(error.message || "Failed to fetch work day configuration", "INTERNAL_ERROR", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);

    const userRole = user.roleCode;
    const isPrivileged = ["SUPER_ADMIN", "ADMIN", "CHAIRPERSON", "CEO", "DEPARTMENT_HEAD", "HR"].includes(userRole || "");
    if (!isPrivileged) {
      return errorResponse("Forbidden: HR or Admin privileges required", "FORBIDDEN", 403);
    }

    const orgId = user.employee?.organizationId || user.activeCompany?.id || "org_nfvs_studio";
    const body = await req.json();
    const action = body.action || "CREATE_HOLIDAY";

    if (action === "UPDATE_WORK_DAYS") {
      const parse = updateWorkDaySchema.safeParse(body);
      if (!parse.success) {
        return errorResponse(parse.error.issues[0].message, "VALIDATION_ERROR", 400);
      }

      await db.$transaction(
        parse.data.configs.map((c) =>
          db.workDayConfig.update({
            where: {
              organizationId_dayOfWeek: {
                organizationId: orgId,
                dayOfWeek: c.dayOfWeek,
              },
            },
            data: {
              isWorkingDay: c.isWorkingDay,
              isHalfDay: c.isHalfDay,
              expectedHours: c.standardHours,
            },
          })
        )
      );

      await AuditService.logMutation({
        actorId: user.id,
        action: "WORK_DAYS_CONFIG_UPDATED",
        entity: "WorkDayConfig",
        entityId: orgId,
        metadata: { configs: parse.data.configs },
      });

      return successResponse({ message: "Work day configuration updated successfully" });
    }

    // Default: Add Holiday
    const parseHoliday = createHolidaySchema.safeParse(body);
    if (!parseHoliday.success) {
      return errorResponse(parseHoliday.error.issues[0].message, "VALIDATION_ERROR", 400);
    }

    const holidayDate = new Date(parseHoliday.data.date);
    holidayDate.setHours(0, 0, 0, 0);
    const descText = parseHoliday.data.description
      ? `[${parseHoliday.data.type}] ${parseHoliday.data.description}`
      : `[${parseHoliday.data.type}]`;

    const holiday = await db.holiday.create({
      data: {
        organizationId: orgId,
        name: parseHoliday.data.name,
        date: holidayDate,
        description: descText,
        isRecurring: parseHoliday.data.isRecurring,
        year: holidayDate.getFullYear(),
      },
    });

    await AuditService.logMutation({
      actorId: user.id,
      action: "HOLIDAY_CREATED",
      entity: "Holiday",
      entityId: holiday.id,
      newValue: { name: holiday.name, date: holiday.date.toISOString() },
    });

    return successResponse(holiday, 201);
  } catch (error: any) {
    console.error("[WorkDays POST Error]:", error);
    return errorResponse(error.message || "Failed to update schedule", "BAD_REQUEST", 400);
  }
}
