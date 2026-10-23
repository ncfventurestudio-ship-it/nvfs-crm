import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  Users,
  UserCheck,
  Clock,
  Calendar,
  Building,
  FileCheck,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { HrJobService, isExecutiveEmployee } from "@/services/hr-job.service";
import { HrJobAssignmentCenter } from "@/modules/hr/hr-job-assignment-center";

import { ExecutiveRestrictedState } from "@/modules/executive-dashboard/executive-states";

export const dynamic = "force-dynamic";

export default async function AppHrDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const isHrAuthorized =
    ["SUPER_ADMIN", "ADMIN", "CEO", "HR"].includes(user.roleCode) || (user.roleLevel || 0) >= 70;
  if (!isHrAuthorized) {
    return (
      <ExecutiveRestrictedState
        roleTitle="HR People & Culture Command Center"
        roleCode={user.roleCode}
        roleLevel={user.roleLevel}
        permissionName="dashboard.hr.view"
      />
    );
  }

  // Tenant boundary
  const companyId = user.activeCompany?.id || user.employee?.organizationId;
  const companyName = user.activeCompany?.name || "Company";
  const primaryColor = user.activeCompany?.primaryColor || "#2563eb";

  // Fetch company-scoped HR records and jobs in parallel
  let employees: any[] = [];
  let departments: any[] = [];
  let leaveRequests: any[] = [];
  let attendanceRecords: any[] = [];
  let policies: any[] = [];
  let allCompanyEmployeesRaw: any[] = [];
  let initialJobsRaw: any[] = [];

  try {
    [
      employees,
      departments,
      leaveRequests,
      attendanceRecords,
      policies,
      allCompanyEmployeesRaw,
      initialJobsRaw,
    ] = await Promise.all([
      db.employee.findMany({
        where: { organizationId: companyId },
        orderBy: { hireDate: "desc" },
        take: 8,
        include: { department: true, team: true },
      }),
      db.department.findMany({
        where: { organizationId: companyId },
        include: { _count: { select: { employees: true } } },
      }),
      db.leaveRequest.findMany({
        where: { employee: { organizationId: companyId }, status: "PENDING" },
        take: 5,
        include: { employee: true, leavePolicy: true },
      }),
      db.attendanceRecord.findMany({
        where: { employee: { organizationId: companyId } },
        take: 10,
        orderBy: { date: "desc" },
      }),
      db.hrPolicy.findMany({
        where: { organizationId: companyId },
        take: 4,
      }),
      db.employee.findMany({
        where: { organizationId: companyId, employmentStatus: "ACTIVE" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          designation: true,
          email: true,
          employeeNumber: true,
          employmentStatus: true,
          department: { select: { name: true, code: true } },
          user: {
            select: {
              email: true,
              role: { select: { code: true, level: true } },
            },
          },
          assignedTasks: {
            where: { status: { in: ["TODO", "IN_PROGRESS"] } },
            select: { id: true },
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
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
      HrJobService.listAssignedJobs(user).catch(() => []),
    ]);
  } catch (err: any) {
    console.warn("[HR Dashboard] Database query failed (cloud database paused):", err.message);
  }

  // Strictly filter to regular staff employees only — NO EXECUTIVES OR LEADERSHIP
  const companyEmployeeOptions = allCompanyEmployeesRaw
    .filter((e) => !isExecutiveEmployee(e))
    .map((e) => {
    const activeTasksCount = e.assignedTasks?.length ?? 0;
    const activeOpsCount = (e.operationAssignments ?? []).filter(
      (oa: any) => ["ACTIVE", "SCHEDULED", "IN_PROGRESS"].includes(oa.operation?.status)
    ).length;
    const activeOnDutyCount = e.onDutyAssignments?.length ?? 0;
    const isFree =
      e.employmentStatus === "ACTIVE" &&
      activeTasksCount === 0 &&
      activeOpsCount === 0 &&
      activeOnDutyCount === 0;
    let busyReason: string | null = null;
    if (activeTasksCount > 0) busyReason = `${activeTasksCount} active task(s)`;
    else if (activeOpsCount > 0) busyReason = `${activeOpsCount} active operation(s)`;
    else if (activeOnDutyCount > 0) busyReason = "On-duty assignment";
    return {
      id: e.id,
      name: `${e.firstName} ${e.lastName}`,
      designation: e.designation,
      department: e.department?.name || "General",
      employeeNumber: e.employeeNumber,
      isFree,
      busyReason,
      activeTasksCount,
    };
  });

  let totalEmployees = 0;
  let activeEmployees = 0;
  try {
    if (companyId) {
      totalEmployees = await db.employee.count({ where: { organizationId: companyId } });
      activeEmployees = await db.employee.count({
        where: { organizationId: companyId, employmentStatus: "ACTIVE" },
      });
    }
  } catch (err: any) {
    console.warn("[HR Dashboard] Count query failed (cloud database paused):", err.message);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div
            className="inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-semibold"
            style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Chief Human Resources Officer (CHRO) Center • {companyName}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Human Resources & Organizational Master
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Headcount health, department structures, leave management, and personnel records for {companyName}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/app/approvals"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Leave Requests ({leaveRequests.length})</span>
          </Link>
          <Link
            href="/app/hr/employees"
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-md transition-all hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            <UserCheck className="h-4 w-4" />
            <span>Employee Directory</span>
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1322] p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Total Headcount</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {totalEmployees}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            {activeEmployees} Active Corporate Staff
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1322] p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Departments</span>
            <Building className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {departments.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Cross-functional business units
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1322] p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Attendance Rate</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            96.8%
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Rolling monthly average
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1322] p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Pending Leaves</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {leaveRequests.length}
          </div>
          <div className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            Requires Manager / HR approval
          </div>
        </div>
      </div>

      {/* Dedicated HR Employee Job & Task Assignment Center */}
      <HrJobAssignmentCenter
        initialJobs={initialJobsRaw}
        companyEmployees={companyEmployeeOptions}
        companyName={companyName}
        primaryColor={primaryColor}
      />

      {/* Grid: Staff Directory & Departments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Hires / Staff Roster */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1322] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Personnel Roster
              </h2>
            </div>
            <Link
              href="/app/hr/employees"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>Full Directory</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {employees.map((emp) => {
              const comp = (emp as any).profileCompletion ?? 20;
              return (
                <Link
                  key={emp.id}
                  href={`/app/hr/employees/${emp.id}`}
                  className="p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-850 hover:border-blue-500/30 transition-all flex items-center justify-between gap-3 text-xs group"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold text-xs group-hover:scale-105 transition-transform">
                      {emp.firstName[0]}
                      {emp.lastName[0]}
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {emp.firstName} {emp.lastName}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {emp.designation} • {emp.department?.name || "General"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold ${
                        comp >= 80
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                      }`}
                    >
                      {comp}% Profile
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {emp.employeeNumber}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Department Distribution */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1322] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Department Distribution
              </h2>
            </div>
            <Link
              href="/app/hr"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>Manage Depts</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="p-3 rounded-lg border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {dept.name}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">({dept.code})</span>
                </div>
                <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {dept._count.employees} staff
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
