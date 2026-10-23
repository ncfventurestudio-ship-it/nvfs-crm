import { db } from "@/lib/db";
import { AuditService } from "./audit.service";
import { EventBusService } from "./event-bus.service";
import { LeaveStore } from "@/lib/leave-store";
import { EmployeeStore } from "@/lib/employee-store";

export interface CreateLeaveParams {
  employeeId: string;
  leavePolicyCode: string; // e.g. "CL", "EL", "ML", "LWP"
  startDate: Date | string;
  endDate: Date | string;
  reason: string;
}

function withDbTimeout<T>(promise: Promise<T>, ms = 350): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Database operation timed out")), ms)
    ),
  ]);
}

export class LeaveService {
  /**
   * Calculates actual business working days between two dates,
   * strictly excluding configured company non-working days (weekends) and public holidays.
   */
  static async calculateWorkingDays(startDateInput: Date | string, endDateInput: Date | string): Promise<number> {
    const start = new Date(startDateInput);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDateInput);
    end.setHours(0, 0, 0, 0);

    if (end < start) {
      throw new Error("End date cannot be prior to start date");
    }

    try {
      // Fetch work day config
      const workDayConfigs = await withDbTimeout(db.workDayConfig.findMany(), 350);
      const workingDayMap = new Map<number, boolean>();
      workDayConfigs.forEach((c) => workingDayMap.set(c.dayOfWeek, c.isWorkingDay));

      // Fetch company holidays in this date range
      const holidays = await withDbTimeout(
        db.holiday.findMany({
          where: {
            date: {
              gte: start,
              lte: end,
            },
          },
        }),
        350
      );
      const holidayDateSet = new Set(
        holidays.map((h) => h.date.toISOString().split("T")[0])
      );

      let workingDaysCount = 0;
      const current = new Date(start);

      while (current <= end) {
        const dayOfWeek = current.getDay();
        const dateStr = current.toISOString().split("T")[0];

        // Check if this weekday is configured as a working day (default Mon-Fri)
        const isConfiguredWorkDay = workingDayMap.has(dayOfWeek)
          ? workingDayMap.get(dayOfWeek)
          : dayOfWeek >= 1 && dayOfWeek <= 5;

        // Check if day is not a public holiday
        const isHoliday = holidayDateSet.has(dateStr);

        if (isConfiguredWorkDay && !isHoliday) {
          workingDaysCount += 1;
        }

        current.setDate(current.getDate() + 1);
      }

      return workingDaysCount;
    } catch {
      // Offline fallback
      return LeaveStore.calculateWorkingDays(start, end);
    }
  }

  /**
   * Enforces monthly CL limit (e.g. maximum 2 CL per calendar month)
   */
  static async validateMonthlyClLimit(
    employeeId: string,
    startDateInput: Date | string,
    daysRequested: number
  ): Promise<void> {
    const date = new Date(startDateInput);
    const month = date.getMonth();
    const year = date.getFullYear();

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

    try {
      // Find CL policy
      const clPolicy = await withDbTimeout(
        db.leavePolicy.findFirst({ where: { code: "CL" } }),
        350
      );
      if (!clPolicy || !clPolicy.monthlyLimit) return;

      // Sum existing approved and pending CL days in this month
      const existingRequests = await withDbTimeout(
        db.leaveRequest.findMany({
          where: {
            employeeId,
            leavePolicyId: clPolicy.id,
            status: { in: ["APPROVED", "PENDING"] },
            startDate: { gte: monthStart, lte: monthEnd },
          },
          select: { daysCount: true },
        }),
        350
      );

      const existingDays = existingRequests.reduce((sum, r) => sum + r.daysCount, 0);

      if (existingDays + daysRequested > clPolicy.monthlyLimit) {
        throw new Error(
          `Monthly Casual Leave limit exceeded: Policy allows a maximum of ${clPolicy.monthlyLimit} CL days per month. You currently have ${existingDays} CL days booked for ${date.toLocaleString("default", { month: "long" })}.`
        );
      }
    } catch (err: any) {
      if (err.message && err.message.includes("Monthly Casual Leave limit exceeded")) {
        throw err;
      }
      // Offline fallback handled in LeaveStore
    }
  }

  /**
   * Validates overlapping leave requests for the same employee
   */
  static async checkOverlappingLeave(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    excludeRequestId?: string
  ): Promise<void> {
    try {
      const overlapping = await withDbTimeout(
        db.leaveRequest.findFirst({
          where: {
            employeeId,
            status: { in: ["PENDING", "APPROVED"] },
            id: excludeRequestId ? { not: excludeRequestId } : undefined,
            OR: [
              {
                startDate: { lte: endDate },
                endDate: { gte: startDate },
              },
            ],
          },
        }),
        350
      );

      if (overlapping) {
        throw new Error(
          `Overlapping leave conflict: You already have a ${overlapping.status.toLowerCase()} leave request covering these dates.`
        );
      }
    } catch (err: any) {
      if (err.message && err.message.includes("Overlapping leave conflict")) {
        throw err;
      }
      // Offline fallback handled in LeaveStore
    }
  }

  /**
   * Creates a new leave request and increments pending balance
   */
  static async createLeaveRequest({
    employeeId,
    leavePolicyCode,
    startDate,
    endDate,
    reason,
  }: CreateLeaveParams) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const currentYear = start.getFullYear();

    // 1. Calculate actual working days
    const daysCount = await this.calculateWorkingDays(start, end);
    if (daysCount === 0) {
      const isSingleDay = start.toISOString().split("T")[0] === end.toISOString().split("T")[0];
      const dayName = start.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
      if (isSingleDay) {
        throw new Error(`The selected date (${dayName}) is a non-working weekend day or public holiday. Leave is only required for business working days.`);
      }
      throw new Error("Selected date range contains 0 working days (all dates fall on weekends or public holidays).");
    }

    try {
      // 2. Resolve employee and find Leave Policy scoped to employee's organization
      const employee = await withDbTimeout(
        db.employee.findUnique({
          where: { id: employeeId },
          select: { id: true, organizationId: true, firstName: true, lastName: true, employeeNumber: true, designation: true },
        }),
        350
      );
      if (!employee) throw new Error("Employee record not found");

      let policy = await withDbTimeout(
        db.leavePolicy.findFirst({
          where: {
            organizationId: employee.organizationId,
            code: leavePolicyCode,
          },
        }),
        350
      );

      if (!policy) {
        policy = await withDbTimeout(
          db.leavePolicy.findFirst({
            where: { code: leavePolicyCode },
          }),
          350
        );
      }

      if (!policy) {
        throw new Error(`Invalid leave policy code: ${leavePolicyCode}`);
      }

      // 3. Validate Overlapping Leaves
      await this.checkOverlappingLeave(employeeId, start, end);

      // 4. Validate Monthly CL Limit
      if (policy.code === "CL") {
        await this.validateMonthlyClLimit(employeeId, start, daysCount);
      }

      // 5. Validate & Ensure Leave Balance (except for unpaid leave LWP)
      let balance = await withDbTimeout(
        db.leaveBalance.findUnique({
          where: {
            employeeId_leavePolicyId_year: {
              employeeId,
              leavePolicyId: policy.id,
              year: currentYear,
            },
          },
        }),
        350
      );

      if (!balance && policy.annualAllowance >= 0) {
        balance = await withDbTimeout(
          db.leaveBalance.create({
            data: {
              employeeId,
              leavePolicyId: policy.id,
              year: currentYear,
              allocated: policy.annualAllowance,
              used: 0,
              pending: 0,
              remaining: policy.annualAllowance,
            },
          }),
          350
        );
      }

      if (policy.code !== "LWP" && policy.annualAllowance > 0) {
        if (!balance || balance.remaining < daysCount) {
          throw new Error(
            `Insufficient leave balance: You have ${balance?.remaining ?? 0} ${policy.name} days remaining, but requested ${daysCount} days.`
          );
        }
      }

      // 6. Create request in transaction & update balance
      const createdRequest = await withDbTimeout(
        db.$transaction(
          async (tx) => {
            const request = await tx.leaveRequest.create({
              data: {
                employeeId,
                leavePolicyId: policy.id,
                startDate: start,
                endDate: end,
                daysCount,
                reason,
                status: "PENDING",
              },
              include: {
                leavePolicy: true,
                employee: { include: { manager: true } },
              },
            });

            // Update pending balance
            if (balance) {
              const newPending = balance.pending + daysCount;
              const newRemaining = balance.allocated - balance.used - newPending;
              await tx.leaveBalance.update({
                where: { id: balance.id },
                data: {
                  pending: newPending,
                  remaining: newRemaining,
                },
              });
            }

            return request;
          },
          { timeout: 10000, maxWait: 5000 }
        ),
        1500
      );

      AuditService.logMutation({
        actorId: createdRequest.employee.userId || undefined,
        action: "LEAVE_REQUEST_CREATED",
        entity: "LeaveRequest",
        entityId: createdRequest.id,
        newValue: {
          employeeNumber: createdRequest.employee.employeeNumber,
          policy: policy.code,
          daysCount,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
        metadata: { source: "leave_service" },
      }).catch(() => {});

      if (createdRequest.employee.manager?.userId) {
        EventBusService.publish({
          type: "LEAVE_REQUEST",
          organizationId: createdRequest.employee.organizationId,
          actorId: createdRequest.employee.userId || undefined,
          targetUserIds: [createdRequest.employee.manager.userId],
          title: `Leave Request: ${createdRequest.employee.firstName} ${createdRequest.employee.lastName}`,
          message: `${createdRequest.employee.firstName} applied for ${createdRequest.daysCount} day(s) of ${createdRequest.leavePolicy.code}.`,
          actionUrl: "/app/hr/leaves",
          metadata: { leaveRequestId: createdRequest.id },
        }).catch(() => {});
      }

      return createdRequest;
    } catch (dbErr: any) {
      if (
        dbErr.message?.includes("Monthly") ||
        dbErr.message?.includes("Overlapping") ||
        dbErr.message?.includes("Insufficient") ||
        dbErr.message?.includes("contains 0 working days")
      ) {
        throw dbErr;
      }

      console.warn(`[LeaveService] Database offline (${dbErr?.message || dbErr}), persisting in LeaveStore.`);

      // Resolve employee info from EmployeeStore
      const storedEmp = EmployeeStore.getById(employeeId) || EmployeeStore.findByEmailOrNumber(employeeId);

      return LeaveStore.createRequest({
        employeeId,
        leavePolicyCode,
        startDate: start,
        endDate: end,
        reason,
        daysCount,
        employeeInfo: storedEmp
          ? {
              firstName: storedEmp.firstName,
              lastName: storedEmp.lastName,
              employeeNumber: storedEmp.employeeNumber,
              designation: storedEmp.designation,
              departmentName: (storedEmp as any).departmentName || (storedEmp as any).department || "General",
            }
          : undefined,
      });
    }
  }

  /**
   * Approves a leave request, deducts balance, and automatically synchronizes Attendance to ON_LEAVE
   */
  static async approveLeaveRequest(requestId: string, approverEmployeeId: string, notes?: string) {
    try {
      const request = await withDbTimeout(
        db.leaveRequest.findUnique({
          where: { id: requestId },
          include: { leavePolicy: true, employee: true },
        }),
        350
      );

      if (!request) throw new Error("Leave request not found");
      if (request.status !== "PENDING") {
        throw new Error(`Cannot approve a leave request that is already ${request.status.toLowerCase()}`);
      }

      const currentYear = request.startDate.getFullYear();

      // Precalculate working dates
      const cur = new Date(request.startDate);
      cur.setHours(0, 0, 0, 0);
      const end = new Date(request.endDate);
      end.setHours(0, 0, 0, 0);

      const workingDates: Date[] = [];
      while (cur <= end) {
        const dayOfWeek = cur.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          workingDates.push(new Date(cur));
        }
        cur.setDate(cur.getDate() + 1);
      }

      const updatedRequest = await withDbTimeout(
        db.$transaction(
          async (tx) => {
            const updated = await tx.leaveRequest.update({
              where: { id: requestId },
              data: {
                status: "APPROVED",
                approvedById: approverEmployeeId,
                approvalNotes: notes || "Approved by management",
              },
            });

            const balance = await tx.leaveBalance.findUnique({
              where: {
                employeeId_leavePolicyId_year: {
                  employeeId: request.employeeId,
                  leavePolicyId: request.leavePolicyId,
                  year: currentYear,
                },
              },
            });

            if (balance) {
              const newPending = Math.max(0, balance.pending - request.daysCount);
              const newUsed = balance.used + request.daysCount;
              const newRemaining = balance.allocated - newUsed - newPending;

              await tx.leaveBalance.update({
                where: { id: balance.id },
                data: {
                  pending: newPending,
                  used: newUsed,
                  remaining: newRemaining,
                },
              });
            }

            for (const dateOnly of workingDates) {
              await tx.attendanceRecord.upsert({
                where: {
                  employeeId_date: {
                    employeeId: request.employeeId,
                    date: dateOnly,
                  },
                },
                update: {
                  status: "ON_LEAVE",
                  leaveRequestId: request.id,
                  remarks: `Approved ${request.leavePolicy.name} (${request.leavePolicy.code})`,
                },
                create: {
                  employeeId: request.employeeId,
                  date: dateOnly,
                  status: "ON_LEAVE",
                  leaveRequestId: request.id,
                  remarks: `Approved ${request.leavePolicy.name} (${request.leavePolicy.code})`,
                },
              });
            }

            return updated;
          },
          { timeout: 10000, maxWait: 5000 }
        ),
        1500
      );

      AuditService.logMutation({
        action: "LEAVE_REQUEST_APPROVED",
        entity: "LeaveRequest",
        entityId: request.id,
        newValue: {
          requestId: request.id,
          approvedBy: approverEmployeeId,
          status: "APPROVED",
        },
        metadata: { source: "leave_service" },
      }).catch(() => {});

      return updatedRequest;
    } catch (dbErr: any) {
      if (dbErr.message?.includes("Cannot approve") || dbErr.message?.includes("not found")) {
        throw dbErr;
      }
      console.warn("[LeaveService] DB offline, approving via LeaveStore.");
      return LeaveStore.approveRequest(requestId, approverEmployeeId, notes);
    }
  }

  /**
   * Rejects a leave request and releases pending balance
   */
  static async rejectLeaveRequest(requestId: string, approverEmployeeId: string, reason: string) {
    try {
      const request = await withDbTimeout(
        db.leaveRequest.findUnique({
          where: { id: requestId },
          include: { employee: true },
        }),
        350
      );

      if (!request) throw new Error("Leave request not found");
      if (request.status !== "PENDING") {
        throw new Error(`Cannot reject a leave request that is already ${request.status.toLowerCase()}`);
      }

      const currentYear = request.startDate.getFullYear();

      const updated = await withDbTimeout(
        db.$transaction(
          async (tx) => {
            const res = await tx.leaveRequest.update({
              where: { id: requestId },
              data: {
                status: "REJECTED",
                approvedById: approverEmployeeId,
                rejectionReason: reason,
              },
            });

            const balance = await tx.leaveBalance.findUnique({
              where: {
                employeeId_leavePolicyId_year: {
                  employeeId: request.employeeId,
                  leavePolicyId: request.leavePolicyId,
                  year: currentYear,
                },
              },
            });

            if (balance) {
              const newPending = Math.max(0, balance.pending - request.daysCount);
              const newRemaining = balance.allocated - balance.used - newPending;
              await tx.leaveBalance.update({
                where: { id: balance.id },
                data: {
                  pending: newPending,
                  remaining: newRemaining,
                },
              });
            }

            return res;
          },
          { timeout: 10000, maxWait: 5000 }
        ),
        1500
      );

      AuditService.logMutation({
        action: "LEAVE_REQUEST_REJECTED",
        entity: "LeaveRequest",
        entityId: request.id,
        newValue: {
          requestId: request.id,
          rejectedBy: approverEmployeeId,
          reason,
        },
        metadata: { source: "leave_service" },
      }).catch(() => {});

      return updated;
    } catch (dbErr: any) {
      if (dbErr.message?.includes("Cannot reject") || dbErr.message?.includes("not found")) {
        throw dbErr;
      }
      console.warn("[LeaveService] DB offline, rejecting via LeaveStore.");
      return LeaveStore.rejectRequest(requestId, approverEmployeeId, reason);
    }
  }

  /**
   * Cancels a leave request and rolls back balances and attendance
   */
  static async cancelLeaveRequest(requestId: string, employeeId: string) {
    try {
      const request = await withDbTimeout(
        db.leaveRequest.findUnique({
          where: { id: requestId },
        }),
        350
      );

      if (!request) throw new Error("Leave request not found");
      if (request.employeeId !== employeeId) {
        throw new Error("Unauthorized: You can only cancel your own leave requests");
      }
      if (request.status === "CANCELLED" || request.status === "REJECTED") {
        throw new Error(`Request is already ${request.status.toLowerCase()}`);
      }

      const currentYear = request.startDate.getFullYear();

      const updated = await withDbTimeout(
        db.$transaction(
          async (tx) => {
            const wasApproved = request.status === "APPROVED";

            const res = await tx.leaveRequest.update({
              where: { id: requestId },
              data: { status: "CANCELLED" },
            });

            const balance = await tx.leaveBalance.findUnique({
              where: {
                employeeId_leavePolicyId_year: {
                  employeeId: request.employeeId,
                  leavePolicyId: request.leavePolicyId,
                  year: currentYear,
                },
              },
            });

            if (balance) {
              if (wasApproved) {
                const newUsed = Math.max(0, balance.used - request.daysCount);
                const newRemaining = balance.allocated - newUsed - balance.pending;
                await tx.leaveBalance.update({
                  where: { id: balance.id },
                  data: { used: newUsed, remaining: newRemaining },
                });

                await tx.attendanceRecord.deleteMany({
                  where: { leaveRequestId: request.id },
                });
              } else {
                const newPending = Math.max(0, balance.pending - request.daysCount);
                const newRemaining = balance.allocated - balance.used - newPending;
                await tx.leaveBalance.update({
                  where: { id: balance.id },
                  data: { pending: newPending, remaining: newRemaining },
                });
              }
            }

            return res;
          },
          { timeout: 10000, maxWait: 5000 }
        ),
        1500
      );

      AuditService.logMutation({
        action: "LEAVE_REQUEST_CANCELLED",
        entity: "LeaveRequest",
        entityId: request.id,
        newValue: { requestId: request.id, status: "CANCELLED" },
        metadata: { source: "leave_service" },
      }).catch(() => {});

      return updated;
    } catch (dbErr: any) {
      if (dbErr.message?.includes("Unauthorized") || dbErr.message?.includes("already")) {
        throw dbErr;
      }
      console.warn("[LeaveService] DB offline, cancelling via LeaveStore.");
      return LeaveStore.cancelRequest(requestId, employeeId);
    }
  }

  /**
   * Updates a leave policy (annual allowance, monthly limit, name, description)
   */
  static async updateLeavePolicy(
    policyId: string,
    data: {
      annualAllowance?: number;
      monthlyLimit?: number | null;
      name?: string;
      description?: string | null;
      syncEmployeeBalances?: boolean;
    }
  ) {
    try {
      const updated = await withDbTimeout(
        db.leavePolicy.update({
          where: { id: policyId },
          data: {
            annualAllowance: data.annualAllowance !== undefined ? data.annualAllowance : undefined,
            monthlyLimit: data.monthlyLimit !== undefined ? data.monthlyLimit : undefined,
            name: data.name || undefined,
            description: data.description !== undefined ? data.description : undefined,
          },
        }),
        350
      );

      if (data.syncEmployeeBalances && data.annualAllowance !== undefined) {
        const currentYear = new Date().getFullYear();
        const balances = await withDbTimeout(
          db.leaveBalance.findMany({
            where: { leavePolicyId: policyId, year: currentYear },
          }),
          350
        );

        for (const b of balances) {
          const remaining = Math.max(0, data.annualAllowance - b.used - b.pending);
          await db.leaveBalance.update({
            where: { id: b.id },
            data: {
              allocated: data.annualAllowance,
              remaining,
            },
          }).catch(() => {});
        }
      }

    } catch {
      return LeaveStore.updatePolicy(policyId, {
        annualAllowance: data.annualAllowance,
        monthlyLimit: data.monthlyLimit,
        name: data.name,
        description: data.description || undefined,
      });
    }
  }

  /**
   * Adjusts an individual employee's leave balance (increase or decrease)
   */
  static async adjustEmployeeBalance(
    balanceId: string,
    adjustment: number
  ) {
    try {
      const balance = await withDbTimeout(
        db.leaveBalance.findUnique({
          where: { id: balanceId },
        }),
        350
      );
      if (!balance) throw new Error("Leave balance record not found");

      const newAllocated = Math.max(0, balance.allocated + adjustment);
      const newRemaining = Math.max(0, balance.remaining + adjustment);

      return await withDbTimeout(
        db.leaveBalance.update({
          where: { id: balanceId },
          data: {
            allocated: newAllocated,
            remaining: newRemaining,
          },
          include: {
            employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
            leavePolicy: true,
          },
        }),
        350
      );
    } catch {
      return LeaveStore.adjustBalance(balanceId, adjustment);
    }
  }

  /**
   * Resets all employee leave balances in an organization to current policy defaults
   */
  static async resetOrganizationBalances(organizationId: string, year = new Date().getFullYear()) {
    try {
      const policies = await withDbTimeout(
        db.leavePolicy.findMany({
          where: { organizationId },
        }),
        350
      );

      const employees = await withDbTimeout(
        db.employee.findMany({
          where: { organizationId, employmentStatus: "ACTIVE" },
          select: { id: true },
        }),
        350
      );

      let count = 0;
      for (const emp of employees) {
        for (const pol of policies) {
          await db.leaveBalance.upsert({
            where: {
              employeeId_leavePolicyId_year: {
                employeeId: emp.id,
                leavePolicyId: pol.id,
                year,
              },
            },
            create: {
              employeeId: emp.id,
              leavePolicyId: pol.id,
              year,
              allocated: pol.annualAllowance,
              used: 0,
              pending: 0,
              remaining: pol.annualAllowance,
            },
            update: {
              allocated: pol.annualAllowance,
              used: 0,
              pending: 0,
              remaining: pol.annualAllowance,
            },
          }).catch(() => {});
          count++;
        }
      }

      return { success: true, count, employeesCount: employees.length };
    } catch {
      return LeaveStore.resetBalances(organizationId, year);
    }
  }

  /**
   * Gets organization-wide leave management overview for CEO/HR
   */
  static async getOrganizationManagementData(organizationId: string, year = new Date().getFullYear()) {
    try {
      const [policies, pendingRequests, allRequests, employeesWithBalances] = await withDbTimeout(
        Promise.all([
          db.leavePolicy.findMany({
            where: { organizationId },
            orderBy: { code: "asc" },
          }),
          db.leaveRequest.findMany({
            where: {
              employee: { organizationId },
              status: "PENDING",
            },
            orderBy: { createdAt: "desc" },
            include: {
              employee: {
                select: {
                  id: true,
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
          db.leaveRequest.findMany({
            where: { employee: { organizationId } },
            orderBy: { createdAt: "desc" },
            take: 50,
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
              approvedBy: { select: { firstName: true, lastName: true } },
            },
          }),
          db.employee.findMany({
            where: { organizationId, employmentStatus: "ACTIVE" },
            orderBy: [{ department: { name: "asc" } }, { firstName: "asc" }],
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true,
              designation: true,
              department: { select: { name: true } },
              leaveBalances: {
                where: { year },
                include: { leavePolicy: true },
              },
            },
          }),
        ]),
        400
      );

      return {
        policies,
        pendingRequests,
        allRequests,
        employeesWithBalances,
      };
    } catch {
      return LeaveStore.getOrganizationManagementData(organizationId, year);
    }
  }
}
