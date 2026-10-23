import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";
import { EmployeeOnboardingService } from "@/services/employee-onboarding.service";
import { EmployeeStore } from "@/lib/employee-store";
import { getOfflinePersonaEmployee } from "@/lib/offline-auth";

/**
 * GET /api/profile
 * Returns the current authenticated user's employee profile dossier and dynamic completion percentage.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    // 1. Locate the employee record for this user
    let employeeId = user.employee?.id;

    // If virtual or missing, find by userId or email in database safely
    if (!employeeId || employeeId.startsWith("virtual_")) {
      try {
        const dbEmp = await db.employee.findFirst({
          where: {
            OR: [{ userId: user.id }, { email: user.email }],
          },
        });
        if (dbEmp) {
          employeeId = dbEmp.id;
        }
      } catch (dbErr: any) {
        console.warn("[Profile GET Warning] DB query failed, falling back to offline store");
      }
    }

    // Check offline EmployeeStore / Persona
    if (!employeeId || employeeId.startsWith("virtual_")) {
      const stored =
        EmployeeStore.findByEmailOrNumber(user.email) ||
        EmployeeStore.getById(user.id) ||
        getOfflinePersonaEmployee(user.id) ||
        getOfflinePersonaEmployee(user.email);
      if (stored) {
        employeeId = stored.id;
      }
    }

    // If still no employee record exists, try database provisioning or offline synthesis
    if (!employeeId || employeeId.startsWith("virtual_")) {
      try {
        const activeOrgId =
          user.activeCompany?.id ||
          (await db.organization.findFirst({ where: { status: { not: "ARCHIVED" } } }))?.id;

        if (activeOrgId) {
          let defaultDept = await db.department.findFirst({
            where: { organizationId: activeOrgId },
          });

          if (!defaultDept) {
            defaultDept = await db.department.create({
              data: {
                organizationId: activeOrgId,
                name: "General Administration",
                code: "ADMIN",
              },
            });
          }

          const org = await db.organization.findUnique({ where: { id: activeOrgId } });
          const empCount = await db.employee.count({ where: { organizationId: activeOrgId } });
          const empNumber = `${org?.code || "EMP"}-${String(empCount + 1).padStart(4, "0")}`;

          const nameParts = (
            user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email.split("@")[0]
          ).split(" ");
          const firstName = nameParts[0] || "User";
          const lastName = nameParts.slice(1).join(" ") || "Account";

          const createdEmp = await db.employee.create({
            data: {
              userId: user.id,
              organizationId: activeOrgId,
              departmentId: defaultDept.id,
              employeeNumber: empNumber,
              firstName,
              lastName,
              email: user.email,
              designation: user.roleName || "Staff Member",
              employmentType: "FULL_TIME",
              employmentStatus: "ACTIVE",
              workMode: "ON_SITE",
              location: "Headquarters (Mumbai)",
              hireDate: new Date(),
            },
          });

          employeeId = createdEmp.id;
        }
      } catch (dbErr: any) {
        console.warn("[Profile GET Warning] Could not provision in database, creating in offline store");
      }
    }

    if (!employeeId || employeeId.startsWith("virtual_")) {
      // Create directly in EmployeeStore as fallback
      const stored = EmployeeStore.create({
        id: `emp_${user.id}`,
        email: user.email,
        firstName: user.employee?.firstName || user.email.split("@")[0] || "Employee",
        lastName: user.employee?.lastName || "",
        designation: user.roleName || "Corporate Contributor",
        organizationId: user.activeCompany?.id || "org_nfvs_studio",
      });
      employeeId = stored.id;
    }

    // 2. Fetch full dossier with dynamic 10-section completion breakdown
    const dossier = await EmployeeOnboardingService.getEmployeeDossier(employeeId);
    if (!dossier) {
      return errorResponse("Employee dossier could not be loaded", "NOT_FOUND", 404);
    }

    return successResponse(dossier);
  } catch (error: any) {
    console.error("[Profile GET Error]:", error);
    return errorResponse(error.message || "Failed to load profile", "INTERNAL_ERROR", 500);
  }
}

/**
 * PUT /api/profile
 * Allows the authenticated employee to update their own profile details.
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    let employeeId = user.employee?.id;
    if (!employeeId || employeeId.startsWith("virtual_")) {
      try {
        const dbEmp = await db.employee.findFirst({
          where: {
            OR: [{ userId: user.id }, { email: user.email }],
          },
        });
        if (dbEmp) {
          employeeId = dbEmp.id;
        }
      } catch {}
    }

    if (!employeeId || employeeId.startsWith("virtual_")) {
      const stored =
        EmployeeStore.findByEmailOrNumber(user.email) ||
        EmployeeStore.getById(user.id) ||
        getOfflinePersonaEmployee(user.id) ||
        getOfflinePersonaEmployee(user.email);
      if (stored) {
        employeeId = stored.id;
      }
    }

    if (!employeeId || employeeId.startsWith("virtual_")) {
      return errorResponse("No registered employee record to update", "BAD_REQUEST", 400);
    }

    const body = await req.json();
    const updatedDossier = await EmployeeOnboardingService.updateEmployeeProfile(
      employeeId,
      body,
      user.id
    );

    return successResponse(updatedDossier);
  } catch (error: any) {
    console.error("[Profile PUT Error]:", error);
    return errorResponse(error.message || "Failed to update profile", "INTERNAL_ERROR", 500);
  }
}
