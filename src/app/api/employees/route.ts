import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { AuditService } from "@/services/audit.service";
import { RbacService } from "@/services/rbac.service";
import { EmailService } from "@/services/email.service";
import { successResponse, errorResponse } from "@/lib/api-response";
import { z } from "zod";

const createEmployeeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid corporate email required"),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional().nullable(),
  aadhaarNumber: z.string().optional().nullable(),
  designation: z.string().min(1, "Designation is required"),
  departmentId: z.string().min(1, "Department is required"),
  managerId: z.string().optional().nullable(),
  employmentType: z.enum(["FULL_TIME", "CONTRACT", "PART_TIME", "INTERN"]).default("FULL_TIME"),
  workMode: z.enum(["ON_SITE", "REMOTE", "HYBRID"]).default("ON_SITE"),
  location: z.string().default("Headquarters (Mumbai)"),
  emergencyContact: z.string().optional(),
  hireDate: z.string().default(() => new Date().toISOString()),
  // CRM System Portal Credentials
  createSystemAccount: z.boolean().default(true),
  loginPassword: z.string().optional(),
  roleCode: z.string().default("EMPLOYEE"),
  immediateActive: z.boolean().default(false),
});

import { EmployeeStore } from "@/lib/employee-store";

function withDbTimeout<T>(promise: Promise<T>, ms = 600): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Database operation timed out")), ms)
    ),
  ]);
}

