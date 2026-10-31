import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { AuthenticatedUser, SystemRoleCode } from "@/types";
import { verifyOfflineCredentials } from "@/lib/offline-auth";
import { isValidBcryptHash } from "@/lib/auth";

export class AuthService {
  static async verifyCredentials(emailOrId: string, passwordPlain: string) {
    if (!emailOrId || typeof emailOrId !== "string" || !passwordPlain || typeof passwordPlain !== "string") {
      return null;
    }
    const raw = emailOrId.trim().toLowerCase();
    let targetEmail = raw;

    const isNareeIdentity =
      raw === "hr@nf.in" ||
      raw === "hr@naree.internal" ||
      raw === "hr@naree.org" ||
      raw === "hr@naree.in" ||
      raw === "hr@nareefoundation.org" ||
      raw === "pooja.sharma@nareefoundation.org" ||
      raw === "hr_naree" ||
      raw === "hr-naree" ||
      raw === "naree_hr" ||
      raw === "naree-hr" ||
      raw === "hr_nf" ||
      raw === "hr-nf" ||
      raw === "nf_hr" ||
      raw === "nf-hr" ||
      raw === "hr2" ||
      raw === "hr_foundation" ||
      raw === "hr-foundation" ||
      ((raw.includes("naree") || raw.includes("foundation") || raw.endsWith("@nf.in") || raw.includes("@nf.") || raw.startsWith("nf-hr") || raw.startsWith("hr-nf")) && raw.includes("hr"));

    const isNareeCompanyGeneral =
      [
        "naree",
        "foundation",
        "nf",
        "naree foundation",
        "nareefoundation",
        "companyb",
        "company_b",
        "company2",
        "company-b",
        "beacon",
        "beacon-bio",
      ].includes(raw) ||
      raw === "naree@crm.com" ||
      raw === "naree@nf.in" ||
      raw === "naree@nfvs.in";

    if (isNareeIdentity) {
      targetEmail = raw.includes("@") ? raw : "hr@nf.in";
    } else if (isNareeCompanyGeneral) {
      targetEmail = "naree@crm.com";
    } else if (
      [
        "nfvs",
        "nfvs_studio",
        "studio",
        "venture",
        "naree foundation venture studio",
        "nareefoundationventurestudio",
        "companya",
        "company_a",
        "company1",
        "company-a",
        "apex",
        "apex-tech",
      ].includes(raw)
    ) {
      targetEmail = "nfvs@crm.com";
    } else if (["superadmin", "admin"].includes(raw)) {
      targetEmail = "superadmin@nfvs.internal";
    } else if (
      [
        "hr",
        "hr_id",
        "hrid",
        "hr_nfvs",
        "hr1",
        "hr@crm.com",
        "hr_studio",
        "chro",
        "hr@nfvs.in",
        "hr@nfvs.internal",
      ].includes(raw)
    ) {
      targetEmail = "hr@nfvs.in";
    }

    let user: any = null;
    let dbError: any = null;

    try {
      const dbLookup = db.user.findUnique({
        where: { email: targetEmail },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true },
              },
            },
          },
          employee: {
            include: {
              department: true,
              organization: true,
            },
          },
        },
      });

      user = await Promise.race([
        dbLookup,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Database operation timed out")), 600)
        ),
      ]);
    } catch (err: any) {
      console.warn(`[Auth] Database query failed for ${targetEmail}:`, err.message);
      dbError = err;
    }

    // When database authentication fails or user is not found,
    // verify against local store using account-specific bcrypt hash (no fallback/master passwords allowed).
    if (!user || dbError) {
      const offlineUser = await verifyOfflineCredentials(targetEmail || emailOrId, passwordPlain);
      if (offlineUser) {
        return offlineUser;
      }
      return null;
    }

    // Reject inactive, suspended or deleted accounts
    if (!user.isActive) {
      return null;
    }

    // Reject accounts with missing or malformed password hashes safely
    if (!user.passwordHash || !isValidBcryptHash(user.passwordHash)) {
      console.warn(`[Auth Security] Rejecting login for ${targetEmail}: password hash missing or malformed.`);
      return null;
    }

    // Every normal email/password login MUST verify the submitted password
    // against that specific user's stored bcrypt hash. No universal or master passwords.
    let isValid = false;
    try {
      isValid = await bcrypt.compare(passwordPlain, user.passwordHash);
    } catch {
      return null;
    }

    if (!isValid) {
      return null;
    }

    // Update lastLoginAt non-blocking in background
    db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }).catch(() => {});

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      roleCode: user.role.code as SystemRoleCode,
      roleName: user.role.name,
      roleLevel: user.role.level,
      dataScope: ((user.role as any).dataScope || "COMPANY") as any,
      isActive: user.isActive,
      activeCompany: user.employee ? {
        id: user.employee.organization.id,
        name: user.employee.organization.name,
        code: user.employee.organization.code,
        primaryColor: (user.employee.organization as any).primaryColor || "#2563eb",
      } : null,
      memberships: [],
      employee: user.employee
        ? {
            id: user.employee.id,
            employeeNumber: user.employee.employeeNumber,
            firstName: user.employee.firstName,
            lastName: user.employee.lastName,
            designation: user.employee.designation,
            departmentName: user.employee.department?.name || null,
            organizationName: user.employee.organization.name,
            organizationId: user.employee.organization.id,
            companyId: user.employee.organization.id,
            companyName: user.employee.organization.name,
          }
        : null,
      permissions: user.role.rolePermissions.map((rp: any) => rp.permission.code),
    };

    return authenticatedUser;
  }

  static async loginWithGoogle(email: string, name?: string, avatarUrl?: string) {
    const normalizedEmail = email.toLowerCase().trim();

    let user = await db.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
        employee: {
          include: {
            department: true,
            organization: true,
          },
        },
      },
    });

    if (!user) {
      // Find role: default to SUPER_ADMIN or first role
      let role = await db.role.findFirst({
        where: { code: "SUPER_ADMIN" },
      });
      if (!role) {
        role = await db.role.findFirst();
      }
      if (!role) {
        throw new Error("No system roles configured");
      }

      // Find or create organization
      let org = await db.organization.findFirst();
      if (!org) {
        org = await db.organization.create({
          data: {
            name: "CRM + NFVS Enterprise Group",
            code: "NFVS-CORP",
          },
        });
      }

      // Find department
      let dept = await db.department.findFirst({
        where: { organizationId: org.id },
      });

      const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
      const nameParts = (name || "Google User").trim().split(" ");
      const firstName = nameParts[0] || "Google";
      const lastName = nameParts.slice(1).join(" ") || "User";

      const createdUser = await db.user.create({
        data: {
          email: normalizedEmail,
          passwordHash: randomPassword,
          roleId: role.id,
          isActive: true,
          lastLoginAt: new Date(),
        },
      });

      const empNumber = `NFVS-G${Math.floor(1000 + Math.random() * 9000)}`;
      await db.employee.create({
        data: {
          organizationId: org.id,
          departmentId: dept?.id,
          userId: createdUser.id,
          employeeNumber: empNumber,
          firstName,
          lastName,
          email: normalizedEmail,
          avatarUrl: avatarUrl || null,
          designation: "Enterprise Executive",
          employmentType: "FULL_TIME",
          employmentStatus: "ACTIVE",
          hireDate: new Date(),
        },
      });

      user = await db.user.findUnique({
        where: { id: createdUser.id },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true },
              },
            },
          },
          employee: {
            include: {
              department: true,
              organization: true,
            },
          },
        },
      });
    } else {
      if (!user.isActive) {
        return null;
      }
      await db.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    if (!user) return null;

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      roleCode: user.role.code as SystemRoleCode,
      roleName: user.role.name,
      roleLevel: user.role.level,
      dataScope: ((user.role as any).dataScope || "COMPANY") as any,
      isActive: user.isActive,
      activeCompany: user.employee ? {
        id: user.employee.organization.id,
        name: user.employee.organization.name,
        code: user.employee.organization.code,
        primaryColor: (user.employee.organization as any).primaryColor || "#2563eb",
      } : null,
      memberships: [],
      employee: user.employee
        ? {
            id: user.employee.id,
            employeeNumber: user.employee.employeeNumber,
            firstName: user.employee.firstName,
            lastName: user.employee.lastName,
            designation: user.employee.designation,
            departmentName: user.employee.department?.name || null,
            organizationName: user.employee.organization.name,
            organizationId: user.employee.organization.id,
            companyId: user.employee.organization.id,
            companyName: user.employee.organization.name,
          }
        : null,
      permissions: user.role.rolePermissions.map((rp) => rp.permission.code),
    };

    return authenticatedUser;
  }
}
