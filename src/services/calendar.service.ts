import { db } from "@/lib/db";
import { AuthenticatedUser } from "@/types";
import { EventBusService } from "./event-bus.service";
import { AuditService } from "./audit.service";
import { CalendarStore } from "@/lib/calendar-store";

export type UnifiedEventType =
  | "MEETING"
  | "COMPANY_EVENT"
  | "CLIENT_MEETING"
  | "TASK_DUE"
  | "HOLIDAY"
  | "LEAVE"
  | "DEADLINE"
  | "CURRENT_AFFAIR";

export interface UnifiedCalendarItem {
  id: string;
  title: string;
  description?: string | null;
  type: UnifiedEventType;
  startDate: string; // ISO
  endDate: string; // ISO
  isAllDay: boolean;
  color: string;
  sourceEntity: "CalendarEvent" | "Task" | "Holiday" | "LeaveRequest" | "ComplianceRecord" | "LegalDeadline" | "LegalCaseEvent" | "LegalContract";
  sourceId: string;
  location?: string | null;
  meetUrl?: string | null;
  badgeLabel?: string;
  metadata?: Record<string, any>;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  type?: "MEETING" | "COMPANY_EVENT" | "CLIENT_MEETING" | "DEADLINE" | "OTHER";
  startDate: string | Date;
  endDate: string | Date;
  isAllDay?: boolean;
  location?: string;
  meetUrl?: string;
  departmentId?: string;
  attendees?: string[]; // Array of employee IDs
  relatedTaskId?: string;
}

function withDbTimeout<T>(promise: Promise<T>, ms = 400): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Database operation timed out")), ms)
    ),
  ]);
}

