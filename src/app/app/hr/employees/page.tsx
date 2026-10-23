"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Search } from "@/components/ui/search";
import { Pagination } from "@/components/ui/pagination";
import { Drawer } from "@/components/ui/drawer";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Dialog } from "@/components/ui/dialog";
import {
  Users,
  UserPlus,
  Network,
  Filter,
  Building,
  Briefcase,
  ExternalLink,
  Lock,
  Crown,
  CheckCircle2,
  Landmark,
  Trash2,
  Mail,
  Share2,
  Copy,
  Check,
  Send,
  Inbox,
  ShieldCheck,
  Sparkles,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { HrNav } from "@/modules/hr/components/hr-nav";

// Roles classified as Leadership/Executive
const LEADERSHIP_ROLE_CODES = new Set([
  "SUPER_ADMIN", "ADMIN", "CHAIRPERSON", "CEO", "COO", "CFO", "CTO", "CMO", "HR",
]);

const LEADERSHIP_ROLE_COLORS: Record<string, string> = {
  CEO: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  COO: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  CFO: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CTO: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  CMO: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  HR: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  CHAIRPERSON: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  ADMIN: "bg-slate-500/10 text-slate-300 border-slate-500/20",
  SUPER_ADMIN: "bg-red-500/10 text-red-400 border-red-500/20",
};

const DESIGNATION_OPTIONS = [
  { label: "Select Designation...", value: "" },
  { label: "Accountant (Finance & Accounts)", value: "Accountant" },
  { label: "Senior Accountant", value: "Senior Accountant" },
  { label: "Accounts Executive", value: "Accounts Executive" },
  { label: "Finance Manager", value: "Finance Manager" },
  { label: "Financial Analyst", value: "Financial Analyst" },
  { label: "Chief Financial Officer (CFO)", value: "Chief Financial Officer (CFO)" },
  { label: "Software Engineer", value: "Software Engineer" },
  { label: "Senior Software Engineer", value: "Senior Software Engineer" },
  { label: "Lead Architect / Tech Lead", value: "Lead Architect" },
  { label: "Chief Technology Officer (CTO)", value: "Chief Technology Officer (CTO)" },
  { label: "Product Manager", value: "Product Manager" },
  { label: "HR Specialist / Executive", value: "HR Specialist" },
  { label: "HR Manager", value: "HR Manager" },
  { label: "Chief Human Resources Officer (CHRO)", value: "Chief Human Resources Officer (CHRO)" },
  { label: "Operations Specialist", value: "Operations Specialist" },
  { label: "Operations Manager", value: "Operations Manager" },
  { label: "Chief Operating Officer (COO)", value: "Chief Operating Officer (COO)" },
  { label: "Marketing Specialist", value: "Marketing Specialist" },
  { label: "Sales Executive", value: "Sales Executive" },
  { label: "Chief Marketing Officer (CMO)", value: "Chief Marketing Officer (CMO)" },
  { label: "Chief Executive Officer (CEO)", value: "Chief Executive Officer (CEO)" },
  { label: "Other / Custom Designation...", value: "CUSTOM" },
];

function getRoleColor(code: string) {
  return LEADERSHIP_ROLE_COLORS[code] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20";
}

interface EmployeeItem {
  id: string;
  organizationId?: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  designation: string;
  employmentType: string;
  employmentStatus: string;
  workMode: string;
  location: string;
  hireDate: string;
  department?: { id: string; name: string; code: string } | null;
  manager?: { id: string; firstName: string; lastName: string; designation: string } | null;
  user?: { id: string; role: { code: string; name: string } } | null;
  organization?: { id: string; name: string; code: string } | null;
  onboardingStatus?: string;
  profileCompletion?: number;
}

import { useAuth } from "@/components/providers/auth-provider";

export default function EmployeeDirectoryPage() {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user: currentUser } = useAuth();

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // New Employee Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCustomDesignation, setIsCustomDesignation] = useState(false);

  // Delete Employee state
  const [deleteTarget, setDeleteTarget] = useState<EmployeeItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const userRoleCode = (currentUser?.roleCode || "").toUpperCase();
  const userRoleLevel = currentUser?.roleLevel ?? 10;
  const isSuperAdmin = userRoleCode === "SUPER_ADMIN";
  const isExecutive = LEADERSHIP_ROLE_CODES.has(userRoleCode) || userRoleLevel >= 40;

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      setDeleteError(null);
      const res = await fetch(`/api/employees/${deleteTarget.id}`, {
        method: "DELETE",
        headers: currentUser?.activeCompany?.id ? { "x-company-id": currentUser.activeCompany.id } : {},
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to delete employee");
      }
      setDeleteTarget(null);
      fetchEmployees();
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete employee");
    } finally {
      setDeleteLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    aadhaarNumber: "",
    hireDate: new Date().toISOString().split("T")[0],
    designation: "",
    departmentId: "",
    managerId: "",
    employmentType: "FULL_TIME",
    workMode: "ON_SITE",
    location: "Headquarters (Mumbai)",
    emergencyContact: "",
    createSystemAccount: true,
    loginPassword: "",
    roleCode: "EMPLOYEE",
    immediateActive: false,
  });

  // Pre-onboarding Candidate Submissions state
  const [activeTab, setActiveTab] = useState<"directory" | "submissions">("directory");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);

  // Candidate Link Share Modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    try {
      setSubmissionsLoading(true);
      const companyParam = currentUser?.activeCompany?.id
        ? `?organizationId=${currentUser.activeCompany.id}`
        : "";
      const res = await fetch(`/api/hr/pre-onboarding${companyParam}`, {
        headers: currentUser?.activeCompany?.id
          ? { "x-company-id": currentUser.activeCompany.id }
          : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSubmissions(json.data);
        }
      }
    } catch (err) {
      console.error("Failed to load pre-onboarding submissions:", err);
    } finally {
      setSubmissionsLoading(false);
    }
  }, [currentUser?.activeCompany?.id]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleOnboardSubmission = (sub: any) => {
    setSelectedSubmission(sub);
    setFormData({
      firstName: sub.firstName || "",
      lastName: sub.lastName || "",
      email: sub.email || "",
      phone: sub.phone || "",
      dateOfBirth: sub.dateOfBirth ? new Date(sub.dateOfBirth).toISOString().split("T")[0] : "",
      aadhaarNumber: sub.aadhaarNumber || "",
      hireDate: new Date().toISOString().split("T")[0],
      designation: "",
      departmentId: "",
      managerId: "",
      employmentType: "FULL_TIME",
      workMode: "ON_SITE",
      location: sub.currentAddress || sub.city || "Headquarters (Mumbai)",
      emergencyContact: sub.emergencyContactName
        ? `${sub.emergencyContactName}${sub.emergencyContactPhone ? ` (${sub.emergencyContactPhone})` : ""}`
        : "",
      createSystemAccount: true,
      loginPassword: "",
      roleCode: "EMPLOYEE",
      immediateActive: false,
    });
    setIsDrawerOpen(true);
  };

  const handleDismissSubmission = async (subId: string) => {
    if (!confirm("Are you sure you want to dismiss this candidate submission?")) return;
    try {
      await fetch(`/api/hr/pre-onboarding/${subId}`, {
        method: "DELETE",
      });
      fetchSubmissions();
    } catch (err) {
      console.error("Failed to dismiss submission:", err);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviteLoading(true);
    setInviteSuccess(null);
    setInviteError(null);

    try {
      const activeCode = (currentUser?.activeCompany?.code || "").toUpperCase() === "NAREE" ? "NF" : "NFVS";
      const formUrl = `${(process.env.NEXT_PUBLIC_APP_URL || "https://nfventurestudio.netlify.app").replace(/\/+$/, "")}/onboard?org=${activeCode}`;
      const res = await fetch("/api/hr/pre-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateEmail: inviteEmail,
          candidateName: inviteName,
          companyName: currentUser?.activeCompany?.name,
          formUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to send email invite");
      }
      setInviteSuccess(`Pre-onboarding form link successfully forwarded to ${inviteEmail}`);
      setInviteEmail("");
      setInviteName("");
    } catch (err: any) {
      setInviteError(err.message || "Failed to send invite");
    } finally {
      setInviteLoading(false);
    }
  };

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: "1",
        limit: "500", // Load all employees for company so client splits leadership & staff
        search,
        departmentId: selectedDept,
        status: selectedStatus,
      });

      if (currentUser?.activeCompany?.id) {
        params.set("organizationId", currentUser.activeCompany.id);
      }

      const res = await fetch(`/api/employees?${params.toString()}`, {
        headers: currentUser?.activeCompany?.id
          ? { "x-company-id": currentUser.activeCompany.id }
          : {},
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load directory");
      }

      setEmployees(json.data || []);
      setTotalPages(json.meta?.totalPages || 1);
      setTotalRecords(json.meta?.totalCount || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load directory");
    } finally {
      setLoading(false);
    }
  }, [search, selectedDept, selectedStatus, currentUser?.activeCompany?.id]);

  // Isolate strictly by active company
  const currentOrgId = currentUser?.activeCompany?.id;
  const activeOrgCode = (currentUser?.activeCompany?.code || "").toUpperCase();
  const activeOrgName = (currentUser?.activeCompany?.name || "").toLowerCase();
  const isNareeCompany =
    currentOrgId === "org_naree_foundation" ||
    activeOrgCode === "NAREE" ||
    (activeOrgName.includes("foundation") && !activeOrgName.includes("venture"));

  const scopedEmployees = employees.filter((e) => {
    if (!currentOrgId && !activeOrgCode) return true;
    const empOrg = (e.organizationId || "").toLowerCase();
    const empNum = (e.employeeNumber || "").toUpperCase();
    if (isNareeCompany) {
      return (
        empOrg === "org_naree_foundation" ||
        empOrg === "naree" ||
        empNum.startsWith("NF-")
      );
    }
    // NFVS Studio / Corporate
    return (
      empOrg === "org_nfvs_studio" ||
      empOrg === "nfvs-studio" ||
      empOrg === "org_nfvs_corp" ||
      empNum.startsWith("NFVS-") ||
      (!empOrg.includes("naree") && !empNum.startsWith("NF-"))
    );
  });

  // Split into leadership and staff
  const leadershipList = scopedEmployees.filter(
    (e) => LEADERSHIP_ROLE_CODES.has(e.user?.role?.code || "")
  );
  const staffList = scopedEmployees.filter(
    (e) => !LEADERSHIP_ROLE_CODES.has(e.user?.role?.code || "")
  );
  const staffTotalPages = Math.max(1, Math.ceil(staffList.length / 10));
  const safePage = Math.min(Math.max(1, page), staffTotalPages);
  const displayedStaff = staffList.slice((safePage - 1) * 10, safePage * 10);

  // Real-time structured Employee ID calculation:
  // [COMPANY]-[JOINING_YEAR]-[BIRTH_DAY]-[AADHAAR_LAST_4]
  const isVentureStudioPreview =
    activeOrgCode === "NFVS" ||
    activeOrgName.includes("venture studio") ||
    activeOrgName.includes("studio");
  const companyPrefixPreview = isVentureStudioPreview ? "NFVS" : "NF";

  const joiningYearPreview = formData.hireDate
    ? new Date(formData.hireDate).getFullYear() || new Date().getFullYear()
    : new Date().getFullYear();

  let birthDayPreview = "DD";
  if (formData.dateOfBirth) {
    const m =
      formData.dateOfBirth.match(/^\d{4}-\d{2}-(\d{1,2})/) ||
      formData.dateOfBirth.match(/^(\d{1,2})[-\/]/);
    if (m) {
      birthDayPreview = m[1];
    } else {
      const d = new Date(formData.dateOfBirth);
      if (!isNaN(d.getTime())) {
        birthDayPreview = String(d.getDate()).padStart(2, "0");
      }
    }
  }

  let aadhaarLast4Preview = "XXXX";
  if (formData.aadhaarNumber) {
    const digits = formData.aadhaarNumber.replace(/\D/g, "");
    if (digits.length >= 4) {
      aadhaarLast4Preview = digits.slice(-4);
    } else if (digits.length > 0) {
      aadhaarLast4Preview = digits.padStart(4, "0");
    }
  }

  const generatedIdPreview = `${companyPrefixPreview}-${joiningYearPreview}-${birthDayPreview}-${aadhaarLast4Preview}`;

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Load department options scoped strictly to active company
  useEffect(() => {
    async function loadDepartments() {
      try {
        const companyParam = currentUser?.activeCompany?.id
          ? `?organizationId=${currentUser.activeCompany.id}`
          : "";
        const res = await fetch(`/api/hr/departments${companyParam}`, {
          headers: currentUser?.activeCompany?.id
            ? { "x-company-id": currentUser.activeCompany.id }
            : {},
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setDepartments(json.data.map((d: { id: string; name: string }) => ({ id: d.id, name: d.name })));
          }
        }
      } catch (err) {
        console.error("Failed to load departments:", err);
      }
    }
    loadDepartments();
  }, [currentUser?.activeCompany?.id]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(currentUser?.activeCompany?.id ? { "x-company-id": currentUser.activeCompany.id } : {}),
        },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create employee");
      }

      const createdEmp = json.data;
      setIsDrawerOpen(false);
      setIsCustomDesignation(false);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        aadhaarNumber: "",
        hireDate: new Date().toISOString().split("T")[0],
        designation: "",
        departmentId: "",
        managerId: "",
        employmentType: "FULL_TIME",
        workMode: "ON_SITE",
        location: "Headquarters (Mumbai)",
        emergencyContact: "",
        createSystemAccount: true,
        loginPassword: "",
        roleCode: "EMPLOYEE",
        immediateActive: false,
      });

      if (selectedSubmission?.id) {
        await fetch(`/api/hr/pre-onboarding/${selectedSubmission.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "ONBOARDED",
            createdEmployeeId: createdEmp.id,
          }),
        }).catch(() => {});
        setSelectedSubmission(null);
        fetchSubmissions();
      }

      if (createdEmp?.id) {
        window.location.href = `/app/hr/employees/${createdEmp.id}?newlyCreated=true`;
      } else {
        fetchEmployees();
      }
    } catch (err: any) {
      setCreateError(err.message || "Error creating employee");
    } finally {
      setCreateLoading(false);
    }
  };

  if (currentUser && (currentUser.roleCode === "EMPLOYEE" || (currentUser.roleLevel || 10) < 30)) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Employee Directory"
          description="Centralized personnel master records."
        />
        <HrNav />
        <Card className="p-8 text-center space-y-4 max-w-xl mx-auto border-rose-500/30">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
            <Lock className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Access Restricted to Management
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              You are signed in as <span className="font-semibold text-blue-600 dark:text-blue-400">{currentUser.roleName || "Staff Employee"}</span>. Standard staff accounts do not have permission to view full corporate directory lists or onboard personnel.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/app/hr"
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shadow-sm"
            >
              <span>Go to My Personal HR Portal</span>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Directory"
        description="Centralized personnel master records, organizational assignments, and reporting lines."
        badge={
          <Badge variant="info" size="sm" className="gap-1">
            <Users className="h-3 w-3" />
            <span>Personnel Master</span>
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/app/hr/organization"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <Network className="h-3.5 w-3.5 text-blue-400" />
              <span>Org Hierarchy Tree</span>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShareModalOpen(true)}
              className="gap-1.5 border-blue-500/40 text-blue-300 hover:bg-blue-950/40"
            >
              <Share2 className="h-3.5 w-3.5 text-blue-400" />
              <span>Candidate Form Link</span>
            </Button>
            {!isSuperAdmin && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedSubmission(null);
                  setIsDrawerOpen(true);
                }}
                className="gap-1.5"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Add Employee</span>
              </Button>
            )}
          </div>
        }
      />

      <HrNav />

      {/* ── Leadership & Executive Panel ── */}
      {leadershipList.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-amber-500/20 bg-amber-950/20">
            <Crown className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-bold text-amber-300">Leadership &amp; Executive Directory</h2>
            <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
              {leadershipList.length} members
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
            {leadershipList.map((emp) => {
              const roleCode = emp.user?.role?.code || "";
              const roleName = emp.user?.role?.name || emp.designation;
              const colorClass = getRoleColor(roleCode);
              return (
                <div
                  key={emp.id}
                  className="group relative flex items-center justify-between gap-3 rounded-xl border border-slate-700/60 bg-slate-900/60 p-3 hover:border-amber-500/40 hover:bg-amber-950/20 transition-all"
                >
                  <Link
                    href={`/app/hr/employees/${emp.id}`}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/20 text-sm font-bold text-amber-300">
                      {emp.firstName[0]}{emp.lastName[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-100 group-hover:text-amber-300 transition-colors truncate">
                        {emp.firstName} {emp.lastName}
                      </p>
                      <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider mt-0.5 ${colorClass}`}>
                        {roleCode || "EXEC"}
                      </span>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{emp.department?.name || "Executive Office"}</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-1.5">
                    {isExecutive && emp.id !== currentUser?.employee?.id && emp.user?.id !== currentUser?.id && roleCode !== "SUPER_ADMIN" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(emp);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-colors"
                        title="Delete Executive Record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <Link
                      href={`/app/hr/employees/${emp.id}`}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View Switcher: Staff Directory vs Candidate Pre-Onboarding Queue */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("directory")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "directory"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Staff Directory ({staffList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("submissions")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "submissions"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Inbox className="h-3.5 w-3.5" />
            <span>Candidate Intake Queue</span>
            {submissions.filter((s) => s.status === "PENDING_REVIEW").length > 0 ? (
              <span className="rounded-full bg-amber-400 text-slate-950 px-2 py-0.5 text-[10px] font-bold animate-pulse">
                {submissions.filter((s) => s.status === "PENDING_REVIEW").length} Pending
              </span>
            ) : (
              <span className="rounded-full bg-slate-800 text-slate-400 px-1.5 py-0.2 text-[10px] font-mono">
                {submissions.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsShareModalOpen(true)}
            className="gap-1.5 text-xs text-blue-300 border-blue-500/30 hover:bg-blue-950/40"
          >
            <Share2 className="h-3.5 w-3.5 text-blue-400" />
            <span>Forward Link to Candidate</span>
          </Button>
        </div>
      </div>

      {activeTab === "submissions" ? (
        /* Candidate Intake Queue View */
        <Card>
          <CardContent className="p-0">
            {submissionsLoading ? (
              <LoadingState message="Loading candidate pre-onboarding submissions..." />
            ) : submissions.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No candidate submissions yet"
                description="When candidates fill out your pre-onboarding link, their submitted details will automatically arrive here for review and onboarding."
                action={{
                  label: "Forward Form Link",
                  onClick: () => setIsShareModalOpen(true),
                }}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate Details</TableHead>
                    <TableHead>Date of Birth &amp; Identity</TableHead>
                    <TableHead>Projected ID</TableHead>
                    <TableHead>Contact &amp; Location</TableHead>
                    <TableHead>Submitted Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => {
                    const isPending = sub.status === "PENDING_REVIEW";
                    const isNF = (sub.organization?.code || "").toUpperCase() === "NAREE";
                    const prefix = isNF ? "NF" : "NFVS";
                    const year = new Date().getFullYear();
                    let bDay = "01";
                    if (sub.dateOfBirth) {
                      bDay = String(new Date(sub.dateOfBirth).getDate()).padStart(2, "0");
                    }
                    let a4 = "0000";
                    if (sub.aadhaarNumber) {
                      const d = sub.aadhaarNumber.replace(/\D/g, "");
                      if (d.length >= 4) a4 = d.slice(-4);
                    }
                    const projectedId = `${prefix}-${year}-${bDay}-${a4}`;

                    return (
                      <TableRow key={sub.id} className="hover:bg-slate-800/40">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-xs text-blue-300">
                              {sub.firstName?.[0]}{sub.lastName?.[0]}
                            </div>
                            <div>
                              <div className="font-semibold text-white text-xs">
                                {sub.firstName} {sub.lastName}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {sub.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5 text-xs">
                            <div className="text-slate-200">
                              DOB: <span className="font-mono text-blue-400">{sub.dateOfBirth ? formatDate(sub.dateOfBirth) : "Not set"}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              Aadhaar: {sub.aadhaarNumber || "N/A"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                            {projectedId}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-slate-300">
                            <div>{sub.phone || "No phone"}</div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                              {sub.city ? `${sub.city}, ${sub.state || ""}` : sub.currentAddress || "India"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-400">
                          {formatDate(sub.createdAt)}
                        </TableCell>
                        <TableCell>
                          {isPending ? (
                            <Badge variant="warning" size="sm">
                              Pending Review
                            </Badge>
                          ) : (
                            <Badge variant="success" size="sm">
                              Onboarded
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending ? (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleOnboardSubmission(sub)}
                                  className="gap-1 text-xs px-2.5 py-1"
                                >
                                  <UserPlus className="h-3 w-3" />
                                  <span>Review &amp; Onboard</span>
                                </Button>
                                <button
                                  onClick={() => handleDismissSubmission(sub.id)}
                                  className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                  title="Dismiss submission"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            ) : sub.createdEmployeeId ? (
                              <Link
                                href={`/app/hr/employees/${sub.createdEmployeeId}`}
                                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
                              >
                                <span>View Dossier</span>
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            ) : (
                              <span className="text-xs text-slate-500">Processed</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-300">Staff Employees</span>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">{staffList.length}</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-3 flex-1 md:justify-end">
          <div className="w-full md:w-80">
            <Search
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Search by name, email, employee ID..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Filter className="h-3 w-3" />
              <span>Filters:</span>
            </div>

            <div className="w-40">
              <Select
                options={[
                  { label: "All Departments", value: "ALL" },
                  ...departments.map((d) => ({ label: d.name, value: d.id })),
                ]}
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="w-32">
              <Select
                options={[
                  { label: "All Statuses", value: "ALL" },
                  { label: "Active", value: "ACTIVE" },
                  { label: "Probation", value: "PROBATION" },
                  { label: "On Leave", value: "ON_LEAVE" },
                  { label: "Terminated", value: "TERMINATED" },
                ]}
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Staff Employee Records Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState message="Loading corporate directory..." />
          ) : error ? (
            <ErrorState message={error} retry={fetchEmployees} />
          ) : staffList.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No staff employees found"
              description="No staff personnel records matched your search or filter."
              action={{
                label: "Reset Filters",
                onClick: () => {
                  setSearch("");
                  setSelectedDept("ALL");
                  setSelectedStatus("ALL");
                  setPage(1);
                },
              }}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Employee ID</TableHead>
                    <TableHead>Employee Name & Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Designation & System Role</TableHead>
                    <TableHead>Reporting Line</TableHead>
                    <TableHead>Work Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedStaff.map((emp) => (
                    <TableRow key={emp.id} className="cursor-pointer group">
                      <TableCell className="font-mono text-xs font-semibold text-blue-400">
                        {emp.employeeNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            name={`${emp.firstName} ${emp.lastName}`}
                            size="sm"
                          />
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-100 group-hover:text-blue-400 transition-colors">
                              {emp.firstName} {emp.lastName}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {emp.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Building className="h-3 w-3 text-slate-500" />
                          <span>{emp.department?.name || "Unassigned"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-slate-200">{emp.designation}</span>
                          <span className="text-[10px] font-mono text-purple-400">
                            {emp.user?.role?.name || "No System Account"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {emp.manager ? (
                          <div className="flex flex-col text-[11px]">
                            <span className="text-slate-300 font-medium">
                              {emp.manager.firstName} {emp.manager.lastName}
                            </span>
                            <span className="text-slate-500">
                              {emp.manager.designation}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-mono">
                            Top Leadership
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">
                          {emp.workMode}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <Badge
                            variant={
                              emp.employmentStatus === "ACTIVE"
                                ? "success"
                                : emp.onboardingStatus === "PENDING_APPROVAL"
                                ? "warning"
                                : "default"
                            }
                            size="sm"
                          >
                            {emp.employmentStatus === "ACTIVE"
                              ? "ACTIVE"
                              : emp.onboardingStatus === "PENDING_APPROVAL"
                              ? "PENDING APPROVAL"
                              : emp.onboardingStatus === "PENDING_VERIFICATION"
                              ? "DOCS PENDING"
                              : `PROFILE ${emp.profileCompletion || 20}%`}
                          </Badge>
                          {emp.employmentStatus !== "ACTIVE" && (
                            <span className="text-[10px] text-amber-400 font-mono">
                              Onboarding: {emp.profileCompletion || 20}%
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/app/hr/employees/${emp.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-500/20 hover:border-blue-500/40 transition-colors whitespace-nowrap"
                            title="Complete Profile & View Dossier"
                          >
                            <span>{emp.employmentStatus === "ACTIVE" ? "Dossier" : "Complete Profile"}</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                          {isExecutive && emp.id !== currentUser?.employee?.id && emp.user?.id !== currentUser?.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(emp);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 transition-colors whitespace-nowrap"
                              title="Delete Employee Record"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Pagination
                currentPage={safePage}
                totalPages={staffTotalPages}
                totalRecords={staffList.length}
                pageSize={10}
                onPageChange={(p) => setPage(p)}
              />
            </>
          )}
        </CardContent>
      </Card>
        </>
      )}

      {/* Add Employee Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Onboard New Employee"
        description="Establish corporate identity, reporting line, and CRM login credentials."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDrawerOpen(false)}
              disabled={createLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateSubmit}
              isLoading={createLoading}
            >
              Create Employee Profile
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {/* Onboarding Lifecycle Roadmap Card */}
          <div className="rounded-xl border border-blue-500/30 bg-blue-950/30 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-300">
              <span>Employee Onboarding Pipeline</span>
              <span className="text-[10px] font-mono bg-blue-900/60 px-2 py-0.5 rounded text-blue-200 border border-blue-700/50">
                10-Section Dossier
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300 overflow-x-auto pb-1">
              <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-medium shrink-0">1. Basic Account</span>
              <span className="text-slate-500">→</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">2. Complete Profile</span>
              <span className="text-slate-500">→</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">3. Doc Verification</span>
              <span className="text-slate-500">→</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">4. HR Approval</span>
              <span className="text-slate-500">→</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40 shrink-0">Active</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Creating this account will initialize the official employee master record and redirect to the 10-section dossier for complete verification.
            </p>
          </div>

          {selectedSubmission && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs space-y-1.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Candidate Pre-Onboarding Data Loaded</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSubmission(null)}
                  className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Clear link
                </button>
              </div>
              <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                Candidate <strong>{selectedSubmission.firstName} {selectedSubmission.lastName}</strong> ({selectedSubmission.email}) has filled their personal details, date of birth, and Aadhaar card. Please assign official <strong>Department</strong>, <strong>Designation</strong>, and <strong>Line Manager</strong> below to issue credentials.
              </p>
            </div>
          )}

          {/* Live Structured Employee ID Preview Card */}
          <div className="rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/50 p-3.5 space-y-2.5 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Official Employee ID Preview
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/60 border border-blue-700/50 text-blue-200">
                {companyPrefixPreview === "NFVS" ? "NFVS Studio" : "Naree Foundation"}
              </span>
            </div>
            <div className="flex items-center justify-between bg-black/50 rounded-lg px-3.5 py-2.5 border border-blue-500/25">
              <span className="text-xs text-slate-400">Auto-Generated ID:</span>
              <span className="text-base font-bold font-mono text-emerald-400 tracking-wider">
                {generatedIdPreview}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
              <span>
                <strong className="text-blue-300 font-mono">[{companyPrefixPreview}]</strong> Company
              </span>
              <span>•</span>
              <span>
                <strong className="text-blue-300 font-mono">[{joiningYearPreview}]</strong> Joining Year
              </span>
              <span>•</span>
              <span>
                <strong className="text-blue-300 font-mono">[{birthDayPreview}]</strong> Birthday Day
              </span>
              <span>•</span>
              <span>
                <strong className="text-blue-300 font-mono">[{aadhaarLast4Preview}]</strong> Aadhaar Last 4
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="e.g. Atharv"
              required
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="e.g. Narawade"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Date of Birth *"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              required
            />
            <Input
              label="Aadhaar Card Number (12 Digits) *"
              value={formData.aadhaarNumber}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/[^\d\s]/g, "");
                setFormData({ ...formData, aadhaarNumber: cleaned });
              }}
              placeholder="e.g. 1234 5678 8999"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Joining / Hire Date *"
              type="date"
              value={formData.hireDate}
              onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
              required
            />
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+917249271897"
            />
          </div>

          <Input
            label="Corporate Email Address (Used for Login)"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="atharvnarawade@gmail.com"
            required
          />

          {/* Official Designation Dropdown */}
          <div className="space-y-1.5">
            <Select
              label="Official Designation"
              options={DESIGNATION_OPTIONS}
              value={
                DESIGNATION_OPTIONS.some((opt) => opt.value === formData.designation)
                  ? formData.designation
                  : formData.designation
                  ? "CUSTOM"
                  : ""
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === "CUSTOM") {
                  setIsCustomDesignation(true);
                  setFormData((prev) => ({ ...prev, designation: "" }));
                } else {
                  setIsCustomDesignation(false);
                  const isAcc = val.toLowerCase().includes("account");
                  const finDept = isAcc
                    ? departments.find(
                        (d) =>
                          d.name.toLowerCase().includes("finance") ||
                          d.name.toLowerCase().includes("account")
                      )
                    : null;
                  setFormData((prev) => ({
                    ...prev,
                    designation: val,
                    departmentId: finDept && !prev.departmentId ? finDept.id : prev.departmentId,
                  }));
                }
              }}
              required
            />

            {/* Custom Designation Input if "Other / Custom" is selected */}
            {isCustomDesignation && (
              <Input
                label="Custom Designation Title"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="Enter custom designation (e.g. Lead Billing Specialist)"
                required
                className="mt-1"
              />
            )}

            {/* Accountant Auto-Redirect Notice */}
            {(formData.designation.toLowerCase().includes("accountant") ||
              formData.designation.toLowerCase().includes("accounts")) && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs mt-1.5 animate-fadeIn">
                <Landmark className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>
                  <strong>Accountant Designation:</strong> When this employee logs in with their credentials, they will automatically be redirected to the <strong>Accounts & Finance Dashboard</strong>.
                </span>
              </div>
            )}
          </div>

          {/* Organizational & Reporting Line Assignment */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-3.5 space-y-3">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-blue-400" />
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                Organizational Hierarchy &amp; Direct Manager
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Department *"
                options={[
                  { label: "Select Department", value: "" },
                  ...departments.map((d) => ({ label: d.name, value: d.id })),
                ]}
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                required
              />

              <div>
                <Select
                  label="Direct Line Manager"
                  options={[
                    { label: "None (Direct to Executive Leadership / C-Suite)", value: "" },
                    ...scopedEmployees.map((e) => {
                      const isMgr =
                        LEADERSHIP_ROLE_CODES.has(e.user?.role?.code || "") ||
                        (e.designation || "").toLowerCase().includes("manager") ||
                        (e.designation || "").toLowerCase().includes("lead") ||
                        (e.designation || "").toLowerCase().includes("head") ||
                        (e.designation || "").toLowerCase().includes("chief");
                      return {
                        label: `${e.firstName} ${e.lastName} (${e.designation})${isMgr ? " ⭐" : ""}`,
                        value: e.id,
                      };
                    }),
                  ]}
                  value={formData.managerId}
                  onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Only this assigned Direct Line Manager will have oversight of this employee&apos;s tasks. Peer employees and other managers cannot see this employee&apos;s tasks.
                </p>
              </div>
            </div>
          </div>

          {/* CRM System Account & Credentials Assignment Section */}
          <div className="rounded-lg border border-blue-500/30 bg-blue-950/20 dark:bg-blue-950/30 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.createSystemAccount}
                  onChange={(e) =>
                    setFormData({ ...formData, createSystemAccount: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Grant CRM Portal System Account (Enable Portal Sign-In)
                </span>
              </label>
            </div>

            {formData.createSystemAccount && (
              <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <Input
                    label="CRM Login Password"
                    type="password"
                    value={formData.loginPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, loginPassword: e.target.value })
                    }
                    placeholder="Set custom password (default: Enterprise@2026)"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    The employee will log into CRM using Corporate Email and this assigned password.
                  </p>
                </div>

                {/* Automated Welcome Email Notice */}
                <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-200 text-xs">
                  <Mail className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-white block">Automated Email Dispatch:</span>
                    <p className="text-[11px] text-slate-300">
                      Upon saving, an official onboarding email with this Login ID ({formData.email ? <strong className="text-white font-mono">{formData.email}</strong> : "corporate email"}), assigned password, and direct portal link will be forwarded to the employee so they can sign in and complete their details.
                    </p>
                  </div>
                </div>

                <Select
                  label="Assigned System RBAC Role"
                  options={[
                    { label: "Staff Employee (EMPLOYEE)", value: "EMPLOYEE" },
                    { label: "Line Manager (MANAGER)", value: "MANAGER" },
                    { label: "Department Head (DEPARTMENT_HEAD)", value: "DEPARTMENT_HEAD" },
                    { label: "Chief Human Resources Officer (HR)", value: "HR" },
                    { label: "Platform Administrator (ADMIN)", value: "ADMIN" },
                    { label: "Chief Operating Officer (COO)", value: "COO" },
                    { label: "Chief Marketing Officer (CMO)", value: "CMO" },
                    { label: "Chief Technology Officer (CTO)", value: "CTO" },
                    { label: "Chief Financial Officer (CFO)", value: "CFO" },
                    { label: "Chief Executive Officer (CEO)", value: "CEO" },
                    { label: "Super Admin (SUPER_ADMIN)", value: "SUPER_ADMIN" },
                  ]}
                  value={formData.roleCode}
                  onChange={(e) => setFormData({ ...formData, roleCode: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Employment Type"
              options={[
                { label: "Full-Time", value: "FULL_TIME" },
                { label: "Contract", value: "CONTRACT" },
                { label: "Part-Time", value: "PART_TIME" },
                { label: "Intern", value: "INTERN" },
              ]}
              value={formData.employmentType}
              onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
            />
            <Select
              label="Work Mode"
              options={[
                { label: "On-Site", value: "ON_SITE" },
                { label: "Remote", value: "REMOTE" },
                { label: "Hybrid", value: "HYBRID" },
              ]}
              value={formData.workMode}
              onChange={(e) => setFormData({ ...formData, workMode: e.target.value })}
            />
          </div>

          <Input
            label="Work Location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />

          <Input
            label="Emergency Contact"
            value={formData.emergencyContact}
            onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
            placeholder="Contact Name (+1-555-0000)"
          />
        </form>
      </Drawer>

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!deleteLoading) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        title="Confirm Employee Deletion"
        message={
          deleteError
            ? `Error: ${deleteError}`
            : `Are you sure you want to permanently delete ${deleteTarget?.firstName} ${deleteTarget?.lastName} (${deleteTarget?.employeeNumber})? All associated credentials, operational records, and HR profile records will be permanently removed.`
        }
        confirmLabel={deleteLoading ? "Deleting..." : "Delete Employee"}
        variant="danger"
        isLoading={deleteLoading}
      />

      {/* Candidate Pre-Onboarding Link & Invites Dialog */}
      <Dialog
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setInviteSuccess(null);
          setInviteError(null);
        }}
        title="Candidate Pre-Onboarding Intake Link"
        description="Forward this intake form link to prospective employees to collect their personal details, DOB, and Aadhaar card prior to account creation."
        size="lg"
      >
        <div className="space-y-5 pt-2">
          {/* Active Company Target Info */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Target Organization</span>
              <div className="text-xs font-bold text-white">
                {currentUser?.activeCompany?.name || "Naree Foundation Venture Studio"}
              </div>
            </div>
            <Badge variant="info" size="sm" className="font-mono">
              {(currentUser?.activeCompany?.code || "").toUpperCase() === "NAREE" ? "Code: NF" : "Code: NFVS"}
            </Badge>
          </div>

          {/* Copy Link Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200">
              Public Pre-Onboarding Intake URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${(process.env.NEXT_PUBLIC_APP_URL || "https://nfventurestudio.netlify.app").replace(/\/+$/, "")}/onboard?org=${
                  (currentUser?.activeCompany?.code || "").toUpperCase() === "NAREE" ? "NF" : "NFVS"
                }`}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-blue-300 select-all focus:outline-none"
              />
              <Button
                variant={copiedLink ? "secondary" : "primary"}
                size="sm"
                onClick={() => {
                  const appBase = (process.env.NEXT_PUBLIC_APP_URL || "https://nfventurestudio.netlify.app").replace(/\/+$/, "");
                  const url = `${appBase}/onboard?org=${
                    (currentUser?.activeCompany?.code || "").toUpperCase() === "NAREE" ? "NF" : "NFVS"
                  }`;
                  navigator.clipboard.writeText(url);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2500);
                }}
                className="gap-1.5 shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
              </Button>
            </div>
            <p className="text-[11px] text-slate-400">
              Share this link over WhatsApp, email, or messaging. The candidate can open it on mobile or desktop without needing a login account.
            </p>
          </div>

          {/* Direct Email Forwarding Section */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-4 space-y-3.5">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-400" />
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                Direct Email Dispatch (Optional)
              </h4>
            </div>

            <p className="text-xs text-slate-300">
              Or dispatch an official branded invitation directly from the CRM to the candidate&apos;s personal inbox:
            </p>

            {inviteSuccess && (
              <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{inviteSuccess}</span>
              </div>
            )}

            {inviteError && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleSendInvite} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Candidate Email Address *"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="candidate@gmail.com"
                  required
                />
                <Input
                  label="Candidate Name (Optional)"
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Atharv Narawade"
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={inviteLoading}
                  disabled={!inviteEmail}
                  className="gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Invitation Email</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
