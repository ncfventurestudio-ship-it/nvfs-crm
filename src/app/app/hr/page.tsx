import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { HrNav } from "@/modules/hr/components/hr-nav";
import { KPICard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Clock,
  CalendarDays,
  CalendarOff,
  BookOpen,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Clock4,
} from "lucide-react";

export const metadata = {
  title: "HR Core Cockpit | CRM + NFVS",
  description: "Enterprise Human Resource, Attendance, Leaves and Compliance Dashboard",
};

export const dynamic = "force-dynamic";

export default async function HRModulePage() {
  const user = await getCurrentUser();
  const orgId = user?.employee?.organizationId || "";

  // 1. Fetch live metrics
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalEmployees = 0;
  let todayAttendance: any[] = [];
  let pendingLeaves = 0;
  let upcomingHolidays: any[] = [];
  let recentPolicies: any[] = [];
  let complianceIssues = 0;
  let myLeaveBalances: any[] = [];

  try {
    [
      totalEmployees,
      todayAttendance,
      pendingLeaves,
      upcomingHolidays,
      recentPolicies,
      complianceIssues,
      myLeaveBalances,
    ] = await Promise.all([
      orgId ? db.employee.count({ where: { organizationId: orgId, employmentStatus: "ACTIVE" } }) : 0,
      orgId
        ? db.attendanceRecord.findMany({
            where: { date: today, employee: { organizationId: orgId } },
          })
        : [],
      orgId
        ? db.leaveRequest.count({
            where: { status: "PENDING", employee: { organizationId: orgId } },
          })
        : 0,
      orgId
        ? db.holiday.findMany({
            where: { organizationId: orgId, date: { gte: today } },
            orderBy: { date: "asc" },
            take: 4,
          })
        : [],
      orgId
        ? db.hrPolicy.findMany({
            where: { organizationId: orgId },
            orderBy: { updatedAt: "desc" },
            take: 3,
          })
        : [],
      orgId
        ? db.complianceRecord.count({
            where: { organizationId: orgId, status: { in: ["OVERDUE", "PENDING"] } },
          })
        : 0,
      user?.employee
        ? db.leaveBalance.findMany({
            where: { employeeId: user.employee.id, year: today.getFullYear() },
            include: { leavePolicy: true },
          })
        : Promise.resolve([]),
    ]);
  } catch (err: any) {
    console.warn("[HR Module Page] Database query failed (cloud database paused):", err.message);
  }

  const presentCount = todayAttendance.filter((r) => r.status === "PRESENT").length;
  const onLeaveCount = todayAttendance.filter((r) => r.status === "ON_LEAVE").length;
  const notCheckedIn = Math.max(0, totalEmployees - todayAttendance.length);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Human Resources & People Operations"
        description="Unified enterprise workforce governance: workforce identity, shifts, attendance, automated leave policies, and statutory compliance."
        actions={
          <div className="flex gap-2">
            <Link href="/app/hr/leaves">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5 shadow-sm">
                <CalendarDays className="h-4 w-4" />
                Apply for Leave
              </Button>
            </Link>
            <Link href="/app/hr/attendance">
              <Button size="sm" variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-200 gap-1.5">
                <Clock className="h-4 w-4" />
                Attendance Hub
              </Button>
            </Link>
          </div>
        }
      />

      {/* HR Module Sub-Navigation */}
      <HrNav />

      {/* Top Level Operational KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Active Workforce"
          value={totalEmployees}
          icon={Users}
          subtitle="Verified Personnel"
        />
        <KPICard
          title="Today's Present"
          value={presentCount}
          icon={Clock}
          subtitle={`${onLeaveCount} on approved leave`}
          trend={{
            value: `${totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0}%`,
            positive: true,
          }}
        />
        <KPICard
          title="Pending Approvals"
          value={pendingLeaves}
          icon={CalendarDays}
          subtitle="Requires Manager Review"
        />
        <KPICard
          title="Compliance Health"
          value={complianceIssues === 0 ? "100%" : `${complianceIssues} Alert${complianceIssues > 1 ? "s" : ""}`}
          icon={ShieldCheck}
          subtitle="Audited Obligations"
          trend={{
            value: complianceIssues === 0 ? "Pass" : "Review",
            positive: complianceIssues === 0,
          }}
        />
      </div>

      {/* Main Grid: My Status + Attendance Distribution + Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Today's Workforce Overview & Quick Portals */}
        <div className="lg:col-span-2 space-y-6">
          {/* Real-time Workforce Attendance Breakdown */}
          <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Daily Attendance Snapshot</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time status for {today.toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <Link href="/app/hr/attendance" className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1">
                Open Daily Log <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-400">Present</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-200 mt-2">{presentCount}</div>
                <div className="text-[11px] text-emerald-400/80 mt-1 font-mono">
                  {totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0}% of workforce
                </div>
              </div>

              <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-amber-400">On Leave</span>
                  <CalendarDays className="h-4 w-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-200 mt-2">{onLeaveCount}</div>
                <div className="text-[11px] text-amber-400/80 mt-1 font-mono">Approved absence</div>
              </div>

              <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">Pending Punch</span>
                  <Clock4 className="h-4 w-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-slate-200 mt-2">{notCheckedIn}</div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">Awaiting check-in</div>
              </div>
            </div>
          </div>

          {/* Quick Sub-Module Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/app/hr/leaves"
              className="group rounded-xl border border-slate-800 bg-[#0d1424] p-4 hover:border-blue-500/40 transition-all shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <Badge variant={pendingLeaves > 0 ? "warning" : "default"}>
                  {pendingLeaves} Pending
                </Badge>
              </div>
              <h4 className="text-sm font-semibold text-white mt-3 group-hover:text-blue-400 transition-colors">
                Leave Management & Policy Engine
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                CL (max 2/mo), EL, ML, and LWP balance allocations, automated weekend/holiday exclusion, and supervisor approval flows.
              </p>
              <div className="flex items-center gap-1 text-xs text-blue-400 font-medium mt-3">
                Manage Leaves <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link
              href="/app/hr/work-days"
              className="group rounded-xl border border-slate-800 bg-[#0d1424] p-4 hover:border-indigo-500/40 transition-all shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
                  <CalendarOff className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="border-indigo-500/30 text-indigo-300">
                  {upcomingHolidays.length} Upcoming
                </Badge>
              </div>
              <h4 className="text-sm font-semibold text-white mt-3 group-hover:text-indigo-400 transition-colors">
                Work Days & Holiday Schedules
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Configure corporate working weekdays, half-days, national holidays, and regional observances.
              </p>
              <div className="flex items-center gap-1 text-xs text-indigo-400 font-medium mt-3">
                Configure Schedule <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link
              href="/app/hr/policies"
              className="group rounded-xl border border-slate-800 bg-[#0d1424] p-4 hover:border-purple-500/40 transition-all shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/10 text-purple-400 border border-purple-500/20">
                  <BookOpen className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="border-purple-500/30 text-purple-300">
                  {recentPolicies.length} Active
                </Badge>
              </div>
              <h4 className="text-sm font-semibold text-white mt-3 group-hover:text-purple-400 transition-colors">
                HR Governance & Policies
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Official corporate governance, Code of Conduct, remote work agreements, and leave guidelines.
              </p>
              <div className="flex items-center gap-1 text-xs text-purple-400 font-medium mt-3">
                Read Policies <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link
              href="/app/hr/compliance"
              className="group rounded-xl border border-slate-800 bg-[#0d1424] p-4 hover:border-emerald-500/40 transition-all shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <Badge variant={complianceIssues === 0 ? "success" : "warning"}>
                  {complianceIssues === 0 ? "Compliant" : `${complianceIssues} Attention`}
                </Badge>
              </div>
              <h4 className="text-sm font-semibold text-white mt-3 group-hover:text-emerald-400 transition-colors">
                Statutory & Legal Compliance
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Labor law filings, statutory provident funds, employee safety standards, and legal compliance register.
              </p>
              <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium mt-3">
                Audit Records <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>

        {/* Right Column: User Leave Balances & Upcoming Holidays */}
        <div className="space-y-6">
          {/* User's Leave Balances */}
          {user?.employee && (
            <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-blue-400" />
                  My 2026 Leave Balances
                </h3>
                <Link href="/app/hr/leaves" className="text-xs text-blue-400 hover:text-blue-300">
                  Details
                </Link>
              </div>

              <div className="space-y-2.5">
                {myLeaveBalances.map((bal) => (
                  <div
                    key={bal.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800/70 bg-slate-900/40 p-2.5"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-200">{bal.leavePolicy.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">({bal.leavePolicy.code})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Allocated: {bal.allocated}d • Used: {bal.used}d
                        {bal.pending > 0 && <span className="text-amber-400 font-medium"> • {bal.pending}d pending</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-blue-400">{bal.remaining}</span>
                      <span className="text-[10px] text-slate-400 ml-1">left</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Holidays */}
          <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <CalendarOff className="h-4 w-4 text-indigo-400" />
                Upcoming Holidays
              </h3>
              <Link href="/app/hr/work-days" className="text-xs text-indigo-400 hover:text-indigo-300">
                View All
              </Link>
            </div>

            {upcomingHolidays.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No upcoming holidays scheduled</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingHolidays.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-start justify-between rounded-lg border border-slate-800/70 bg-slate-900/40 p-2.5"
                  >
                    <div>
                      <div className="text-xs font-medium text-slate-200">{h.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {h.date.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                      {h.description || "Holiday"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
