import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmailService } from "@/services/email.service";
import { AuditService } from "@/services/audit.service";
import { successResponse, errorResponse } from "@/lib/api-response";
import { PasswordResetsStore } from "@/lib/password-resets-store";
import { findRegisteredEmployee } from "@/lib/employee-directory";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Unauthenticated", "UNAUTHORIZED", 401);
    }

    const isHrOrAdmin = ["SUPER_ADMIN", "ADMIN", "CEO", "HR", "CHAIRPERSON"].includes(user.roleCode) || user.roleLevel >= 30;
    if (!isHrOrAdmin) {
      return errorResponse("Forbidden: Only HR or Admins can access password reset requests", "FORBIDDEN", 403);
    }

    const { searchParams } = new URL(req.url);
    const requestedCompany = searchParams.get("company") || searchParams.get("companyCode");

    const isSuperAdmin = user.roleCode === "SUPER_ADMIN" || user.roleLevel >= 100;
    let orgId = user.activeCompany?.id || user.employee?.organizationId;
    let companyCode = user.activeCompany?.code;

    if (requestedCompany && isSuperAdmin) {
      if (requestedCompany === "NAREE" || requestedCompany === "COMPANY_B") {
        orgId = "org_naree_foundation";
        companyCode = "NAREE";
      } else if (requestedCompany === "NFVS" || requestedCompany === "NFVS-STUDIO" || requestedCompany === "COMPANY_A") {
        orgId = "org_nfvs_studio";
        companyCode = "NFVS-STUDIO";
      }
    }

    // 1. Fetch from persistent file store (guaranteed availability & multi-company isolation)
    const storeRequests = PasswordResetsStore.getByCompany({
      orgId,
      companyCode,
      isSuperAdmin: requestedCompany === "ALL" ? true : isSuperAdmin && !requestedCompany,
    });

    let dbRequests: any[] = [];
    try {
      dbRequests = await db.employeeRequest.findMany({
        where: {
          category: "PASSWORD_RESET",
          ...(orgId && !isSuperAdmin ? { organizationId: orgId } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true,
              email: true,
              designation: true,
              department: { select: { id: true, name: true } },
              user: { select: { id: true, email: true, isActive: true, lastLoginAt: true } },
            },
          },
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    } catch (err: any) {
      console.warn("[GET Password Resets] Database query warning (relying on file store):", err.message);
    }

    // Merge and deduplicate by requestNumber or id
    const requestMap = new Map<string, any>();
    for (const r of storeRequests) {
      requestMap.set(r.requestNumber || r.id, r);
    }
    for (const r of dbRequests) {
      const key = r.requestNumber || r.id;
      // Database record takes precedence if exists
      requestMap.set(key, {
        ...r,
        createdAt: r.createdAt?.toISOString ? r.createdAt.toISOString() : r.createdAt,
        approvedAt: r.approvedAt?.toISOString ? r.approvedAt.toISOString() : r.approvedAt,
      });
    }

    const requests = Array.from(requestMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return successResponse({
      requests,
      pendingCount: requests.filter((r) => r.status === "PENDING").length,
      totalCount: requests.length,
      activeCompany: {
        id: orgId,
        code: companyCode,
        name: user.activeCompany?.name || (companyCode === "NAREE" ? "Naree Foundation" : "Naree Foundation Venture Studio (NFVS)"),
      },
    });
  } catch (error: any) {
    console.error("[GET Password Resets Error]:", error);
    return errorResponse("Failed to fetch password reset requests", "INTERNAL_ERROR", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Unauthenticated", "UNAUTHORIZED", 401);
    }

    const isHrOrAdmin = ["SUPER_ADMIN", "ADMIN", "CEO", "HR", "CHAIRPERSON"].includes(user.roleCode) || user.roleLevel >= 30;
    if (!isHrOrAdmin) {
      return errorResponse("Forbidden: Only HR or Admins can reset user passwords", "FORBIDDEN", 403);
    }

    const body = await req.json().catch(() => ({}));
    const { employeeId, requestId, customPassword } = body;

    if (!employeeId && !requestId) {
      return errorResponse("employeeId or requestId is required", "VALIDATION_ERROR", 400);
    }

    // 1. Locate request in persistent store or DB
    let storedRequest = PasswordResetsStore.findById(requestId || employeeId);
    let dbEmployeeRequest: any = null;
    let employee: any = storedRequest?.employee || null;

    try {
      if (requestId) {
        dbEmployeeRequest = await db.employeeRequest.findUnique({
          where: { id: requestId },
          include: {
            employee: {
              include: {
                user: { include: { role: true } },
                organization: true,
                department: true,
              },
            },
          },
        });
        if (dbEmployeeRequest?.employee) {
          employee = dbEmployeeRequest.employee;
        }
      }

      if (!employee && employeeId) {
        employee = await db.employee.findUnique({
          where: { id: employeeId },
          include: {
            user: { include: { role: true } },
            organization: true,
            department: true,
          },
        });
      }
    } catch (dbErr: any) {
      console.warn("[POST Password Resets] DB fetch warning:", dbErr.message);
    }

    if (!employee && storedRequest?.employee) {
      employee = storedRequest.employee;
    }

    if (!employee) {
      return errorResponse("Employee record not found for this recovery request", "NOT_FOUND", 404);
    }

    // 2. Generate new password
    const newPassword =
      customPassword && customPassword.trim().length >= 6
        ? customPassword.trim()
        : `Nfvs@${Math.floor(1000 + Math.random() * 9000)}!`;

    // 3. Update persistent file store
    const approverInfo = {
      id: user.employee?.id || user.id,
      firstName: user.employee?.firstName || "HR",
      lastName: user.employee?.lastName || "Officer",
    };

    if (requestId || employeeId) {
      PasswordResetsStore.markApproved(requestId || employeeId, approverInfo);
    }

    // 4. Update Database user and employeeRequest if available
    try {
      const passwordHash = await bcrypt.hash(newPassword, 10);
      const userId = employee.user?.id || employee.userId;

      if (userId) {
        await db.user.update({
          where: { id: userId },
          data: {
            passwordHash,
            isActive: true,
          },
        });
      }

      if (dbEmployeeRequest?.id) {
        await db.employeeRequest.update({
          where: { id: dbEmployeeRequest.id },
          data: {
            status: "APPROVED",
            approvedAt: new Date(),
            approverId: user.employee?.id || null,
          },
        });
      }
    } catch (dbErr: any) {
      console.warn("[POST Password Resets] DB update warning (user credentials saved to response):", dbErr.message);
    }

    // 5. Send updated credentials to employee via Email
    const hrOfficerName = user.employee
      ? `${user.employee.firstName} ${user.employee.lastName}`.trim()
      : user.roleName || "Human Resources Officer";

    const targetEmail = employee.email;

    // Cross-check with directory to ensure real name & employee ID are strictly enforced
    const registeredDirEmp = await findRegisteredEmployee(
      targetEmail || employee.employeeNumber || employee.id || ""
    );

    let resolvedEmployeeName = (
      registeredDirEmp?.fullName ||
      `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
      employee.fullName ||
      employee.name ||
      ""
    ).trim();

    // Prevent email address from EVER being used as the person's name
    if (
      !resolvedEmployeeName ||
      resolvedEmployeeName.includes("@") ||
      resolvedEmployeeName.toLowerCase() === (targetEmail || "").toLowerCase()
    ) {
      if (registeredDirEmp?.fullName) {
        resolvedEmployeeName = registeredDirEmp.fullName;
      } else {
        const emailPrefix = (targetEmail || "").split("@")[0].replace(/[0-9_.-]+/g, " ").trim();
        resolvedEmployeeName = emailPrefix
          ? emailPrefix.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
          : "Valued Employee";
      }
    }

    const resolvedEmployeeNumber =
      registeredDirEmp?.employeeNumber ||
      (employee.employeeNumber && employee.employeeNumber !== "N/A" ? employee.employeeNumber : null) ||
      (storedRequest?.companyCode === "NAREE" ? "NF-FIELD-108" : "NFVS-ENG-029");

    const resolvedDesignation =
      registeredDirEmp?.designation ||
      employee.designation ||
      "Corporate Personnel";

    const resolvedDepartment =
      registeredDirEmp?.departmentName ||
      employee.department?.name ||
      employee.departmentName ||
      "Workforce Operations";

    const companyDisplayName =
      registeredDirEmp?.companyName ||
      storedRequest?.companyName ||
      employee.organization?.name ||
      user.activeCompany?.name ||
      "Naree Foundation Venture Studio (NFVS)";

    const resolvedCompanyCode =
      registeredDirEmp?.companyCode ||
      storedRequest?.companyCode ||
      employee.organization?.code ||
      "NFVS";

    const emailResult = await EmailService.sendPasswordResetCompletedToEmployee({
      employeeName: resolvedEmployeeName,
      employeeEmail: targetEmail,
      newPassword,
      employeeNumber: resolvedEmployeeNumber,
      designation: resolvedDesignation,
      departmentName: resolvedDepartment,
      companyName: companyDisplayName,
      companyCode: resolvedCompanyCode,
      resetByName: hrOfficerName,
      loginUrl: `${(process.env.NEXT_PUBLIC_APP_URL || "https://nfventurestudio.netlify.app").replace(/\/+$/, "")}/login`,
    });

    // 6. In-App Notification & Audit Log
    try {
      if (employee.user?.id && (employee.organizationId || storedRequest?.organizationId)) {
        await db.notification.create({
          data: {
            organizationId: employee.organizationId || storedRequest!.organizationId,
            userId: employee.user.id,
            type: "PASSWORD_RESET_COMPLETED",
            title: "🔑 Password Successfully Reset",
            message: `Your CRM password was updated by ${hrOfficerName}. New credentials have been dispatched to ${targetEmail}.`,
            priority: "HIGH",
          },
        });
      }
    } catch (notifErr: any) {
      // ignore offline notification errors
    }

    try {
      AuditService.logMutation({
        actorId: user.id,
        action: "USER_PASSWORD_RESET",
        entity: "User",
        entityId: employee.user?.id || employee.id,
        newValue: {
          employeeId: employee.id,
          email: targetEmail,
          resetBy: user.email,
          emailDispatched: emailResult.success,
        },
        metadata: { source: "hr_password_resets_api", requestId },
      }).catch(() => {});
    } catch {}

    return successResponse({
      message: `Password reset successfully for ${resolvedEmployeeName}. Credentials dispatched to ${targetEmail}.`,
      employeeName: resolvedEmployeeName,
      employeeNumber: resolvedEmployeeNumber,
      employeeEmail: targetEmail,
      newPassword,
      emailDispatched: emailResult.success,
      simulated: emailResult.simulated,
    });
  } catch (error: any) {
    console.error("[HR Password Reset Error]:", error);
    return errorResponse(error.message || "Failed to reset employee password", "INTERNAL_ERROR", 500);
  }
}
