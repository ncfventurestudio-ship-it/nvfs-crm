import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "./db";
import {
  AuthenticatedUser,
  SystemRoleCode,
  DataScopeCode,
  CompanySummary,
  UserCompanyMembershipSummary,
} from "@/types";
import { getOfflineUserByIdOrEmail } from "@/lib/offline-auth";

export const SESSION_COOKIE_NAME = "nfvs_session";
export const ACTIVE_COMPANY_COOKIE_NAME = "nfvs_active_company";
const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface SessionPayload {
  userId: string;
  email: string;
  roleCode: SystemRoleCode;
  activeCompanyId?: string;
  companyId?: string;
  organizationId?: string;
  expiresAt: number;
}

export function createSessionToken(user: {
  id: string;
  email: string;
  roleCode: SystemRoleCode;
  activeCompanyId?: string;
}): string {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    roleCode: user.roleCode,
    activeCompanyId: user.activeCompanyId,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function parseSessionToken(token: string): SessionPayload | null {
  try {
    const json = Buffer.from(token, "base64").toString("utf-8");
    const payload = JSON.parse(json) as SessionPayload;
    if (!payload.userId || !payload.expiresAt || payload.expiresAt < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

import { cache } from "react";

// In-memory session cache for rapid concurrent requests across API routes
interface CachedUserSession {
  user: AuthenticatedUser;
  cachedAt: number;
  companyKey: string;
}

const userSessionMemoryCache = new Map<string, CachedUserSession>();
const inFlightUserPromises = new Map<string, Promise<AuthenticatedUser | null>>();
const CACHE_TTL_MS = 120 * 1000; // 120 seconds (2 minutes)

export function invalidateUserSessionCache(userId?: string) {
  inFlightUserPromises.clear();
  if (userId) {
    userSessionMemoryCache.delete(userId);
  } else {
    userSessionMemoryCache.clear();
  }
}

export const getCurrentUser = cache(async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = parseSessionToken(token);
    if (!payload) return null;

    const requestedCompanyId =
      cookieStore.get(ACTIVE_COMPANY_COOKIE_NAME)?.value || payload.activeCompanyId || null;

    // Check in-memory cache first
    const cacheKey = `${payload.userId}:${requestedCompanyId || "default"}`;
    const cached = userSessionMemoryCache.get(payload.userId);
    const now = Date.now();
    if (cached && cached.companyKey === cacheKey && now - cached.cachedAt < CACHE_TTL_MS) {
      return cached.user;
    }

    // Deduplicate concurrent requests for the same user session
    const existingPromise = inFlightUserPromises.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }

    const loadPromise = (async () => {
      try {
        // Load user with roles and memberships
        const user = await db.user.findUnique({
          where: { id: payload.userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
        memberships: {
          include: {
            organization: true,
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        employee: {
          include: {
            department: true,
            team: true,
            organization: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      const offlineUser =
        getOfflineUserByIdOrEmail(payload.userId, requestedCompanyId || payload.activeCompanyId) ||
        getOfflineUserByIdOrEmail(payload.email, requestedCompanyId || payload.activeCompanyId);

      if (offlineUser) {
        userSessionMemoryCache.set(payload.userId, {
          user: offlineUser,
          cachedAt: now,
          companyKey: cacheKey,
        });
        return offlineUser;
      }

      userSessionMemoryCache.delete(payload.userId);
      return null;
    }

    const isSuperAdmin = user.role.code === "SUPER_ADMIN";

    // Determine memberships
    let membershipSummaries: UserCompanyMembershipSummary[] = [];

    let allOrgs: any[] | null = null;
    if (isSuperAdmin) {
      // Super Admin has access to all platform companies
      allOrgs = await db.organization.findMany({
        where: { status: { not: "ARCHIVED" } },
        orderBy: { name: "asc" },
      });
      membershipSummaries = allOrgs.map((org) => ({
        id: `sa_${org.id}`,
        companyId: org.id,
        companyName: org.name,
        companyCode: org.code,
        logo: org.logo,
        primaryColor: org.primaryColor || "#2563eb",
        roleCode: "SUPER_ADMIN" as SystemRoleCode,
        roleName: "Super Admin",
        isPrimary: org.code === "NFVS-CORP" || org.code === "APEX-TECH",
        status: org.status,
      }));
    } else if (user.memberships && user.memberships.length > 0) {
      membershipSummaries = user.memberships
        .filter((m) => m.status === "ACTIVE" && m.organization.status !== "ARCHIVED")
        .map((m) => ({
          id: m.id,
          companyId: m.organization.id,
          companyName: m.organization.name,
          companyCode: m.organization.code,
          logo: m.organization.logo,
          primaryColor: m.organization.primaryColor || "#2563eb",
          roleCode: (m.role?.code as SystemRoleCode) || (user.role.code as SystemRoleCode),
          roleName: m.role?.name || user.role.name,
          isPrimary: m.isPrimary,
          status: m.status,
        }));
    } else if (user.employee?.organization) {
      membershipSummaries = [
        {
          id: `primary_${user.employee.organization.id}`,
          companyId: user.employee.organization.id,
          companyName: user.employee.organization.name,
          companyCode: user.employee.organization.code,
          logo: user.employee.organization.logo,
          primaryColor: user.employee.organization.primaryColor || "#2563eb",
          roleCode: user.role.code as SystemRoleCode,
          roleName: user.role.name,
          isPrimary: true,
          status: user.employee.organization.status,
        },
      ];
    }

    // Determine active company
    let activeCompanyId: string | null = null;

    if (requestedCompanyId) {
      const isAllowed =
        isSuperAdmin ||
        membershipSummaries.some((m) => m.companyId === requestedCompanyId) ||
        requestedCompanyId === user.employee?.organizationId;
      if (isAllowed) {
        activeCompanyId = requestedCompanyId;
      }
    }

    if (!activeCompanyId) {
      const primary = membershipSummaries.find((m) => m.isPrimary);
      activeCompanyId = primary?.companyId || membershipSummaries[0]?.companyId || user.employee?.organizationId || null;
    }

    // Load active organization details (reuse in-memory org if already loaded to eliminate redundant query)
    let activeCompanySummary: CompanySummary | null = null;
    if (activeCompanyId) {
      let orgRecord: any =
        allOrgs?.find((o) => o.id === activeCompanyId) ||
        user.memberships.find((m) => m.organization?.id === activeCompanyId)?.organization ||
        (user.employee?.organization?.id === activeCompanyId ? user.employee.organization : null);

      if (!orgRecord) {
        orgRecord = await db.organization.findUnique({
          where: { id: activeCompanyId },
        });
      }

      if (orgRecord) {
        activeCompanySummary = {
          id: orgRecord.id,
          companyId: orgRecord.id,
          name: orgRecord.name,
          companyName: orgRecord.name,
          code: orgRecord.code,
          companyCode: orgRecord.code,
          legalName: orgRecord.legalName,
          logo: orgRecord.logo,
          favicon: orgRecord.favicon,
          primaryColor: orgRecord.primaryColor || "#2563eb",
          secondaryColor: orgRecord.secondaryColor || "#1e40af",
          industry: orgRecord.industry,
          website: orgRecord.website,
          email: orgRecord.email,
          phone: orgRecord.phone,
          address: orgRecord.address,
          currency: orgRecord.currency,
          timezone: orgRecord.timezone,
          dateFormat: orgRecord.dateFormat,
          fiscalYear: orgRecord.fiscalYear,
          status: orgRecord.status,
        };
      }
    }

    // Determine active role & permissions (company specific if configured, otherwise platform/default role)
    const activeMembership = user.memberships.find(
      (m) => m.organizationId === activeCompanyId && m.role
    );
    const activeRole = activeMembership?.role || user.role;
    const activePermissions = activeRole.rolePermissions.map((rp) => rp.permission.code);

    // Determine employee profile for active company (reuse in-memory employee if already for this company)
    let activeEmployee: any = null;
    if (activeCompanyId) {
      if (user.employee && user.employee.organizationId === activeCompanyId) {
        activeEmployee = user.employee;
      } else {
        activeEmployee = await db.employee.findFirst({
          where: {
            organizationId: activeCompanyId,
            OR: [{ userId: user.id }, { email: user.email }],
          },
          include: { department: true, team: true, organization: true },
        });
      }
    }

    // Build employee context strictly bound to the active company
    let finalEmployee: any = null;
    if (activeEmployee) {
      finalEmployee = {
        id: activeEmployee.id,
        employeeNumber: activeEmployee.employeeNumber,
        firstName: activeEmployee.firstName,
        lastName: activeEmployee.lastName,
        designation: activeEmployee.designation,
        departmentName: activeEmployee.department?.name || null,
        departmentCode: activeEmployee.department?.code || null,
        departmentId: activeEmployee.departmentId,
        teamName: activeEmployee.team?.name || null,
        teamId: activeEmployee.teamId || null,
        organizationName: activeEmployee.organization.name,
        organizationId: activeEmployee.organization.id,
        companyId: activeEmployee.organization.id,
        companyName: activeEmployee.organization.name,
        managerId: activeEmployee.managerId,
        workMode: activeEmployee.workMode,
        location: activeEmployee.location,
        employmentType: activeEmployee.employmentType,
      };
    } else if (activeCompanySummary) {
      // Synthesize an active profile scoped to this active company
      // so all org-scoped queries (OverviewDashboard, tasks, finances) properly isolate to activeCompanyId
      const firstDept = await db.department.findFirst({
        where: { organizationId: activeCompanySummary.id },
      });
      finalEmployee = {
        id: `virtual_${user.id}_${activeCompanySummary.id}`,
        employeeNumber: `${activeCompanySummary.code}-EX-${user.id.slice(-4).toUpperCase()}`,
        firstName: user.email.split("@")[0].toUpperCase(),
        lastName: `(${activeCompanySummary.code})`,
        designation: activeRole.name,
        departmentName: firstDept?.name || "Executive Directorate",
        departmentCode: firstDept?.code || null,
        departmentId: firstDept?.id || "",
        teamName: null,
        teamId: null,
        organizationName: activeCompanySummary.name,
        organizationId: activeCompanySummary.id,
        companyId: activeCompanySummary.id,
        companyName: activeCompanySummary.name,
        managerId: null,
        workMode: "HYBRID",
        location: "Headquarters",
        employmentType: "FULL_TIME",
      };
    }

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      roleCode: activeRole.code as SystemRoleCode,
      roleName: activeRole.name,
      roleLevel: activeRole.level,
      dataScope: (activeRole.dataScope as DataScopeCode) || (isSuperAdmin ? "GLOBAL" : "SELF"),
      isActive: user.isActive,
      activeCompany: activeCompanySummary,
      memberships: membershipSummaries,
      employee: finalEmployee,
      permissions: activePermissions,
    };

        userSessionMemoryCache.set(payload.userId, {
          user: authenticatedUser,
          cachedAt: now,
          companyKey: cacheKey,
        });

        return authenticatedUser;
      } catch (err: any) {
        console.warn("[Auth Warning] DB query failed, resolving user via offline/persona store:", err?.message);
        const offlineUser =
          getOfflineUserByIdOrEmail(payload.userId, requestedCompanyId || payload.activeCompanyId) ||
          getOfflineUserByIdOrEmail(payload.email, requestedCompanyId || payload.activeCompanyId);

        if (offlineUser) {
          userSessionMemoryCache.set(payload.userId, {
            user: offlineUser,
            cachedAt: now,
            companyKey: cacheKey,
          });
          return offlineUser;
        }

        return null;
      } finally {
        inFlightUserPromises.delete(cacheKey);
      }
    })();

    inFlightUserPromises.set(cacheKey, loadPromise);
    return await loadPromise;
  } catch (error) {
    console.error("[Auth Error]: Failed in getCurrentUser wrapper", error);
    return null;
  }
});
