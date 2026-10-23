"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  Calendar,
  AlertCircle,
  Clock,
  Landmark,
  Package,
  Receipt,
  FileText,
  CreditCard,
  Plus,
  Filter,
  Download,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Building,
  Users,
  CheckSquare,
  Sparkles,
  BookOpenCheck,
} from "lucide-react";
import { AccountsDashboardData } from "@/services/accounts.service";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { AttendanceWidget } from "@/components/dashboard/widgets/AttendanceWidget";
import { TaskSummaryWidget } from "@/components/dashboard/widgets/TaskSummaryWidget";
import { ProjectProgressWidget } from "@/components/dashboard/widgets/ProjectProgressWidget";
import { LeaveBalanceWidget } from "@/components/dashboard/widgets/LeaveBalanceWidget";
import { UpcomingMeetingsWidget } from "@/components/dashboard/widgets/UpcomingMeetingsWidget";
import { RecentNotificationsWidget } from "@/components/dashboard/widgets/RecentNotificationsWidget";
import { ExpenseWidget } from "@/components/dashboard/widgets/ExpenseWidget";
import { RequestWidget } from "@/components/dashboard/widgets/RequestWidget";
import { OnDutyWidget } from "@/components/dashboard/widgets/OnDutyWidget";
import { QuickActionsWidget } from "@/components/dashboard/widgets/QuickActionsWidget";
import { PageHeader } from "@/components/layout/page-header";

interface AccountsDashboardViewProps {
  data: AccountsDashboardData;
  onRefresh?: () => void;
  onOpenQuickCreate: (type?: string) => void;
}

