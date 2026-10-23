import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";
import { AuditService } from "@/services/audit.service";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);

    const [users, roles, departments] = await Promise.all([
      db.user.findMany({
        include: {
          role: true,
          employee: {
            include: {
              department: true,
              manager: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.role.findMany({ orderBy: { level: "desc" } }),
      db.department.findMany({ orderBy: { name: "asc" } }),
    ]);

    return successResponse({ users, roles, departments });
  } catch (error: any) {
    console.error("[Settings Users GET Error]:", error);
    return errorResponse(error.message || "Failed to fetch users", "INTERNAL_ERROR", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getCurrentUser();
    if (!actor) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);

    const isAuthorized = ["SUPER_ADMIN", "ADMIN", "CEO", "CHAIRPERSON"].includes(actor.roleCode);
    if (!isAuthorized) {
      return errorResponse("Forbidden: Insufficient privileges for user administration", "FORBIDDEN", 403);
    }

    const body = await req.json();
    const { action, userId, roleId, departmentId, isActive, newPassword, email, firstName, lastName } = body;

    if (action === "TOGGLE_STATUS" && userId) {
      const targetUser = await db.user.findUnique({ where: { id: userId } });
      if (!targetUser) return errorResponse("User not found", "NOT_FOUND", 404);

      const updated = await db.user.update({
        where: { id: userId },
        data: { isActive: typeof isActive === "boolean" ? isActive : !targetUser.isActive },
      });

      await AuditService.logMutation({
        action: "USER_STATUS_UPDATED",
        entity: "User",
        entityId: userId,
        previousValue: { isActive: targetUser.isActive },
        newValue: { isActive: updated.isActive },
      });

      return successResponse(updated);
    }

    if (action === "UPDATE_ROLE" && userId && roleId) {
      const targetUser = await db.user.findUnique({ where: { id: userId }, include: { role: true } });
      if (!targetUser) return errorResponse("User not found", "NOT_FOUND", 404);

      const updated = await db.user.update({
        where: { id: userId },
        data: { roleId },
        include: { role: true },
      });

      await AuditService.logMutation({
        action: "USER_ROLE_UPDATED",
        entity: "User",
        entityId: userId,
        previousValue: { role: targetUser.role.code },
        newValue: { role: updated.role.code },
      });

      return successResponse(updated);
    }

    if (action === "RESET_PASSWORD" && userId && newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.user.update({
        where: { id: userId },
        data: { passwordHash: hashedPassword },
      });

      await AuditService.logMutation({
        action: "USER_PASSWORD_RESET",
        entity: "User",
        entityId: userId,
      });

      return successResponse({ success: true, message: "Password reset successfully" });
    }

    if (action === "CREATE_USER" && email && firstName && lastName && roleId) {
      const org = await db.organization.findFirst();
      if (!org) return errorResponse("No organization configured", "INTERNAL_ERROR", 500);

      const existing = await db.user.findUnique({ where: { email } });
      if (existing) return errorResponse("User with this email already exists", "DUPLICATE", 400);

      const defaultPassword = newPassword || "Enterprise@2026";
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      const count = await db.employee.count();
      const isVS = (org.code || "").toUpperCase() === "NFVS" || (org.name || "").toLowerCase().includes("venture studio");
      const orgPrefix = isVS ? "NFVS" : "NF";
      const year = new Date().getFullYear();
      const employeeNumber = `${orgPrefix}-${year}-01-${String(count + 1).padStart(4, "0")}`;

      const newUser = await db.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          roleId,
          isActive: true,
          employee: {
            create: {
              organizationId: org.id,
              employeeNumber,
              firstName,
              lastName,
              email,
              designation: "Enterprise Specialist",
              departmentId: departmentId || null,
              hireDate: new Date(),
            },
          },
        },
        include: { employee: true, role: true },
      });

      await AuditService.logMutation({
        action: "USER_CREATED",
        entity: "User",
        entityId: newUser.id,
        newValue: { email, role: newUser.role.code, employeeNumber },
      });

      return successResponse(newUser, 201);
    }

    return errorResponse("Invalid action parameter", "INVALID_ACTION", 400);
  } catch (error: any) {
    console.error("[Settings Users POST Error]:", error);
    return errorResponse(error.message || "Failed to process user action", "INTERNAL_ERROR", 500);
  }
}
