"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { HrNav } from "@/modules/hr/components/hr-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  KeyRound,
  Mail,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Send,
  X,
  UserCheck,
  Building,
  ShieldAlert,
  Sparkles,
  Dice5,
  Filter,
} from "lucide-react";

interface PasswordResetRequest {
  id: string;
  requestNumber: string;
  category: string;
  title: string;
  description: string;
  status: string;
  organizationId?: string;
  companyCode?: string;
  companyName?: string;
  hrEmail?: string;
  metadata?: string | null;
  createdAt: string;
  approvedAt?: string | null;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    email: string;
    designation: string;
    department?: { id: string; name: string } | null;
    user?: { id: string; email: string; isActive: boolean; lastLoginAt: string | null } | null;
  } | null;
  approver?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export default function HrPasswordResetsPage() {
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED">("ALL");
  const [companyScope, setCompanyScope] = useState<"ACTIVE" | "NFVS" | "NAREE" | "ALL">("ACTIVE");
  const [activeCompanyInfo, setActiveCompanyInfo] = useState<{ id?: string; code?: string; name?: string } | null>(null);

  // Modal State
  const [selectedRequest, setSelectedRequest] = useState<PasswordResetRequest | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchRequests = async (scope = companyScope) => {
    try {
      setLoading(true);
      let url = "/api/hr/password-resets";
      if (scope === "NFVS") url += "?company=NFVS";
      else if (scope === "NAREE") url += "?company=NAREE";
      else if (scope === "ALL") url += "?company=ALL";

      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setRequests(json.data.requests || []);
        if (json.data.activeCompany) {
          setActiveCompanyInfo(json.data.activeCompany);
        }
      }
    } catch (err) {
      console.error("Failed to fetch password reset requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(companyScope);
  }, [companyScope]);

  // Helper to generate secure random password
  const generateRandomPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let pwd = "Nfvs@";
    for (let i = 0; i < 4; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pwd += "!" + Math.floor(10 + Math.random() * 90);
    return pwd;
  };

  const handleOpenResetModal = (req: PasswordResetRequest) => {
    setSelectedRequest(req);
    setNewPassword(generateRandomPassword());
    setShowPassword(false);
    setActionSuccess(null);
    setActionError(null);
  };

  const handleFulfillReset = async () => {
    if (!selectedRequest?.employee?.id) {
      setActionError("Missing employee identification.");
      return;
    }
    if (!newPassword || newPassword.trim().length < 6) {
      setActionError("Password must be at least 6 characters long.");
      return;
    }

    try {
      setSubmitting(true);
      setActionError(null);
      setActionSuccess(null);

      const res = await fetch("/api/hr/password-resets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          employeeId: selectedRequest.employee.id,
          customPassword: newPassword.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update password");
      }

      setActionSuccess(
        `Password updated and credentials dispatched to ${selectedRequest.employee.email}!`
      );

      // Refresh list
      fetchRequests();

      setTimeout(() => {
        setSelectedRequest(null);
        setActionSuccess(null);
      }, 2500);
    } catch (err: any) {
      setActionError(err.message || "Failed to fulfill reset request.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const empName = `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`.toLowerCase();
      const empNum = (r.employee?.employeeNumber || "").toLowerCase();
      const empEmail = (r.employee?.email || "").toLowerCase();
      const reqNum = (r.requestNumber || "").toLowerCase();
      const compName = (r.companyName || "").toLowerCase();

      const matchesSearch =
        !q ||
        empName.includes(q) ||
        empNum.includes(q) ||
        empEmail.includes(q) ||
        reqNum.includes(q) ||
        compName.includes(q);

      const matchesStatus =
        statusFilter === "ALL" || r.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [requests, searchQuery, statusFilter]);

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Password Reset Requests"
        description="Verify workforce identities, assign new credentials, and automatically dispatch access instructions to registered corporate emails."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchRequests()}
              disabled={loading}
              className="border-slate-700 bg-slate-900/50 text-slate-200 hover:bg-slate-800 gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        }
      />

      <HrNav />

      {/* Company Isolation Context Banner */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-indigo-950/40 p-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Building className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white flex items-center gap-2">
              <span>HR Operations Console:</span>
              <span className="text-blue-400 font-bold">
                {activeCompanyInfo?.name || "Naree Foundation Venture Studio (NFVS)"}
              </span>
              <span className="rounded bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-[10px] font-mono text-blue-300">
                {activeCompanyInfo?.code || "NFVS-STUDIO"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Multi-Company Routing: Password resets from Company A employees route to Company A HR (hr@nfvs.in); Company B employees route to Company B HR (hr@naree.internal).
            </p>
          </div>
        </div>

        {/* Company Quick Scope Switcher */}
        <div className="flex items-center gap-1.5 self-end md:self-auto shrink-0 bg-[#070b16] border border-slate-800 rounded-lg p-1">
          <span className="text-[10px] text-slate-400 px-2 font-medium flex items-center gap-1">
            <Filter className="h-3 w-3" />
            <span>Scope:</span>
          </span>
          <button
            onClick={() => setCompanyScope("ACTIVE")}
            className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
              companyScope === "ACTIVE"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            My Company
          </button>
          <button
            onClick={() => setCompanyScope("NFVS")}
            className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
              companyScope === "NFVS"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Company A (NFVS)
          </button>
          <button
            onClick={() => setCompanyScope("NAREE")}
            className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
              companyScope === "NAREE"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Company B (NAREE)
          </button>
          <button
            onClick={() => setCompanyScope("ALL")}
            className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
              companyScope === "ALL"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All Orgs
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
              Pending HR Action
            </div>
            <div className="text-2xl font-bold text-white mt-1">{pendingCount}</div>
            <div className="text-[11px] text-amber-200/70 mt-0.5">Employees waiting for new credentials</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              Fulfilled Resets
            </div>
            <div className="text-2xl font-bold text-white mt-1">{approvedCount}</div>
            <div className="text-[11px] text-emerald-200/70 mt-0.5">Credentials dispatched via email</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
              Total Inbound Requests
            </div>
            <div className="text-2xl font-bold text-white mt-1">{requests.length}</div>
            <div className="text-[11px] text-blue-200/70 mt-0.5">Logged via CRM login recovery</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
            <KeyRound className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0c1322] p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by employee name, employee ID (NFVS-..., NF-...), or email..."
            className="w-full rounded-lg border border-slate-800 bg-[#070b16] pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === "ALL"
                ? "bg-blue-600 text-white"
                : "bg-slate-800/60 text-slate-400 hover:text-white"
            }`}
          >
            All ({requests.length})
          </button>
          <button
            onClick={() => setStatusFilter("PENDING")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === "PENDING"
                ? "bg-amber-600 text-white"
                : "bg-slate-800/60 text-slate-400 hover:text-white"
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter("APPROVED")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === "APPROVED"
                ? "bg-emerald-600 text-white"
                : "bg-slate-800/60 text-slate-400 hover:text-white"
            }`}
          >
            Fulfilled ({approvedCount})
          </button>
        </div>
      </div>

      {/* Table / List View */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0c1322] shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-2">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
            <p className="text-xs">Loading password recovery requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <KeyRound className="h-8 w-8 mx-auto text-slate-600" />
            <p className="text-sm font-medium text-slate-300">No password recovery requests found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? "No requests match your search criteria."
                : "When employees submit a request on the sign-in page, it will be automatically routed and displayed here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-[#070b16]/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Employee Details</th>
                  <th className="px-4 py-3">Designated Company</th>
                  <th className="px-4 py-3">Employee ID</th>
                  <th className="px-4 py-3">Department &amp; Designation</th>
                  <th className="px-4 py-3">Submitted At</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredRequests.map((r) => {
                  let empName = r.employee
                    ? `${r.employee.firstName || ""} ${r.employee.lastName || ""}`.trim()
                    : "";
                  if (!empName || empName.includes("@")) {
                    const match = r.title?.match(/Password Reset Request - ([^(]+)/);
                    if (match && match[1]) {
                      empName = match[1].trim();
                    } else {
                      empName = r.employee?.email?.split("@")[0].replace(/[0-9_.-]+/g, " ") || "Workforce Personnel";
                    }
                  }
                  const empNum = r.employee?.employeeNumber || "N/A";
                  const empEmail = r.employee?.email || "No email";
                  const isPending = r.status === "PENDING";
                  const isCompanyB =
                    r.companyCode === "NAREE" ||
                    r.organizationId === "org_naree_foundation" ||
                    empNum.startsWith("NF-") ||
                    empNum.startsWith("NAREE");

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* Employee Info */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-bold uppercase shadow-inner ${
                            isCompanyB
                              ? "bg-gradient-to-br from-emerald-600/30 to-teal-600/30 border-emerald-500/20 text-emerald-300"
                              : "bg-gradient-to-br from-blue-600/30 to-indigo-600/30 border-blue-500/20 text-blue-300"
                          }`}>
                            {empName.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-2">
                              <span>{empName}</span>
                              <span className="text-[10px] font-mono text-slate-400">
                                ({r.requestNumber})
                              </span>
                            </div>
                            <div className="text-[11px] text-blue-400 flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3" />
                              <span>{empEmail}</span>
                            </div>
                            {r.description && (
                              <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 italic">
                                {r.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Company Badge */}
                      <td className="px-4 py-3.5">
                        {isCompanyB ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            <span>Company B (NAREE)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[11px] font-medium text-blue-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                            <span>Company A (NFVS)</span>
                          </span>
                        )}
                      </td>

                      {/* Employee Number */}
                      <td className="px-4 py-3.5 font-mono">
                        <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200">
                          {empNum}
                        </span>
                      </td>

                      {/* Department & Designation */}
                      <td className="px-4 py-3.5">
                        <div className="text-slate-200 font-medium">
                          {r.employee?.designation || "Employee"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {r.employee?.department?.name || "General"}
                        </div>
                      </td>

                      {/* Requested At */}
                      <td className="px-4 py-3.5 text-slate-400 text-[11px]">
                        <div>{new Date(r.createdAt).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span>Action Pending</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Fulfilled</span>
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleOpenResetModal(r)}
                          className={
                            isPending
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs gap-1.5 shadow-md shadow-blue-900/30"
                              : "border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs gap-1.5"
                          }
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          <span>{isPending ? "Reset & Email Password" : "Resend Password"}</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* HR RESET & DISPATCH CREDENTIALS MODAL                     */}
      {/* ========================================================= */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0c1322] p-6 shadow-2xl space-y-4 text-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-blue-400">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Reset Password &amp; Email Credentials</h3>
                  <p className="text-[11px] text-slate-400">Ref: {selectedRequest.requestNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Employee Information Card */}
            <div className="rounded-xl border border-slate-800/80 bg-[#070b16] p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Employee Name:</span>
                <span className="font-semibold text-white">
                  {(() => {
                    const rawName = `${selectedRequest.employee?.firstName || ""} ${selectedRequest.employee?.lastName || ""}`.trim();
                    if (rawName && !rawName.includes("@")) return rawName;
                    const match = selectedRequest.title?.match(/Password Reset Request - ([^(]+)/);
                    if (match && match[1]) return match[1].trim();
                    return selectedRequest.employee?.email?.split("@")[0].replace(/[0-9_.-]+/g, " ") || "Workforce Personnel";
                  })()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Designated Company:</span>
                <span className="font-semibold text-emerald-300">
                  {selectedRequest.companyName || "Naree Foundation & NFVS"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Employee ID:</span>
                <span className="font-mono text-blue-400 font-medium">
                  {selectedRequest.employee?.employeeNumber || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Registered Email:</span>
                <span className="text-slate-200 font-medium">{selectedRequest.employee?.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Designation / Role:</span>
                <span className="text-slate-300">
                  {selectedRequest.employee?.designation} ({selectedRequest.employee?.department?.name || "General"})
                </span>
              </div>
            </div>

            {/* Password Input & Generator */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200">
                  Assign New Password
                </label>
                <button
                  type="button"
                  onClick={() => setNewPassword(generateRandomPassword())}
                  className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Dice5 className="h-3 w-3" />
                  <span>Generate Strong Password</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter temporary password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 pl-3.5 pr-10 py-2.5 text-xs text-white placeholder:text-slate-500 font-mono focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                When you click Confirm, the employee&apos;s system password will be updated and an official notification email will be dispatched to <strong>{selectedRequest.employee?.email}</strong> with their new password and CRM login link.
              </p>
            </div>

            {/* Status alerts */}
            {actionError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {actionSuccess && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRequest(null)}
                disabled={submitting}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleFulfillReset}
                disabled={submitting}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs px-4 gap-2 shadow-lg shadow-blue-600/30"
              >
                {submitting ? (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Dispatching Email...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Save Password &amp; Email Employee</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