export function AccountsDashboardView({
  data,
  onRefresh,
  onOpenQuickCreate,
}: AccountsDashboardViewProps) {
  const [activeDashboardTab, setActiveDashboardTab] = useState<"FINANCE" | "EMPLOYEE">("FINANCE");
  const [selectedAgingView, setSelectedAgingView] = useState<"RECEIVABLES" | "PAYABLES">("RECEIVABLES");
  const [transactionFilter, setTransactionFilter] = useState<string>("ALL");
  const [selectedChartRange, setSelectedChartRange] = useState<string>("6M");
  const { user } = useAuth();

  const formatCurrency = (val: number) => {
    return `₹${Math.round(val).toLocaleString("en-IN")}`;
  };

  const filteredTransactions = data.recentTransactions.filter((txn) => {
    if (transactionFilter === "ALL") return true;
    if (transactionFilter === "INFLOW") return txn.direction === "INFLOW";
    if (transactionFilter === "OUTFLOW") return txn.direction === "OUTFLOW";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Standard CRM Page Header */}
      <PageHeader
        title={`${data.company.name} Accounting Cockpit`}
        description="Real-time double-entry general ledger, GST compliance, cash flow, receivables, and payables control center."
        badge={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-blue-500/30 bg-blue-500/10 text-blue-400">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              {data.company.fiscalYear}
            </span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              ACCOUNTS & BOOKS
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shadow-xs"
              title="Refresh Financial Ledger"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Sync</span>
            </button>
            <Link href="/app/accounts/inventory/adjustments/new">
              <button className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition-colors">
                <Plus className="h-4 w-4" />
                <span>New Adjustment</span>
              </button>
            </Link>
            <button
              onClick={() => onOpenQuickCreate("INVOICE")}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Invoice</span>
            </button>
          </div>
        }
      />

      {/* ZOHO BOOKS INTEGRATED OPERATIONS BAR */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1220] p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              ZB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Zoho Books Operations Hub
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800">
                  Live Synced
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Direct access to Stock Adjustments (Quantity & Value), Manual Journals, Fixed Assets, and GST Filing
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/app/accounts/inventory/adjustments/new">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors">
                <Plus className="h-3.5 w-3.5" />
                <span>New Adjustment</span>
              </button>
            </Link>

            <Link href="/app/accounts/accounting/journals">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors">
                <BookOpenCheck className="h-3.5 w-3.5 text-blue-500" />
                <span>Manual Journal</span>
              </button>
            </Link>

            <Link href="/app/accounts/tax/gst-reports">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors">
                <Receipt className="h-3.5 w-3.5 text-amber-500" />
                <span>GST Filing</span>
              </button>
            </Link>

            <Link href="/app/accounts/banking/reconciliation">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors">
                <Landmark className="h-3.5 w-3.5 text-purple-500" />
                <span>Bank Reconciliation</span>
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* CONSOLIDATED MODE BANNER — shown when viewing All Companies */}
      {data.isConsolidated && data.companyBreakdown && data.companyBreakdown.length > 0 && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/20 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15 text-blue-500">
                <Building className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Consolidated Corporate View
                </h3>
                <p className="text-xs text-slate-400">
                  Aggregated across {data.companyBreakdown.length} entities — data is strictly isolated per company
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border border-blue-500/30 bg-blue-500/10 text-blue-400">
              <Sparkles className="h-3 w-3" />
              ALL ENTITIES
            </span>
          </div>

          {/* Per-Company Financial Summary Grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 uppercase text-[10px] font-semibold border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2 px-3">Company</th>
                  <th className="py-2 px-3 text-right">Revenue</th>
                  <th className="py-2 px-3 text-right">Expenses</th>
                  <th className="py-2 px-3 text-right">Receivables</th>
                  <th className="py-2 px-3 text-right">Payables</th>
                  <th className="py-2 px-3 text-right">Net Profit</th>
                  <th className="py-2 px-3 text-right">Cash & Bank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {data.companyBreakdown.map((co) => (
                  <tr key={co.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">{co.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{co.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right font-bold font-mono text-emerald-500">
                      {formatCurrency(co.revenue)}
                    </td>
                    <td className="py-2 px-3 text-right font-bold font-mono text-purple-500">
                      {formatCurrency(co.expenses)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-blue-400">
                      {formatCurrency(co.receivables)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-amber-400">
                      {formatCurrency(co.payables)}
                    </td>
                    <td className={cn("py-2 px-3 text-right font-bold font-mono", co.netProfit >= 0 ? "text-emerald-500" : "text-red-400")}>
                      {formatCurrency(co.netProfit)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-cyan-400">
                      {formatCurrency(co.cashAndBank)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-700">
                <tr>
                  <td className="py-2 px-3 text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                    TOTAL
                  </td>
                  <td className="py-2 px-3 text-right font-bold font-mono text-emerald-500 text-xs">
                    {formatCurrency(data.kpis.revenue.current)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold font-mono text-purple-500 text-xs">
                    {formatCurrency(data.kpis.expenses.current)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold font-mono text-blue-400 text-xs">
                    {formatCurrency(data.kpis.receivables.total)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold font-mono text-amber-400 text-xs">
                    {formatCurrency(data.kpis.payables.total)}
                  </td>
                  <td className={cn("py-2 px-3 text-right font-bold font-mono text-xs", data.kpis.netProfit.current >= 0 ? "text-emerald-500" : "text-red-400")}>
                    {formatCurrency(data.kpis.netProfit.current)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold font-mono text-cyan-400 text-xs">
                    {formatCurrency(data.kpis.cashAndBank.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Top Segment Switcher: Accounts & Finance Cockpit vs My Employee Workspace */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]/90 p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveDashboardTab("FINANCE")}
            className={cn(
              "flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors",
              activeDashboardTab === "FINANCE"
                ? "bg-blue-600 text-white shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
            )}
          >
            <Landmark className="h-3.5 w-3.5" />
            <span>Accounts & Finance Cockpit</span>
          </button>
          <button
            onClick={() => setActiveDashboardTab("EMPLOYEE")}
            className={cn(
              "flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors",
              activeDashboardTab === "EMPLOYEE"
                ? "bg-blue-600 text-white shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            <span>My Employee Workspace</span>
          </button>
        </div>

        {/* Quick Employee Info Shortcuts */}
        <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
          <Link
            href="/app/hr/attendance"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 hover:border-blue-500/40 hover:text-blue-500 transition-colors"
          >
            <Clock className="h-3.5 w-3.5 text-blue-500" />
            <span>Attendance Log</span>
          </Link>
          <Link
            href="/app/tasks"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 hover:border-blue-500/40 hover:text-blue-500 transition-colors"
          >
            <CheckSquare className="h-3.5 w-3.5 text-blue-500" />
            <span>My Tasks</span>
          </Link>
          <Link
            href="/app/payroll/my-payslips"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 hover:border-blue-500/40 hover:text-blue-500 transition-colors"
          >
            <IndianRupee className="h-3.5 w-3.5 text-amber-500" />
            <span>My Payslips</span>
          </Link>
        </div>
      </div>

      {activeDashboardTab === "EMPLOYEE" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Quick Action Bar */}
          <QuickActionsWidget permissions={user?.permissions || []} roleLevel={user?.roleLevel || 10} />

          {/* Core Employee Self-Service Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AttendanceWidget employeeId={user?.employee?.id} />
            <TaskSummaryWidget employeeId={user?.employee?.id} scope="SELF" />
            <ProjectProgressWidget />
            <LeaveBalanceWidget />
            <UpcomingMeetingsWidget />
            <RecentNotificationsWidget />
            <ExpenseWidget />
            <RequestWidget />
            <OnDutyWidget />
          </div>
        </div>
      )}

      {activeDashboardTab === "FINANCE" && (
        <>
          {/* SECTION 4: 8 FINANCIAL KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Revenue */}
        <Link
          href="/app/accounts/reports/sales"
          className="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]/90 p-4.5 shadow-xs hover:border-blue-500/50 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Revenue (Current Period)</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            {formatCurrency(data.kpis.revenue.current)}
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-slate-400">
              Prev: {formatCurrency(data.kpis.revenue.previous)}
            </span>
            <span
              className={cn(
                "flex items-center gap-0.5 font-semibold text-xs",
                data.kpis.revenue.changePercentage >= 0 ? "text-emerald-500" : "text-red-400"
              )}
            >
              {data.kpis.revenue.changePercentage >= 0 ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {data.kpis.revenue.changePercentage}%
            </span>
          </div>
        </Link>

        {/* KPI 2: Receivables (AR) */}
        <Link
          href="/app/accounts/reports/receivables"
          className="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]/90 p-4.5 shadow-xs hover:border-blue-500/50 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Total Receivables</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            {formatCurrency(data.kpis.receivables.total)}
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-amber-500 font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Overdue: {formatCurrency(data.kpis.receivables.overdue)}
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              Due Week: {formatCurrency(data.kpis.receivables.dueThisWeek)}
            </span>
          </div>
        </Link>

        {/* KPI 3: Payables (AP) */}
        <Link
          href="/app/accounts/reports/payables"
          className="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]/90 p-4.5 shadow-xs hover:border-blue-500/50 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Total Payables</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            {formatCurrency(data.kpis.payables.total)}
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-red-400 font-medium flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Overdue: {formatCurrency(data.kpis.payables.overdue)}
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              Due Week: {formatCurrency(data.kpis.payables.dueThisWeek)}
            </span>
          </div>
        </Link>

        {/* KPI 4: Expenses */}
        <Link
          href="/app/accounts/expenses"
          className="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]/90 p-4.5 shadow-xs hover:border-blue-500/50 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Operating Expenses</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            {formatCurrency(data.kpis.expenses.current)}
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-slate-400">
              Prev: {formatCurrency(data.kpis.expenses.previous)}
            </span>
            <span
              className={cn(
                "flex items-center gap-0.5 font-semibold text-xs",
                data.kpis.expenses.changePercentage <= 0 ? "text-emerald-500" : "text-amber-500"
              )}
            >
              {data.kpis.expenses.changePercentage}%
            </span>
          </div>
        </Link>

        {/* KPI 5: Net Profit */}
        <Link
          href="/app/accounts/reports/profit-loss"
          className="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]/90 p-4.5 shadow-xs hover:border-blue-500/50 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Net Profit (Rev - Exp)</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <div
            className={cn(
              "text-2xl font-bold tracking-tight mb-2",
              data.kpis.netProfit.current >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-red-500"
            )}
          >
            {formatCurrency(data.kpis.netProfit.current)}
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-slate-400">Margin: {data.kpis.netProfit.marginPercentage}%</span>
            <span className="text-emerald-400 font-semibold">{data.kpis.netProfit.changePercentage}% MoM</span>
          </div>
        </Link>

        {/* KPI 6: Cash & Bank Balance */}
        <Link
          href="/app/accounts/banking/accounts"
          className="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]/90 p-4.5 shadow-xs hover:border-blue-500/50 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Cash & Bank Liquidity</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
              <Landmark className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            {formatCurrency(data.kpis.cashAndBank.total)}
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-slate-400">{data.kpis.cashAndBank.accountsCount} Bank Accounts</span>
            <span className="text-cyan-400 font-medium">Reconciled</span>
          </div>
        </Link>

        {/* KPI 7: Inventory Value */}
        <Link
          href="/app/accounts/inventory/valuation"
          className="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]/90 p-4.5 shadow-xs hover:border-blue-500/50 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Inventory Valuation</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            {formatCurrency(data.kpis.inventoryValue.totalValue)}
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-slate-400">{data.kpis.inventoryValue.itemsCount} SKUs in Stock</span>
            {data.kpis.inventoryValue.lowStockCount > 0 ? (
              <span className="text-amber-500 font-semibold">{data.kpis.inventoryValue.lowStockCount} Low Stock</span>
            ) : (
              <span className="text-emerald-400 font-medium">Stock Healthy</span>
            )}
          </div>
        </Link>

        {/* KPI 8: Tax Liability */}
        <Link
          href="/app/accounts/tax/summary"
          className="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]/90 p-4.5 shadow-xs hover:border-blue-500/50 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[11px]">GST / Tax Liability</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            {formatCurrency(data.kpis.taxLiability.netTaxPayable)}
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-slate-400">
              Out: {formatCurrency(data.kpis.taxLiability.outputTax)}
            </span>
            <span className="text-emerald-400 font-medium">
              ITC: {formatCurrency(data.kpis.taxLiability.inputTax)}
            </span>
          </div>
        </Link>
      </div>

      {/* SECTION 5: FINANCIAL CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Revenue vs Expenses Trend */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]/90 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Revenue vs Operating Expenses</h3>
              <p className="text-xs text-slate-400">Monthly billing vs disbursement trends</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                <span>Revenue</span>
                <span className="h-2.5 w-2.5 rounded-full bg-purple-500 ml-2" />
                <span>Expenses</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Representation */}
          <div className="h-64 flex items-end justify-between gap-3 pt-6 pb-2 border-b border-slate-200 dark:border-slate-800">
            {data.charts.revenueVsExpenses.map((m, idx) => {
              const maxVal = Math.max(
                ...data.charts.revenueVsExpenses.map((x) => Math.max(x.revenue, x.expenses, 100000))
              );
              const revHeight = Math.max(8, (m.revenue / maxVal) * 180);
              const expHeight = Math.max(8, (m.expenses / maxVal) * 180);

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <div className="flex items-end gap-1.5 h-48 w-full justify-center">
                    {/* Revenue Bar */}
                    <div
                      style={{ height: `${revHeight}px` }}
                      className="w-4 sm:w-6 bg-blue-600/90 hover:bg-blue-500 rounded-t transition-all relative group/bar"
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover/bar:block bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded shadow z-10 whitespace-nowrap">
                        {formatCurrency(m.revenue)}
                      </div>
                    </div>
                    {/* Expenses Bar */}
                    <div
                      style={{ height: `${expHeight}px` }}
                      className="w-4 sm:w-6 bg-purple-500/80 hover:bg-purple-400 rounded-t transition-all relative group/bar"
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover/bar:block bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded shadow z-10 whitespace-nowrap">
                        {formatCurrency(m.expenses)}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400 group-hover:text-slate-200">
                    {m.month}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 pt-3">
            <span>6-Month Net Result:</span>
            <span className="font-bold text-blue-400">
              {formatCurrency(data.charts.revenueVsExpenses.reduce((s, x) => s + x.netProfit, 0))}
            </span>
          </div>
        </div>

        {/* Chart 2: Aging Buckets (Receivables / Payables Toggle) */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Aging Analysis</h3>
                <p className="text-xs text-slate-400">Liquidity timeline breakdown</p>
              </div>
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-900 text-xs">
                <button
                  onClick={() => setSelectedAgingView("RECEIVABLES")}
                  className={cn(
                    "px-2.5 py-1 rounded font-medium transition-colors",
                    selectedAgingView === "RECEIVABLES" ? "bg-blue-600 text-white shadow-xs font-semibold" : "text-slate-400 hover:text-white"
                  )}
                >
                  AR
                </button>
                <button
                  onClick={() => setSelectedAgingView("PAYABLES")}
                  className={cn(
                    "px-2.5 py-1 rounded font-medium transition-colors",
                    selectedAgingView === "PAYABLES" ? "bg-blue-600 text-white shadow-xs font-semibold" : "text-slate-400 hover:text-white"
                  )}
                >
                  AP
                </button>
              </div>
            </div>

            {/* Aging Buckets List */}
            {(() => {
              const aging = selectedAgingView === "RECEIVABLES" ? data.charts.receivablesAging : data.charts.payablesAging;
              const total = Math.max(1, aging.total);

              const buckets = [
                { label: "Current (Not Due)", amount: aging.current, color: "bg-blue-500" },
                { label: "1 - 30 Days Overdue", amount: aging.days1_30, color: "bg-cyan-500" },
                { label: "31 - 60 Days Overdue", amount: aging.days31_60, color: "bg-amber-500" },
                { label: "61 - 90 Days Overdue", amount: aging.days61_90, color: "bg-orange-500" },
                { label: "90+ Days Overdue", amount: aging.days90Plus, color: "bg-red-500" },
              ];

              return (
                <div className="space-y-3.5">
                  {buckets.map((b, i) => {
                    const pct = Math.round((b.amount / total) * 100);
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium">{b.label}</span>
                          <span className="font-mono font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(b.amount)} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div style={{ width: `${pct}%` }} className={cn("h-full rounded-full", b.color)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
            <Link
              href={selectedAgingView === "RECEIVABLES" ? "/app/accounts/reports/receivables" : "/app/accounts/reports/payables"}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-500 hover:text-blue-400 py-1"
            >
              <span>View Detailed {selectedAgingView === "RECEIVABLES" ? "AR" : "AP"} Schedule</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* SECTION 6 & 7: RECEIVABLES & PAYABLES OPERATIONAL TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receivables Table */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]/90 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Outstanding Receivables</h3>
                <p className="text-xs text-slate-400">Customer invoices requiring collection</p>
              </div>
            </div>
            <Link
              href="/app/accounts/sales/invoices"
              className="text-xs font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1"
            >
              <span>All Invoices</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 uppercase text-[10px] font-semibold border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-2">Invoice #</th>
                  <th className="py-2.5 px-2 text-right">Balance</th>
                  <th className="py-2.5 px-2 text-center">Status</th>
                  <th className="py-2.5 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {data.receivables.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No outstanding receivables. All invoices settled!
                    </td>
                  </tr>
                ) : (
                  data.receivables.slice(0, 6).map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white truncate max-w-[140px]">
                        {inv.customerName}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-400">{inv.invoiceNumber}</td>
                      <td className="py-2.5 px-2 text-right font-bold text-slate-900 dark:text-white font-mono">
                        {formatCurrency(inv.balance)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={cn(
                            "inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase",
                            inv.status === "OVERDUE"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          )}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <button
                          onClick={() => onOpenQuickCreate("PAYMENT")}
                          className="px-2.5 py-1 rounded bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 text-[11px] font-semibold transition-colors"
                        >
                          Receive
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payables Table */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]/90 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <Receipt className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Upcoming Payables</h3>
                <p className="text-xs text-slate-400">Vendor bills & verified reimbursements</p>
              </div>
            </div>
            <Link
              href="/app/accounts/purchases/bills"
              className="text-xs font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1"
            >
              <span>All Bills</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 uppercase text-[10px] font-semibold border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Vendor</th>
                  <th className="py-2.5 px-2">Bill #</th>
                  <th className="py-2.5 px-2 text-right">Balance</th>
                  <th className="py-2.5 px-2 text-center">Status</th>
                  <th className="py-2.5 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {data.payables.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No pending vendor payables.
                    </td>
                  </tr>
                ) : (
                  data.payables.slice(0, 6).map((bill) => (
                    <tr key={bill.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white truncate max-w-[140px]">
                        {bill.vendorName}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-400">{bill.billNumber}</td>
                      <td className="py-2.5 px-2 text-right font-bold text-slate-900 dark:text-white font-mono">
                        {formatCurrency(bill.balance)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={cn(
                            "inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase",
                            bill.status === "OVERDUE"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          )}
                        >
                          {bill.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <button
                          onClick={() => onOpenQuickCreate("PAYMENT")}
                          className="px-2.5 py-1 rounded bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 text-[11px] font-semibold transition-colors"
                        >
                          Disburse
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 8 & 9: BANKING WIDGET & RECENT TRANSACTIONS FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Banking Overview Widget */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]/90 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <Landmark className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Bank & Cash Accounts</h3>
            </div>
            <button
              onClick={() => onOpenQuickCreate("TRANSFER")}
              className="text-xs font-semibold text-blue-500 hover:text-blue-400"
            >
              + Transfer
            </button>
          </div>

          <div className="space-y-3">
            {data.banking.map((b) => (
              <div
                key={b.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{b.accountName}</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {b.bankName} • {b.accountNumber}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                    {formatCurrency(b.currentBalance)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {b.unreconciledCount > 0 ? (
                      <span className="text-amber-400 font-semibold">{b.unreconciledCount} unreconciled</span>
                    ) : (
                      <span className="text-emerald-400">Reconciled</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Link
              href="/app/accounts/banking/reconciliation"
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-500 hover:text-blue-400 py-1"
            >
              <span>Launch Bank Reconciliation</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Recent Transactions Feed */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]/90 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Double-Entry Transaction Stream</h3>
              <p className="text-xs text-slate-400">Unified inflows, disbursements, and ledger postings</p>
            </div>
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-900 text-xs">
              {["ALL", "INFLOW", "OUTFLOW"].map((f) => (
                <button
                  key={f}
                  onClick={() => setTransactionFilter(f)}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-semibold transition-colors",
                    transactionFilter === f
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 uppercase text-[10px] font-semibold border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-2">Type</th>
                  <th className="py-2 px-3">Party / Reference</th>
                  <th className="py-2 px-2">Method</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredTransactions.slice(0, 8).map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{txn.date}</td>
                    <td className="py-2 px-2 font-medium text-slate-800 dark:text-slate-200">{txn.type}</td>
                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">
                        {txn.partyName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{txn.reference}</div>
                    </td>
                    <td className="py-2 px-2 text-slate-400 text-[11px]">{txn.paymentMethod}</td>
                    <td
                      className={cn(
                        "py-2 px-3 text-right font-bold font-mono",
                        txn.direction === "INFLOW"
                          ? "text-emerald-500"
                          : txn.direction === "OUTFLOW"
                          ? "text-red-400"
                          : "text-cyan-400"
                      )}
                    >
                      {txn.direction === "INFLOW" ? "+" : txn.direction === "OUTFLOW" ? "-" : ""}
                      {formatCurrency(txn.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
