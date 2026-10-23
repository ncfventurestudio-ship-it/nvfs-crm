import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { AuditService } from "@/services/audit.service";
import { RbacService } from "@/services/rbac.service";
import { successResponse, errorResponse } from "@/lib/api-response";

import { EmployeeStore } from "@/lib/employee-store";
import { getOfflinePersonaEmployee } from "@/lib/offline-auth";

function withDbTimeout<T>(promise: Promise<T>, ms = 600): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Database operation timed out")), ms)
    ),
  ]);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const { id } = await params;

    // Check hierarchical access
    try {
      const allowed = await RbacService.canAccessEmployee(user, id);
      if (!allowed) {
        return errorResponse("Forbidden: You do not have permission to view this employee", "FORBIDDEN", 403);
      }
    } catch {}

    let employee: any = null;
    let activityLogs: any[] = [];

    try {
      employee = await withDbTimeout(
        db.employee.findUnique({
          where: { id },
        include: {
          organization: true,
          department: true,
          manager: {
            select: {
              id: true,
              employeeNumber: true,
              firstName: true,
              lastName: true,
              designation: true,
              email: true,
            },
          },
          directReports: {
            select: {
              id: true,
              employeeNumber: true,
              firstName: true,
              lastName: true,
              designation: true,
              employmentStatus: true,
              department: { select: { name: true } },
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              isActive: true,
              lastLoginAt: true,
              role: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  level: true,
                },
              },
            },
          },
          profile: true,
          documents: {
            orderBy: { uploadedAt: "desc" },
          },
        },
      }), 600);

      if (employee) {
        activityLogs = await db.auditLog.findMany({
          where: {
            OR: [
              { entity: "Employee", entityId: employee.id },
              { actorId: employee.userId || undefined },
            ],
          },
          take: 20,
          orderBy: { createdAt: "desc" },
          include: {
            actor: {
              select: {
                email: true,
                employee: { select: { firstName: true, lastName: true } },
              },
            },
          },
        }).catch(() => []);
      }
    } catch (dbErr: any) {
      console.warn("[Employee GET ID Warning] DB query failed, looking in EmployeeStore:", dbErr.message);
    }

    if (!employee) {
      const stored =
        EmployeeStore.getById(id) ||
        EmployeeStore.findByEmailOrNumber(id) ||
        getOfflinePersonaEmployee(id);
      if (stored) {
        return successResponse({
          employee: {
            ...stored,
            directReports: [],
            documents: stored.documents || [],
            profile: {
              dateOfBirth: null,
              aadhaarNumber: null,
              personalEmail: stored.email,
              currentAddress: stored.location,
              country: "India",
            },
          },
          activityLogs: [],
        });
      }
      return errorResponse("Employee not found", "NOT_FOUND", 404);
    }

    return successResponse({ employee, activityLogs });
  } catch (error) {
    console.error("[Employee GET ID Error]:", error);
    return errorResponse("Failed to fetch employee details", "INTERNAL_ERROR", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const hasPermission = await RbacService.hasPermission(user.id, "employees.employee.update");
    if (!hasPermission) {
      return errorResponse("Forbidden: Missing employees.employee.update permission", "FORBIDDEN", 403);
    }

    const { id } = await params;
    const body = await req.json();

    let previous: any = null;
    try {
      previous = await db.employee.findUnique({ where: { id } });
    } catch {}

    if (!previous) {
      previous = EmployeeStore.getById(id) || EmployeeStore.findByEmailOrNumber(id);
    }

    if (!previous) {
      return errorResponse("Employee not found", "NOT_FOUND", 404);
    }

    let newEmail = previous.email;
    if (body.email && typeof body.email === "string" && body.email.trim()) {
      const cleanEmail = body.email.trim().toLowerCase();
      if (cleanEmail !== previous.email) {
        try {
          const dup = await db.employee.findFirst({
            where: { email: cleanEmail, NOT: { id } },
          });
          if (dup) {
            return errorResponse(`Email [${cleanEmail}] is already assigned to another employee`, "DUPLICATE_EMAIL", 400);
          }
        } catch {}
        newEmail = cleanEmail;
      }
    }

    let updated: any = null;
    try {
      updated = await db.employee.update({
        where: { id },
        data: {
          firstName: body.firstName ? body.firstName.trim() : previous.firstName,
          lastName: body.lastName ? body.lastName.trim() : previous.lastName,
          email: newEmail,
          designation: body.designation ?? previous.designation,
          departmentId: body.departmentId ?? previous.departmentId,
          managerId: body.managerId !== undefined ? body.managerId : previous.managerId,
          employmentStatus: body.employmentStatus ?? previous.employmentStatus,
          employmentType: body.employmentType ?? previous.employmentType,
          workMode: body.workMode ?? previous.workMode,
          location: body.location ?? previous.location,
          emergencyContact: body.emergencyContact !== undefined ? body.emergencyContact : previous.emergencyContact,
          phone: body.phone !== undefined ? body.phone : previous.phone,
        },
        include: {
          department: true,
          manager: true,
        },
      });
    } catch (updateErr) {
      console.warn("[Employee PATCH DB Warning] Falling back to EmployeeStore:", updateErr);
    }

    // Always sync with resilient EmployeeStore
    const storedUpdated = EmployeeStore.update(id, {
      firstName: body.firstName ? body.firstName.trim() : previous.firstName,
      lastName: body.lastName ? body.lastName.trim() : previous.lastName,
      email: newEmail,
      designation: body.designation ?? previous.designation,
      departmentId: body.departmentId ?? previous.departmentId,
      managerId: body.managerId !== undefined ? body.managerId : previous.managerId,
      employmentStatus: body.employmentStatus ?? previous.employmentStatus,
      employmentType: body.employmentType ?? previous.employmentType,
      workMode: body.workMode ?? previous.workMode,
      location: body.location ?? previous.location,
      emergencyContact: body.emergencyContact !== undefined ? body.emergencyContact : previous.emergencyContact,
      phone: body.phone !== undefined ? body.phone : previous.phone,
    });

    const effectiveUpdated = updated || storedUpdated;

    if (newEmail !== previous.email && previous.userId) {
      await db.user.update({
        where: { id: previous.userId },
        data: { email: newEmail },
      }).catch(() => {});
    }

    // Record mutation audit diff
    await AuditService.logMutation({
      actorId: user.id,
      action: "EMPLOYEE_UPDATED",
      entity: "Employee",
      entityId: effectiveUpdated.id,
      previousValue: {
        designation: previous.designation,
        departmentId: previous.departmentId,
        employmentStatus: previous.employmentStatus,
      },
      newValue: {
        designation: effectiveUpdated.designation,
        departmentId: effectiveUpdated.departmentId,
        employmentStatus: effectiveUpdated.employmentStatus,
      },
      metadata: { updatedBy: user.email },
    }).catch(() => {});

    return successResponse(effectiveUpdated);
  } catch (error: any) {
    console.error("[Employee PATCH Error]:", error);
    return errorResponse(error?.message || "Failed to update employee", "INTERNAL_ERROR", 500);
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

    const roleCode = (user.roleCode || "").toUpperCase();
    const roleLevel = user.roleLevel ?? 10;
    const isExecutive =
      ["SUPER_ADMIN", "ADMIN", "CHAIRPERSON", "CEO", "COO", "CFO", "CIO", "CTO", "CMO", "CHRO", "HR", "DIRECTOR", "VP", "PRESIDENT"].includes(roleCode) ||
      roleLevel >= 40 ||
      (await RbacService.hasPermission(user.id, "employees.employee.delete").catch(() => false));

    if (!isExecutive) {
      return errorResponse(
        "Forbidden: Only corporate executives and management can delete employees",
        "FORBIDDEN",
        403
      );
    }

    let employee: any = null;
    try {
      employee = await db.employee.findUnique({
        where: { id },
        include: {
          user: {
            include: { role: true },
          },
        },
      });
    } catch {}

    if (!employee) {
      employee = EmployeeStore.getById(id) || EmployeeStore.findByEmailOrNumber(id);
    }

    if (!employee) {
      return errorResponse("Employee not found", "NOT_FOUND", 404);
    }

    // Prevent deleting oneself
    if (user.employee?.id === id || (employee.userId && user.id === employee.userId)) {
      return errorResponse("You cannot delete your own employee record", "FORBIDDEN", 400);
    }

    // Protect Super Admin accounts from being deleted
    if (employee.user?.role?.code === "SUPER_ADMIN" || employee.roleCode === "SUPER_ADMIN") {
      return errorResponse("Super Administrator accounts cannot be deleted", "FORBIDDEN", 403);
    }

    // Always delete from resilient EmployeeStore
    EmployeeStore.delete(id);

    // Clean up dependent / relational records sequentially (pooler-safe)
    // 1. Unlink manager references on other employees
    await db.employee.updateMany({
      where: { managerId: id },
      data: { managerId: null },
    });

    // 2. Unlink department manager & team leader
    await db.department.updateMany({
      where: { managerId: id },
      data: { managerId: null },
    });
    await db.team.updateMany({
      where: { leaderId: id },
      data: { leaderId: null },
    });

    // 3. Tasks assigned or created
    await db.taskComment.deleteMany({ where: { authorId: id } }).catch(() => {});
    await db.task.updateMany({ where: { assigneeId: id }, data: { assigneeId: null } }).catch(() => {});
    await db.task.deleteMany({ where: { creatorId: id } }).catch(() => {});

    // 4. CRM ownership unlinking & activities
    await db.crmActivity.deleteMany({ where: { performedById: id } }).catch(() => {});
    await db.client.updateMany({ where: { ownerId: id }, data: { ownerId: null } }).catch(() => {});
    await db.lead.updateMany({ where: { ownerId: id }, data: { ownerId: null } }).catch(() => {});
    await db.opportunity.updateMany({ where: { ownerId: id }, data: { ownerId: null } }).catch(() => {});

    // 5. Communications & Calendar
    await db.conversationParticipant.deleteMany({ where: { employeeId: id } }).catch(() => {});
    await db.message.deleteMany({ where: { senderId: id } }).catch(() => {});
    await db.conversation.deleteMany({ where: { createdById: id } }).catch(() => {});
    await db.calendarEvent.deleteMany({ where: { creatorId: id } }).catch(() => {});
    await db.announcementRead.deleteMany({ where: { employeeId: id } }).catch(() => {});
    await db.announcement.deleteMany({ where: { authorId: id } }).catch(() => {});

    // 6. Operations & Requests
    await db.operationEmployee.deleteMany({ where: { employeeId: id } }).catch(() => {});
    await db.employeeRequest.deleteMany({ where: { employeeId: id } }).catch(() => {});
    await db.onDutyAssignment.deleteMany({ where: { employeeId: id } }).catch(() => {});
    await db.approvalRequest.deleteMany({ where: { requestedById: id } }).catch(() => {});
    await db.approvalRequest.updateMany({ where: { approverId: id }, data: { approverId: null } }).catch(() => {});

    // 7. Finance & Expenses
    await db.expense.deleteMany({ where: { employeeId: id } }).catch(() => {});

    // 8. HR records
    await db.attendanceRecord.deleteMany({ where: { employeeId: id } }).catch(() => {});
    await db.leaveRequest.deleteMany({ where: { employeeId: id } }).catch(() => {});
    await db.leaveBalance.deleteMany({ where: { employeeId: id } }).catch(() => {});
    await db.employeeSalaryStructure.deleteMany({ where: { employeeId: id } }).catch(() => {});
    await db.payrollEntry.deleteMany({ where: { employeeId: id } }).catch(() => {});
    await db.employeeDocument.deleteMany({ where: { employeeId: id } }).catch(() => {});
    await db.employeeProfile.deleteMany({ where: { employeeId: id } }).catch(() => {});

    // 9. Delete the employee record
    await db.employee.delete({ where: { id } });

    // 10. Delete associated user account if one exists
    if (employee.userId) {
      await db.userCompanyMembership.deleteMany({ where: { userId: employee.userId } }).catch(() => {});
      await db.userSetting.deleteMany({ where: { userId: employee.userId } }).catch(() => {});
      await db.dashboardPreference.deleteMany({ where: { userId: employee.userId } }).catch(() => {});
      await db.auditLog.updateMany({ where: { actorId: employee.userId }, data: { actorId: null } }).catch(() => {});
      await db.user.delete({ where: { id: employee.userId } }).catch(() => {});
    }

    // Audit log
    await AuditService.logMutation({
      actorId: user.id,
      action: "EMPLOYEE_DELETED",
      entity: "Employee",
      entityId: id,
      previousValue: {
        employeeNumber: employee.employeeNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        designation: employee.designation,
      },
      newValue: null,
      metadata: { deletedBy: user.email, role: roleCode },
    });

    return successResponse({
      message: `Employee ${employee.firstName} ${employee.lastName} (${employee.employeeNumber}) deleted successfully`,
    });
  } catch (error: any) {
    console.error("[Employee DELETE Error]:", error);
    return errorResponse(error?.message || "Failed to delete employee", "INTERNAL_ERROR", 500);
  }
}