export class CalendarService {
  /**
   * Aggregates multiple enterprise data streams into a unified corporate calendar
   */
  static async getAggregatedEvents(
    user: AuthenticatedUser,
    options: {
      startDate: Date;
      endDate: Date;
      types?: string[];
      departmentId?: string;
    }
  ): Promise<UnifiedCalendarItem[]> {
    const orgId = user.employee?.organizationId || user.activeCompany?.id || "org_nfvs_corp";
    const { startDate, endDate, types } = options;

    const includeAll = !types || types.length === 0 || types.includes("ALL");
    const canInclude = (t: string) => includeAll || (types && types.includes(t));

    const results: UnifiedCalendarItem[] = [];

    // 1. Direct Calendar Events (Meetings, Company Events, Client Demos, Current Affairs)
    if (canInclude("MEETING") || canInclude("COMPANY_EVENT") || canInclude("CLIENT_MEETING") || canInclude("CURRENT_AFFAIR")) {
      let calEvents: any[] = [];
      try {
        calEvents = await withDbTimeout(
          db.calendarEvent.findMany({
            where: {
              organizationId: orgId,
              startDate: { lte: endDate },
              endDate: { gte: startDate },
            },
            include: {
              creator: { select: { firstName: true, lastName: true } },
            },
          }),
          400
        );
      } catch (e: any) {
        console.warn("[CalendarService] DB query failed, using CalendarStore:", e.message);
        const stored = CalendarStore.getByOrgAndDateRange(orgId, startDate, endDate);
        calEvents = stored.map((s) => ({
          ...s,
          startDate: new Date(s.startDate),
          endDate: new Date(s.endDate),
          creator: s.creator || { firstName: "Operations", lastName: "Director" },
        }));
      }

      for (const ev of calEvents) {
        const titleLower = ev.title.toLowerCase();
        const descLower = (ev.description || "").toLowerCase();
        const isCurrentAffair =
          titleLower.includes("observance") ||
          titleLower.includes("affair") ||
          titleLower.includes("national") ||
          titleLower.includes("jayanti") ||
          titleLower.includes("summit") ||
          descLower.includes("commemoration") ||
          descLower.includes("observance") ||
          ev.type === "CURRENT_AFFAIR";

        if (!includeAll && types && types.length > 0) {
          if (isCurrentAffair && !types.includes("CURRENT_AFFAIR") && !types.includes("COMPANY_EVENT")) continue;
          if (!isCurrentAffair && !types.includes(ev.type)) continue;
        }

        let color = "#3b82f6"; // Blue for general meetings
        if (isCurrentAffair) color = "#f59e0b"; // Amber Gold for Current Affairs & Observances
        else if (ev.type === "COMPANY_EVENT") color = "#8b5cf6"; // Purple
        else if (ev.type === "CLIENT_MEETING") color = "#06b6d4"; // Cyan
        else if (ev.type === "DEADLINE") color = "#f43f5e"; // Rose

        const eventType = isCurrentAffair ? "CURRENT_AFFAIR" : (ev.type as UnifiedEventType);
        const badgeLabel = isCurrentAffair
          ? "Current Affairs"
          : ev.type.replace(/_/g, " ");

        results.push({
          id: `cal-${ev.id}`,
          title: ev.title,
          description: ev.description,
          type: eventType,
          startDate: ev.startDate.toISOString(),
          endDate: ev.endDate.toISOString(),
          isAllDay: ev.isAllDay,
          color,
          sourceEntity: "CalendarEvent",
          sourceId: ev.id,
          location: ev.location,
          meetUrl: ev.meetUrl,
          badgeLabel,
          metadata: {
            creatorName: ev.creator ? `${ev.creator.firstName} ${ev.creator.lastName}` : "Operations Leader",
            attendees: ev.attendees ? JSON.parse(ev.attendees) : [],
          },
        });
      }
    }

    // 2. Corporate Holidays (HR Core)
    if (canInclude("HOLIDAY")) {
      let holidays: any[] = [];
      try {
        holidays = await withDbTimeout(
          db.holiday.findMany({
            where: {
              organizationId: orgId,
              date: { gte: startDate, lte: endDate },
            },
          }),
          150
        );
      } catch {
        const defaultHolidays = [
          { id: "h1", name: "Republic Day", date: new Date("2026-01-26"), isRecurring: true, description: "National Holiday" },
          { id: "h2", name: "Independence Day", date: new Date("2026-08-15"), isRecurring: true, description: "National Holiday" },
          { id: "h3", name: "Mahatma Gandhi Jayanti", date: new Date("2026-10-02"), isRecurring: true, description: "National Observance" },
          { id: "h4", name: "Diwali (Festival of Lights)", date: new Date("2026-11-08"), isRecurring: false, description: "Public Holiday" },
          { id: "h5", name: "Christmas Day", date: new Date("2026-12-25"), isRecurring: true, description: "Public Holiday" },
        ];
        holidays = defaultHolidays.filter((h) => h.date >= startDate && h.date <= endDate);
      }

      for (const h of holidays) {
        results.push({
          id: `hol-${h.id}`,
          title: `🎉 ${h.name}`,
          description: h.description,
          type: "HOLIDAY",
          startDate: new Date(h.date).toISOString(),
          endDate: new Date(h.date).toISOString(),
          isAllDay: true,
          color: "#10b981", // Emerald
          sourceEntity: "Holiday",
          sourceId: h.id,
          badgeLabel: "Public Holiday",
          metadata: { isRecurring: h.isRecurring },
        });
      }
    }

    // 3. Approved Employee Leaves (HR Core)
    if (canInclude("LEAVE")) {
      let leaves: any[] = [];
      try {
        leaves = await withDbTimeout(
          db.leaveRequest.findMany({
            where: {
              employee: { organizationId: orgId },
              status: "APPROVED",
              startDate: { lte: endDate },
              endDate: { gte: startDate },
            },
            include: {
              employee: { select: { firstName: true, lastName: true } },
              leavePolicy: { select: { code: true, name: true } },
            },
          }),
          150
        );
      } catch {}

      for (const lv of leaves) {
        results.push({
          id: `leave-${lv.id}`,
          title: `🌴 ${lv.employee.firstName} ${lv.employee.lastName} on ${lv.leavePolicy.code}`,
          description: `Approved Leave: ${lv.leavePolicy.name} (${lv.daysCount} days)`,
          type: "LEAVE",
          startDate: lv.startDate.toISOString(),
          endDate: lv.endDate.toISOString(),
          isAllDay: true,
          color: "#a855f7", // Fuchsia / Lavender
          sourceEntity: "LeaveRequest",
          sourceId: lv.id,
          badgeLabel: lv.leavePolicy.code,
          metadata: {
            employeeName: `${lv.employee.firstName} ${lv.employee.lastName}`,
            daysCount: lv.daysCount,
          },
        });
      }
    }

    // 4. Tasks with Due Dates in range
    if (canInclude("TASK_DUE")) {
      let tasks: any[] = [];
      try {
        tasks = await withDbTimeout(
          db.task.findMany({
            where: {
              organizationId: orgId,
              dueDate: { gte: startDate, lte: endDate },
              status: { notIn: ["CANCELLED"] },
            },
            include: {
              assignee: { select: { firstName: true, lastName: true } },
            },
          }),
          150
        );
      } catch {}

      for (const t of tasks) {
        const isUrgent = t.priority === "URGENT";
        results.push({
          id: `task-${t.id}`,
          title: `📌 Due: ${t.title}`,
          description: t.description,
          type: "TASK_DUE",
          startDate: t.dueDate!.toISOString(),
          endDate: t.dueDate!.toISOString(),
          isAllDay: true,
          color: isUrgent ? "#ef4444" : "#f59e0b", // Amber or Red
          sourceEntity: "Task",
          sourceId: t.id,
          badgeLabel: `Task (${t.status})`,
          metadata: {
            priority: t.priority,
            status: t.status,
            assignee: t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : "Unassigned",
          },
        });
      }
    }

    // 5. Statutory Compliance Deadlines (HR Core)
    if (canInclude("DEADLINE")) {
      let compliance: any[] = [];
      try {
        compliance = await withDbTimeout(
          db.complianceRecord.findMany({
            where: {
              organizationId: orgId,
              dueDate: { gte: startDate, lte: endDate },
              status: { in: ["PENDING", "UNDER_REVIEW"] },
            },
          }),
          150
        );
      } catch {}

      for (const c of compliance) {
        results.push({
          id: `comp-${c.id}`,
          title: `⚖️ Compliance Due: ${c.item}`,
          description: c.notes || undefined,
          type: "DEADLINE",
          startDate: c.dueDate.toISOString(),
          endDate: c.dueDate.toISOString(),
          isAllDay: true,
          color: "#e11d48", // Rose Red
          sourceEntity: "ComplianceRecord",
          sourceId: c.id,
          badgeLabel: "Statutory",
          metadata: {
            item: c.item,
            status: c.status,
          },
        });
      }
    }

    // 6. Operational Milestones & Deadlines (Block 9)
    if (canInclude("DEADLINE") || canInclude("OPERATION")) {
      let operations: any[] = [];
      let milestones: any[] = [];
      try {
        operations = await withDbTimeout(
          db.operation.findMany({
            where: {
              organizationId: orgId,
              expectedCompletionDate: { gte: startDate, lte: endDate },
            },
            include: {
              owner: { select: { firstName: true, lastName: true } },
              department: { select: { name: true } },
            },
          }),
          150
        );
      } catch {}

      for (const op of operations) {
        results.push({
          id: `op-${op.id}`,
          title: `[Op Deadline] ${op.name}`,
          description: op.description || `Operation ${op.operationCode} scheduled delivery`,
          type: "DEADLINE",
          startDate: op.expectedCompletionDate.toISOString(),
          endDate: op.expectedCompletionDate.toISOString(),
          isAllDay: true,
          color: op.priority === "CRITICAL" ? "#ef4444" : "#f59e0b",
          sourceEntity: "Task" as any,
          sourceId: op.id,
          badgeLabel: `Op ${op.status}`,
          metadata: {
            code: op.operationCode,
            ownerName: `${op.owner.firstName} ${op.owner.lastName}`,
            department: op.department.name,
            actionUrl: `/app/operations/${op.id}`,
          },
        });
      }

      try {
        milestones = await withDbTimeout(
          db.operationMilestone.findMany({
            where: {
              operation: { organizationId: orgId },
              dueDate: { gte: startDate, lte: endDate },
            },
            include: {
              operation: { select: { id: true, operationCode: true, name: true } },
            },
          }),
          150
        );
      } catch {}

      for (const m of milestones) {
        results.push({
          id: `ms-${m.id}`,
          title: `[Milestone] ${m.title}`,
          description: m.description,
          type: "DEADLINE",
          startDate: m.dueDate.toISOString(),
          endDate: m.dueDate.toISOString(),
          isAllDay: true,
          color: "#8b5cf6",
          sourceEntity: "Task" as any,
          sourceId: m.operationId,
          badgeLabel: "Milestone",
          metadata: {
            operationCode: m.operation.operationCode,
            actionUrl: `/app/operations/${m.operation.id}`,
          },
        });
      }
    }

    // 7. Legal Deadlines, Case Hearings & Contract Milestones (Block 10)
    if (canInclude("DEADLINE") || canInclude("LEGAL")) {
      let legalDeadlines: any[] = [];
      let caseEvents: any[] = [];
      let expiringContracts: any[] = [];
      try {
        [legalDeadlines, caseEvents, expiringContracts] = await withDbTimeout(
          Promise.all([
            db.legalDeadline.findMany({
              where: {
                organizationId: orgId,
                dueDate: { gte: startDate, lte: endDate },
              },
              include: {
                owner: { select: { firstName: true, lastName: true } },
                contract: { select: { contractNumber: true, title: true } },
                case: { select: { caseNumber: true, title: true } },
              },
            }).catch(() => []),
            db.legalCaseEvent.findMany({
              where: {
                case: { organizationId: orgId },
                eventDate: { gte: startDate, lte: endDate },
              },
              include: {
                case: { select: { id: true, caseNumber: true, title: true } },
              },
            }).catch(() => []),
            db.legalContract.findMany({
              where: {
                organizationId: orgId,
                expiryDate: { gte: startDate, lte: endDate },
                status: { in: ["ACTIVE", "EXPIRING_SOON"] },
              },
            }).catch(() => []),
          ]),
          150
        );
      } catch {}

      for (const ld of legalDeadlines) {
        let color = "#e11d48"; // Red for critical
        if (ld.priority === "HIGH") color = "#f97316";
        else if (ld.priority === "MEDIUM") color = "#f59e0b";
        else if (ld.priority === "LOW") color = "#10b981";

        results.push({
          id: `ld-${ld.id}`,
          title: `⚖️ [Legal] ${ld.title}`,
          description: ld.notes || `Legal deadline: ${ld.deadlineType}`,
          type: "DEADLINE",
          startDate: ld.dueDate.toISOString(),
          endDate: ld.dueDate.toISOString(),
          isAllDay: true,
          color,
          sourceEntity: "LegalDeadline",
          sourceId: ld.id,
          badgeLabel: ld.priority,
          metadata: {
            deadlineType: ld.deadlineType,
            status: ld.status,
            ownerName: `${ld.owner.firstName} ${ld.owner.lastName}`,
            actionUrl: ld.contractId
              ? `/app/legal/contracts/${ld.contractId}`
              : ld.caseId
              ? `/app/legal/cases/${ld.caseId}`
              : `/app/legal/deadlines`,
          },
        });
      }

      for (const ce of caseEvents) {
        results.push({
          id: `ce-${ce.id}`,
          title: `🏛️ [Court/Case] ${ce.title} (${ce.case.caseNumber})`,
          description: ce.description || `Case hearing/proceeding: ${ce.eventType}`,
          type: "DEADLINE",
          startDate: ce.eventDate.toISOString(),
          endDate: ce.eventDate.toISOString(),
          isAllDay: true,
          color: "#8b5cf6", // Purple
          sourceEntity: "LegalCaseEvent",
          sourceId: ce.id,
          location: ce.location,
          badgeLabel: ce.eventType,
          metadata: {
            caseId: ce.case.id,
            caseNumber: ce.case.caseNumber,
            actionUrl: `/app/legal/cases/${ce.case.id}`,
          },
        });
      }

      for (const ec of expiringContracts) {
        if (!ec.expiryDate) continue;
        results.push({
          id: `ctr-exp-${ec.id}`,
          title: `📜 [Contract Expiry] ${ec.title} (${ec.contractNumber})`,
          description: `Contract ${ec.contractNumber} expires on this date`,
          type: "DEADLINE",
          startDate: ec.expiryDate.toISOString(),
          endDate: ec.expiryDate.toISOString(),
          isAllDay: true,
          color: "#ef4444",
          sourceEntity: "LegalContract",
          sourceId: ec.id,
          badgeLabel: "Contract Expiry",
          metadata: {
            contractId: ec.id,
            actionUrl: `/app/legal/contracts/${ec.id}`,
          },
        });
      }
    }

    // Sort chronologically
    results.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    return results;
  }

