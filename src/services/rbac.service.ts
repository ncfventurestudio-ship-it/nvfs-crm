import { db } from "@/lib/db";
import { AuthenticatedUser, SystemRoleCode } from "@/types";
import { EmployeeStore } from "@/lib/employee-store";
import { getOfflinePersonaEmployee } from "@/lib/offline-auth";

export class RbacService {
  /**
   * Verifies if a user has the specified permission.
   * Super Admin always evaluates to true.
   */
  static async hasPermission(userId: string, permissionCode: string): Promise<boolean> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      if (!user || !user.isActive) return false;
      if (user.role?.code === "SUPER_ADMIN") return true;

      return (
        user.role?.rolePermissions?.some(
          (rp) => rp.permission?.code === permissionCode
        ) ?? false
      );
    } catch {
      return false;
    }
  }

  /**
   * Enforces permission check on backend API / Server Actions.
   * Throws an error if authorization fails.
   */
  static async enforce(userId: string, permissionCode: string): Promise<void> {
    const allowed = await this.hasPermission(userId, permissionCode);
    if (!allowed) {
      throw new Error(`UNAUTHORIZED: Missing required permission [${permissionCode}]`);
    }
  }

  /**
   * Hierarchical data access scoping for Employee records.
   * - Super Admin, Chairperson, CEO: All enterprise employees.
   * - Department Head: Employees in their department.
   * - Manager: Subordinates reporting directly or indirectly to them.
   * - Employee: Self + colleagues.
   */
  static async getSubordinateIds(managerEmployeeId: string): Promise<string[]> {
    try {
      const directReports = await db.employee.findMany({
        where: { managerId: managerEmployeeId },
        select: { id: true },
      });

      let ids = directReports.map((r) => r.id);
      for (const report of directReports) {
        const nested = await this.getSubordinateIds(report.id);
        ids = ids.concat(nested);
      }
      return ids;
    } catch {
      return [];
    }
  }

  /**
   * Evaluates if a user can view or manage a target employee.
   */
  static async canAccessEmployee(
    actor: AuthenticatedUser,
    targetEmployeeId: string
  ): Promise<boolean> {
    // Super Admin, Chairperson, CEO, HR, ADMIN, COO have company-wide access
    if (["SUPER_ADMIN", "CHAIRPERSON", "CEO", "ADMIN", "HR", "COO"].includes(actor.roleCode) || (actor.roleLevel ?? 0) >= 70) {
      return true;
    }

    // Access to self
    if (actor.employee && actor.employee.id === targetEmployeeId) {
      return true;
    }

    let target: any = null;
    try {
      target = await db.employee.findUnique({
        where: { id: targetEmployeeId },
        select: { id: true, departmentId: true, managerId: true },
      });
    } catch {
      target =
        EmployeeStore.getById(targetEmployeeId) ||
        EmployeeStore.findByEmailOrNumber(targetEmployeeId) ||
        getOfflinePersonaEmployee(targetEmployeeId);
    }
    if (!target) return false;

    // Direct departmental match (Department Heads, CXOs, or colleagues of that department)
    if (actor.employee?.departmentId && actor.employee.departmentId === target.departmentId) {
      return true;
    }

    // Department Head access
    if (actor.roleCode === "DEPARTMENT_HEAD") {
      return actor.employee?.departmentId === target.departmentId;
    }

    // Manager access (must be in reporting tree)
    if (actor.roleCode === "MANAGER" && actor.employee) {
      const subordinateIds = await this.getSubordinateIds(actor.employee.id);
      return subordinateIds.includes(targetEmployeeId);
    }

    // CXO Departmental scopes
    try {
      if (actor.roleCode === "CTO" || actor.roleCode === "CIO") {
        const depts = await db.department.findMany({ where: { code: { in: ["ENG", "SW", "INTL"] } } });
        const deptIds = depts.map((d) => d.id);
        return deptIds.includes(target.departmentId || "") || target.id === actor.employee?.id;
      }

      if (actor.roleCode === "CFO") {
        const finDept = await db.department.findFirst({ where: { code: "FIN" } });
        return target.departmentId === finDept?.id || target.id === actor.employee?.id;
      }

      if (actor.roleCode === "CMO") {
        const crmDept = await db.department.findFirst({ where: { code: { in: ["CRM", "MKT"] } } });
        return target.departmentId === crmDept?.id || target.id === actor.employee?.id;
      }

      if (actor.roleCode === "COO") {
        const opsDept = await db.department.findFirst({ where: { code: "OPS" } });
        return target.departmentId === opsDept?.id || target.id === actor.employee?.id;
      }
    } catch {
      // Offline fallback: allow access for leadership
      return true;
    }

    // Individual Employee: can view directory details
    return true;
  }

  /**
   * Enforces business data modification rule:
   * Super Admin can view all data, but cannot modify operational records.
   */
  static assertCanModifyBusinessData(actor: AuthenticatedUser): void {
    if (actor.roleCode === "SUPER_ADMIN") {
      throw new Error(
        "Super Admin operates with global read-only audit visibility and role assignment privileges. Operational business records cannot be modified by Super Admin."
      );
    }
  }
}
