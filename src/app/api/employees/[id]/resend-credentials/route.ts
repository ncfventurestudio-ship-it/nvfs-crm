import { NextRequest } from "next/server";
import { getCurrentUser, hashPassword, generateSecureTemporaryPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmployeeStore } from "@/lib/employee-store";
import { successResponse, errorResponse } from "@/lib/api-response";
import { EmailService } from "@/services/email.service";
import { AuditService } from "@/services/audit.service";
import { z } from "zod";

const schema = z.object({
  customPassword: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const isHrOrAdmin = ["SUPER_ADMIN", "ADMIN", "CEO", "HR"].includes(user.roleCode);
    if (!isHrOrAdmin) {
      return errorResponse("Forbidden: Only HR or Admins can forward credentials", "FORBIDDEN", 403);
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parse = schema.safeParse(body);

    let employee: any = null;
    try {
      employee = await Promise.race([
        db.employee.findUnique({
          where: { id },
          include: {
            user: { include: { role: true } },
            organization: true,
          },
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("DB timeout")), 600)),
      ]);
    } catch {
      // Graceful fallback to EmployeeStore
    }

    if (!employee) {
      const storedEmp = EmployeeStore.getById(id) || EmployeeStore.findByEmailOrNumber(id);
      if (storedEmp) {
        employee = storedEmp;
      }
    }

    if (!employee) {
      return errorResponse("Employee not found", "NOT_FOUND", 404);
    }

    const newPassword = parse.success && parse.data.customPassword && parse.data.customPassword.trim().length >= 6
      ? parse.data.customPassword.trim()
      : generateSecureTemporaryPassword();

    // Update password hash
    const passwordHash = await hashPassword(newPassword);

    try {
      const userId = employee.user?.id || employee.userId;
      if (userId) {
        await db.user.update({
          where: { id: userId },
          data: { passwordHash, isActive: true },
        });
      }
    } catch (dbErr: any) {
      console.warn("[Resend Credentials] DB update warning:", dbErr.message);
    }

    // Always synchronize with resilient EmployeeStore
    const empInStore =
      EmployeeStore.getById(employee.id) ||
      EmployeeStore.findByEmailOrNumber(employee.email || employee.id);

    if (empInStore) {
      EmployeeStore.update(empInStore.id, {
        passwordHash,
        user: empInStore.user
          ? {
              ...empInStore.user,
              passwordHash,
              isActive: true,
            }
          : {
              id: `usr_${empInStore.id}`,
              email: empInStore.email,
              isActive: true,
              passwordHash,
              role: { code: "EMPLOYEE", name: "Staff Employee", level: 10 },
            },
      });
    }

    // Send credentials email
    const emailResult = await EmailService.sendEmployeeWelcomeCredentials({
      employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
      employeeEmail: employee.email,
      password: newPassword,
      companyName: employee.organization?.name || "Naree Foundation & NFVS",
      designation: employee.designation,
      roleName: employee.user?.role?.name || employee.user?.role?.code || "Staff Employee",
      employeeNumber: employee.employeeNumber,
      loginUrl: `${(process.env.NEXT_PUBLIC_APP_URL || "https://nfventurestudio.netlify.app").replace(/\/+$/, "")}/login`,
    });

    await AuditService.logMutation({
      actorId: user.id,
      action: "CREDENTIALS_EMAIL_FORWARDED",
      entity: "Employee",
      entityId: employee.id,
      newValue: {
        email: employee.email,
        emailDispatched: emailResult.success,
      },
      metadata: { source: "resend_credentials_api" },
    }).catch(() => {});

    return successResponse({
      message: `Login credentials email forwarded to ${employee.email}`,
      emailDispatched: emailResult.success,
      simulated: emailResult.simulated,
    });
  } catch (error: any) {
    console.error("[Resend Credentials Error]:", error);
    return errorResponse(error.message || "Failed to forward credentials", "INTERNAL_ERROR", 500);
  }
}