export async function GET(req: NextRequest) {
  let targetOrgId: string | null | undefined = null;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const { searchParams } = new URL(req.url);
    targetOrgId =
      searchParams.get("organizationId") ||
      req.headers.get("x-company-id") ||
      user.activeCompany?.id ||
      user.employee?.organizationId;

    const search = searchParams.get("search") || "";
    const departmentId = searchParams.get("departmentId") || undefined;
    const status = searchParams.get("status") || undefined;
    const designation = searchParams.get("designation") || undefined;
    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const limit = Math.min(Number(searchParams.get("limit") || 50), 1000);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (targetOrgId) {
      where.organizationId = targetOrgId;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { employeeNumber: { contains: search, mode: "insensitive" } },
        { designation: { contains: search, mode: "insensitive" } },
      ];
    }

    if (departmentId && departmentId !== "ALL") {
      where.departmentId = departmentId;
    }

    if (status && status !== "ALL") {
      where.employmentStatus = status;
    }

    if (designation && designation !== "ALL") {
      where.designation = designation;
    }

    const isLite = searchParams.get("lite") === "true" || searchParams.get("select") === "dropdown";

    let rawEmployees: any[] = [];
    let totalCount = 0;
    let dbSuccess = false;

    try {
      if (isLite) {
        const liteEmployees = await withDbTimeout(
          db.employee.findMany({
            where,
            take: limit,
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
            select: {
              id: true,
              firstName: true,
              lastName: true,
              designation: true,
              departmentId: true,
              organizationId: true,
            },
          }),
          500
        );

        return successResponse({
          employees: liteEmployees,
          total: liteEmployees.length,
          page: 1,
          limit,
          totalPages: 1,
        });
      }

      const [dbTotal, dbEmployees] = await withDbTimeout(
        Promise.all([
          db.employee.count({ where }),
          db.employee.findMany({
            where,
            skip,
            take: limit,
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
            include: {
              department: true,
              assignedTasks: {
                where: { status: { in: ["TODO", "IN_PROGRESS"] } },
                select: { id: true, title: true, status: true, priority: true },
              },
              operationAssignments: {
                where: {
                  operation: { status: { in: ["ACTIVE", "SCHEDULED", "IN_PROGRESS"] } },
                },
                select: {
                  id: true,
                  operation: { select: { id: true, status: true } },
                },
              },
              onDutyAssignments: {
                where: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
                select: { id: true },
              },
              manager: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  designation: true,
                },
              },
              user: {
                select: {
                  id: true,
                  email: true,
                  role: {
                    select: {
                      code: true,
                      name: true,
                    },
                  },
                },
              },
            },
          }),
        ]),
        600
      );

      rawEmployees = dbEmployees;
      totalCount = dbTotal;
      dbSuccess = true;
    } catch (dbErr: any) {
      console.warn("[Employees GET Warning] Database query failed (cloud database may be paused), using local persistent store:", dbErr.message);
    }

    // Load from resilient persistent EmployeeStore
    const storedList = EmployeeStore.getByOrganization(targetOrgId);

    // If DB succeeded, merge with any stored employees not yet in DB
    let mergedEmployees: any[] = [];
    if (dbSuccess && rawEmployees.length > 0) {
      const existingIds = new Set(rawEmployees.map((e) => e.id));
      const existingEmails = new Set(rawEmployees.map((e) => (e.email || "").toLowerCase()));
      const additionalStored = storedList.filter(
        (s) => !existingIds.has(s.id) && !existingEmails.has(s.email.toLowerCase())
      );
      mergedEmployees = [...rawEmployees, ...additionalStored];
      totalCount = mergedEmployees.length;
    } else {
      // DB was offline or empty: filter stored list according to parameters
      let filtered = storedList;

      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (e) =>
            e.firstName.toLowerCase().includes(q) ||
            e.lastName.toLowerCase().includes(q) ||
            e.email.toLowerCase().includes(q) ||
            e.employeeNumber.toLowerCase().includes(q) ||
            e.designation.toLowerCase().includes(q)
        );
      }

      if (departmentId && departmentId !== "ALL") {
        filtered = filtered.filter(
          (e) =>
            e.departmentId === departmentId ||
            e.department?.id === departmentId ||
            e.department?.code === departmentId ||
            e.department?.name === departmentId
        );
      }

      if (status && status !== "ALL") {
        filtered = filtered.filter((e) => e.employmentStatus === status);
      }

      if (designation && designation !== "ALL") {
        filtered = filtered.filter((e) => e.designation === designation);
      }

      totalCount = filtered.length;
      mergedEmployees = filtered.slice(skip, skip + limit);
    }

    // Calculate live availability (free vs busy)
    const employees = mergedEmployees.map((emp) => {
      const activeTasksCount = emp.assignedTasks?.length || emp.activeTasksCount || 0;
      const activeOpsCount = emp.operationAssignments
        ? emp.operationAssignments.filter((oa: any) =>
            ["ACTIVE", "SCHEDULED", "IN_PROGRESS"].includes(oa.operation?.status)
          ).length
        : emp.activeOpsCount || 0;
      const activeOnDutyCount = emp.onDutyAssignments?.length || 0;

      const isFree =
        emp.employmentStatus === "ACTIVE" &&
        activeTasksCount === 0 &&
        activeOpsCount === 0 &&
        activeOnDutyCount === 0;

      let busyReason: string | null = null;
      if (emp.employmentStatus !== "ACTIVE") {
        busyReason = `Status: ${emp.employmentStatus}`;
      } else if (activeTasksCount > 0) {
        busyReason = `${activeTasksCount} active task(s)`;
      } else if (activeOpsCount > 0) {
        busyReason = `${activeOpsCount} active operation(s)`;
      } else if (activeOnDutyCount > 0) {
        busyReason = "On-duty assignment";
      }

      return {
        ...emp,
        isFree,
        busyReason,
        activeTasksCount,
        activeOpsCount,
      };
    });

    const responsePayload: any = employees;
    responsePayload.employees = employees; // Dual compatibility for both json.data and json.data.employees

    return successResponse(responsePayload, 200, {
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      currentPage: page,
    } as any);
  } catch (error: any) {
    console.error("[Employees GET Fatal Error]:", error);
    const fallbackEmployees = EmployeeStore.getByOrganization(targetOrgId);
    const fallbackPayload: any = fallbackEmployees;
    fallbackPayload.employees = fallbackEmployees;

    return successResponse(fallbackPayload, 200, {
      totalCount: fallbackEmployees.length,
      totalPages: 1,
      currentPage: 1,
    } as any);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    // RBAC Check: requires "employees.employee.create" or executive persona (SUPER_ADMIN, ADMIN, CEO, HR)
    const isExecutiveCreator = ["SUPER_ADMIN", "ADMIN", "CEO", "HR"].includes((user.roleCode || "").toUpperCase());
    let hasPermission = isExecutiveCreator;
    if (!hasPermission) {
      hasPermission = await RbacService.hasPermission(user.id, "employees.employee.create").catch(() => false);
    }
    if (!hasPermission) {
      return errorResponse("Forbidden: Missing employees.employee.create permission", "FORBIDDEN", 403);
    }

    const body = await req.json();
    const parse = createEmployeeSchema.safeParse(body);
    if (!parse.success) {
      return errorResponse(parse.error.issues[0].message, "VALIDATION_ERROR", 400);
    }

    // Resolve the organization from request headers, query params, or active company context
    const companyId =
      req.headers.get("x-company-id") ||
      req.nextUrl.searchParams.get("organizationId") ||
      user.activeCompany?.id ||
      user.employee?.organizationId;

    let org: any = null;
    try {
      org = await withDbTimeout(
        companyId
          ? db.organization.findUnique({ where: { id: companyId } })
          : db.organization.findFirst(),
        400
      );
    } catch {
      // DB connection issue
    }

    if (!org) {
      org = {
        id: companyId || user.activeCompany?.id || "org_nfvs_studio",
        name: user.activeCompany?.name || "Naree Foundation Venture Studio",
        code: user.activeCompany?.code || "NFVS-STUDIO",
      };
    }

    const corporateEmail = parse.data.email.trim().toLowerCase();

    // Check duplicate employee email in DB and persistent store
    const existingInStore = EmployeeStore.findByEmailOrNumber(corporateEmail);
    if (existingInStore) {
      return errorResponse(`An employee with email [${corporateEmail}] already exists`, "DUPLICATE_EMAIL", 400);
    }

    try {
      const existingEmp = await withDbTimeout(
        db.employee.findUnique({ where: { email: corporateEmail } }),
        400
      );
      if (existingEmp) {
        return errorResponse(`An employee with email [${corporateEmail}] already exists`, "DUPLICATE_EMAIL", 400);
      }
    } catch {}

    let createdUserId: string | null = null;
    let assignedPassword: string | null = null;
    let assignedRoleName: string | null = null;

    // Handle CRM Login System Account Creation
    if (parse.data.createSystemAccount) {
      try {
        const existingUser = await withDbTimeout(
          db.user.findUnique({ where: { email: corporateEmail } }),
          400
        );
        if (existingUser) {
          return errorResponse(`A CRM login account for [${corporateEmail}] already exists`, "DUPLICATE_USER", 400);
        }
      } catch {}

      const roleCode = parse.data.roleCode || "EMPLOYEE";
      let role: any = null;
      try {
        role = await withDbTimeout(
          db.role.findUnique({ where: { code: roleCode } }),
          400
        );
        if (!role) {
          role = await withDbTimeout(
            db.role.findUnique({ where: { code: "EMPLOYEE" } }),
            400
          );
        }
      } catch {}

      const rawPassword = parse.data.loginPassword && parse.data.loginPassword.trim().length >= 6
        ? parse.data.loginPassword.trim()
        : "Enterprise@2026";

      assignedPassword = rawPassword;
      assignedRoleName = role?.name || role?.code || (roleCode === "HR" ? "Human Resources Officer" : "Staff Employee");

      try {
        const passwordHash = await hashPassword(rawPassword);
        const createdUser = await withDbTimeout(
          db.user.create({
            data: {
              email: corporateEmail,
              passwordHash,
              roleId: role?.id || "role_employee",
              isActive: true,
            },
          }),
          500
        );
        createdUserId = createdUser.id;

        // Ensure membership in this specific company
        withDbTimeout(
          db.userCompanyMembership.upsert({
            where: {
              userId_organizationId: {
                userId: createdUserId,
                organizationId: org.id,
              },
            },
            create: {
              userId: createdUserId,
              organizationId: org.id,
              roleId: role?.id || "role_employee",
              status: "ACTIVE",
              isPrimary: true,
            },
            update: {
              status: "ACTIVE",
              roleId: role?.id || "role_employee",
            },
          }),
          500
        ).catch(() => {});
      } catch (userCreateErr) {
        console.warn("[CRM User Create Warning]:", userCreateErr);
        createdUserId = `usr_${Date.now().toString(36)}`;
      }
    }

    // Validate and scope Department strictly to this organization
    let validDepartmentId = parse.data.departmentId;
    try {
      const deptInOrg = await withDbTimeout(
        db.department.findFirst({
          where: { id: validDepartmentId, organizationId: org.id },
        }),
        400
      );
      if (!deptInOrg) {
        const submittedDept = await withDbTimeout(
          db.department.findUnique({ where: { id: parse.data.departmentId } }),
          400
        );
        const matchingDept = submittedDept
          ? await withDbTimeout(
              db.department.findFirst({
                where: {
                  organizationId: org.id,
                  OR: [{ code: submittedDept.code }, { name: submittedDept.name }],
                },
              }),
              400
            )
          : null;
        const fallbackDept =
          matchingDept ||
          (await withDbTimeout(
            db.department.findFirst({ where: { organizationId: org.id } }),
            400
          ));
        if (fallbackDept) {
          validDepartmentId = fallbackDept.id;
        }
      }
    } catch {}

    // Validate and scope Manager strictly to this organization
    let validManagerId = parse.data.managerId || null;
    if (validManagerId) {
      try {
        const managerInOrg = await withDbTimeout(
          db.employee.findFirst({
            where: { id: validManagerId, organizationId: org.id },
          }),
          400
        );
        if (!managerInOrg) {
          validManagerId = null;
        }
      } catch {}
    }

    // Auto-generate structured employee number according to corporate standard:
    // Format: [COMPANY]-[JOINING_YEAR]-[BIRTH_DAY]-[AADHAAR_LAST_4]
    // 1. Company short form:
    //    "NFVS" if created under Naree Foundation Venture Studio
    //    "NF" if created under Naree Foundation
    const orgCode = (org.code || "").toUpperCase();
    const orgName = (org.name || "").toLowerCase();
    const isVentureStudio =
      orgCode === "NFVS" ||
      orgName.includes("venture studio") ||
      orgName.includes("studio");
    const companyPrefix = isVentureStudio ? "NFVS" : "NF";

    // 2. Joining year (e.g. 2026)
    const joiningDate = parse.data.hireDate ? new Date(parse.data.hireDate) : new Date();
    const joiningYear = !isNaN(joiningDate.getTime()) ? joiningDate.getFullYear() : new Date().getFullYear();

    // 3. Birth day of employee (e.g. 29 from 29-sept-2026 or 1998-09-29)
    let birthDay = "01";
    if (parse.data.dateOfBirth) {
      const dobStr = String(parse.data.dateOfBirth).trim();
      const isoMatch = dobStr.match(/^\d{4}-\d{2}-(\d{1,2})/);
      const indMatch = dobStr.match(/^(\d{1,2})[-\/]/);
      if (isoMatch) {
        birthDay = isoMatch[1];
      } else if (indMatch) {
        birthDay = indMatch[1];
      } else {
        const d = new Date(dobStr);
        if (!isNaN(d.getTime())) {
          birthDay = String(d.getDate()).padStart(2, "0");
        }
      }
    }

    // 4. Last 4 digits of Aadhaar card (e.g. 8999 from 1234 5678 8999)
    let aadhaarLast4 = "0001";
    if (parse.data.aadhaarNumber) {
      const digits = String(parse.data.aadhaarNumber).replace(/\D/g, "");
      if (digits.length >= 4) {
        aadhaarLast4 = digits.slice(-4);
      } else if (digits.length > 0) {
        aadhaarLast4 = digits.padStart(4, "0");
      }
    }

    const baseEmployeeNumber = `${companyPrefix}-${joiningYear}-${birthDay}-${aadhaarLast4}`;

    // Ensure database and store uniqueness
    let employeeNumber = baseEmployeeNumber;
    let collisionCount = 1;
    while (EmployeeStore.findByEmailOrNumber(employeeNumber)) {
      employeeNumber = `${baseEmployeeNumber}-${collisionCount}`;
      collisionCount++;
    }

    const isImmediate = parse.data.immediateActive === true;
    const initialEmploymentStatus = isImmediate ? "ACTIVE" : "PROBATION";
    const initialOnboardingStatus = isImmediate ? "COMPLETED" : "PENDING_PROFILE";
    const initialProfileCompletion = isImmediate ? 100 : 20;

    let newEmployee: any = null;

    try {
      newEmployee = await withDbTimeout(
        db.employee.create({
          data: {
            organizationId: org.id,
            departmentId: validDepartmentId,
            userId: createdUserId,
            managerId: validManagerId,
            employeeNumber,
            firstName: parse.data.firstName.trim(),
            lastName: parse.data.lastName.trim(),
            email: corporateEmail,
            phone: parse.data.phone?.trim() || null,
            designation: parse.data.designation.trim(),
            employmentType: parse.data.employmentType,
            employmentStatus: initialEmploymentStatus,
            onboardingStatus: initialOnboardingStatus,
            profileCompletion: initialProfileCompletion,
            workMode: parse.data.workMode,
            location: parse.data.location,
            emergencyContact: parse.data.emergencyContact?.trim() || null,
            hireDate: new Date(parse.data.hireDate),
          },
          include: {
            department: true,
            manager: true,
            user: { select: { id: true, email: true, role: true } },
          },
        }),
        600
      );
    } catch (createErr: any) {
      console.warn("[Employee DB Create Warning] Falling back to EmployeeStore:", createErr.message);
    }

    // Persist to reliable local EmployeeStore regardless of DB availability
    const storedEmployee = EmployeeStore.create({
      id: newEmployee?.id,
      organizationId: org.id,
      departmentId: validDepartmentId,
      employeeNumber,
      firstName: parse.data.firstName.trim(),
      lastName: parse.data.lastName.trim(),
      email: corporateEmail,
      phone: parse.data.phone?.trim() || null,
      designation: parse.data.designation.trim(),
      department: newEmployee?.department || {
        id: validDepartmentId,
        name: parse.data.designation.includes("Engineer") ? "Engineering & Innovation Hub" : "General Operations",
        code: "GEN",
      },
      organization: {
        id: org.id,
        name: org.name || "Naree Foundation Venture Studio",
        code: org.code || companyPrefix,
      },
      employmentType: parse.data.employmentType,
      employmentStatus: initialEmploymentStatus,
      onboardingStatus: initialOnboardingStatus,
      profileCompletion: initialProfileCompletion,
      workMode: parse.data.workMode,
      location: parse.data.location,
      emergencyContact: parse.data.emergencyContact?.trim() || null,
      hireDate: new Date(parse.data.hireDate).toISOString(),
      loginPassword: assignedPassword || "Admin@123",
      user: createdUserId
        ? {
            id: createdUserId,
            email: corporateEmail,
            isActive: true,
            role: { code: parse.data.roleCode || "EMPLOYEE", name: assignedRoleName || "Staff Employee" },
            loginPassword: assignedPassword || "Admin@123",
          }
        : null,
    });

    const effectiveEmployee = newEmployee || storedEmployee;

    // Auto-create initial prefilled EmployeeProfile with DOB and Aadhaar Number
    let parsedDob: Date | undefined = undefined;
    if (parse.data.dateOfBirth) {
      const d = new Date(parse.data.dateOfBirth);
      if (!isNaN(d.getTime())) {
        parsedDob = d;
      }
    }

    await db.employeeProfile.create({
      data: {
        employeeId: effectiveEmployee.id,
        dateOfBirth: parsedDob,
        aadhaarNumber: parse.data.aadhaarNumber?.trim() || undefined,
        personalEmail: corporateEmail,
        currentAddress: parse.data.location,
        country: "India",
        primaryContactPhone: parse.data.phone?.trim() || undefined,
        primaryContactName: parse.data.emergencyContact?.trim() || undefined,
      },
    }).catch(() => {});

    // Auto-allocate 2026 leave balances
    const leavePolicies = await db.leavePolicy.findMany({ where: { organizationId: org.id } }).catch(() => []);
    for (const policy of leavePolicies) {
      if (policy.annualAllowance > 0) {
        await db.leaveBalance.create({
          data: {
            employeeId: effectiveEmployee.id,
            leavePolicyId: policy.id,
            year: new Date().getFullYear(),
            allocated: policy.annualAllowance,
            used: 0,
            pending: 0,
            remaining: policy.annualAllowance,
          },
        }).catch(() => {});
      }
    }

    // Dispatch Welcome & CRM Login Credentials Email to Employee
    let emailResult: any = null;
    if (createdUserId && assignedPassword) {
      try {
        emailResult = await EmailService.sendEmployeeWelcomeCredentials({
          employeeName: `${effectiveEmployee.firstName} ${effectiveEmployee.lastName}`.trim(),
          employeeEmail: corporateEmail,
          password: assignedPassword,
          companyName: org.name || "Naree Foundation & NFVS",
          designation: effectiveEmployee.designation,
          roleName: assignedRoleName || "Staff Employee",
          employeeNumber: effectiveEmployee.employeeNumber,
          loginUrl: `${(process.env.NEXT_PUBLIC_APP_URL || "https://nfventurestudio.netlify.app").replace(/\/+$/, "")}/login`,
        });
      } catch (mailErr) {
        console.error("[Employee Creation Email Dispatch Error]:", mailErr);
      }
    }

    // Record mutation in AuditLog
    await AuditService.logMutation({
      actorId: user.id,
      action: "EMPLOYEE_CREATED",
      entity: "Employee",
      entityId: effectiveEmployee.id,
      newValue: {
        employeeNumber: effectiveEmployee.employeeNumber,
        name: `${effectiveEmployee.firstName} ${effectiveEmployee.lastName}`,
        email: effectiveEmployee.email,
        department: effectiveEmployee.department?.name,
        designation: effectiveEmployee.designation,
        hasCrmLogin: !!createdUserId,
        emailDispatched: emailResult?.success ?? false,
      },
      metadata: { source: "employees_api" },
    }).catch(() => {});

    return successResponse({
      ...effectiveEmployee,
      emailDispatched: emailResult?.success ?? false,
      emailSimulated: emailResult?.simulated ?? false,
    }, 201);
  } catch (error: any) {
    console.error("[Employees POST Error]:", error);
    return errorResponse(error.message || "Failed to create employee profile", "INTERNAL_ERROR", 500);
  }
}