  /**
   * Schedule a new corporate meeting or event
   */
  static async createEvent(user: AuthenticatedUser, data: CreateEventInput) {
    const orgId = user.employee?.organizationId || user.activeCompany?.id || "org_nfvs_corp";
    const creatorId = user.employee?.id || user.id;

    let event: any = null;

    try {
      event = await withDbTimeout(
        db.calendarEvent.create({
          data: {
            organizationId: orgId,
            creatorId,
            title: data.title,
            description: data.description || null,
            type: data.type || "MEETING",
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            isAllDay: data.isAllDay || false,
            location: data.location || null,
            meetUrl: data.meetUrl || null,
            departmentId: data.departmentId || null,
            attendees: data.attendees ? JSON.stringify(data.attendees) : null,
            relatedTaskId: data.relatedTaskId || null,
          },
          include: { creator: true },
        }),
        400
      );
    } catch (dbErr: any) {
      console.warn(`[CalendarService] Database offline (${dbErr?.message || dbErr}), saving in CalendarStore.`);
    }

    if (!event) {
      // Offline fallback: save in resilient CalendarStore
      const creatorFirstName = user.employee?.firstName || user.email?.split("@")[0] || "Corporate";
      const creatorLastName = user.employee?.lastName || "Admin";

      event = CalendarStore.create({
        organizationId: orgId,
        creatorId,
        title: data.title,
        description: data.description || null,
        type: data.type || "MEETING",
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        isAllDay: data.isAllDay || false,
        location: data.location || null,
        meetUrl: data.meetUrl || null,
        departmentId: data.departmentId || null,
        attendees: data.attendees ? JSON.stringify(data.attendees) : null,
        relatedTaskId: data.relatedTaskId || null,
        creator: {
          firstName: creatorFirstName,
          lastName: creatorLastName,
        },
      });
    }

    // Notify attendees if provided
    try {
      if (data.attendees && data.attendees.length > 0) {
        let attendeeUsers: any[] = [];
        try {
          attendeeUsers = await withDbTimeout(
            db.employee.findMany({
              where: { id: { in: data.attendees }, userId: { not: null } },
              select: { userId: true },
            }),
            400
          );
        } catch {}

        const userIds = attendeeUsers.map((a) => a.userId!).filter((uid) => uid !== user.id);
        if (userIds.length > 0) {
          await EventBusService.publish({
            type: "MEETING_REMINDER",
            organizationId: orgId,
            actorId: user.id,
            targetUserIds: userIds,
            title: `Calendar Invite: ${event.title}`,
            message: `${user.employee?.firstName || "Corporate"} ${user.employee?.lastName || "Staff"} invited you to a scheduled ${event.type.toLowerCase().replace("_", " ")}.`,
            actionUrl: "/app/calendar",
            metadata: { eventId: event.id },
          }).catch(() => {});
        }
      }
    } catch {}

    try {
      await AuditService.logMutation({
        actorId: user.id,
        action: "CALENDAR_EVENT_CREATED",
        entity: "CalendarEvent",
        entityId: event.id,
        newValue: { title: event.title, type: event.type, start: event.startDate },
        metadata: { source: "calendar_service" },
      });
    } catch {}

    return event;
  }
}
