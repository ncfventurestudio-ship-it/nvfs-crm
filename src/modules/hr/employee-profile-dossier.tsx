"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  ArrowLeft,
  User,
  Briefcase,
  MapPin,
  CreditCard,
  PhoneCall,
  GraduationCap,
  Building,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  UploadCloud,
  FileCheck,
  FileX,
  Trash2,
  Eye,
  Save,
  Sparkles,
  ExternalLink,
  Crown,
  Check,
  X,
  AlertTriangle,
  Key,
  Mail,
  Send,
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";

interface EmployeeProfileDossierProps {
  initialEmployee: any;
  initialCompletion: any;
  departments: { id: string; name: string }[];
  managers: { id: string; firstName: string; lastName: string; designation: string }[];
  currentUser: any;
  onRefresh?: () => void;
}

const DOCUMENT_TYPES = [
  { value: "AADHAAR", label: "Aadhaar Card (National UID)" },
  { value: "PAN", label: "PAN Card (Tax Identity)" },
  { value: "PASSPORT", label: "Passport (Govt Travel ID)" },
  { value: "RESUME", label: "Curriculum Vitae / Resume" },
  { value: "EDUCATION_CERTIFICATE", label: "Degree / Educational Certificate" },
  { value: "EXPERIENCE_LETTER", label: "Previous Employer Relieving Letter" },
  { value: "ADDRESS_PROOF", label: "Proof of Address (Utility/Rental)" },
  { value: "OFFER_LETTER", label: "Signed Corporate Offer Letter" },
  { value: "OTHER", label: "Other Supporting Document" },
];

export function EmployeeProfileDossier({
  initialEmployee,
  initialCompletion,
  departments,
  managers,
  currentUser,
  onRefresh,
}: EmployeeProfileDossierProps) {
  const [employee, setEmployee] = useState(initialEmployee);
  const [completion, setCompletion] = useState(initialCompletion);
  const [activeTab, setActiveTab] = useState<string>("personal");

  // Form state holding all 10 sections
  const prof = employee.profile || {};
  const [formData, setFormData] = useState({
    // 0. Primary Personnel Master Information (Filled on Employee Creation)
    firstName: employee.firstName || "",
    lastName: employee.lastName || "",
    email: employee.email || "",
    phone: employee.phone || "",
    emergencyContact: employee.emergencyContact || prof.primaryContactName || "",

    // 1. Personal Information
    dateOfBirth: prof.dateOfBirth ? new Date(prof.dateOfBirth).toISOString().split("T")[0] : "",
    gender: prof.gender || "",
    maritalStatus: prof.maritalStatus || "",
    bloodGroup: prof.bloodGroup || "",
    nationality: prof.nationality || "Indian",
    fatherOrSpouseName: prof.fatherOrSpouseName || "",
    bio: prof.bio || "",

    // 2. Employment Information
    designation: employee.designation || "",
    departmentId: employee.departmentId || "",
    teamId: employee.teamId || "",
    managerId: employee.managerId || "",
    employmentType: employee.employmentType || "FULL_TIME",
    workMode: employee.workMode || "ON_SITE",
    location: employee.location || "Headquarters (Mumbai)",
    hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().split("T")[0] : "",

    // 3. Contact & Address
    currentAddress: prof.currentAddress || "",
    permanentAddress: prof.permanentAddress || "",
    personalEmail: prof.personalEmail || employee.email || "",
    alternatePhone: prof.alternatePhone || "",
    city: prof.city || "",
    state: prof.state || "",
    postalCode: prof.postalCode || "",
    country: prof.country || "India",

    // 4. Government IDs
    panNumber: prof.panNumber || "",
    aadhaarNumber: prof.aadhaarNumber || "",
    passportNumber: prof.passportNumber || "",
    passportExpiry: prof.passportExpiry ? new Date(prof.passportExpiry).toISOString().split("T")[0] : "",
    ssnOrNationalId: prof.ssnOrNationalId || "",
    taxId: prof.taxId || "",

    // 5. Bank / Payroll
    bankName: prof.bankName || "",
    accountHolderName: prof.accountHolderName || `${employee.firstName} ${employee.lastName}`,
    accountNumber: prof.accountNumber || "",
    ifscOrRoutingCode: prof.ifscOrRoutingCode || "",
    branchName: prof.branchName || "",
    accountType: prof.accountType || "SALARY",
    upiId: prof.upiId || "",

    // 6. Emergency Contact
    primaryContactName: prof.primaryContactName || employee.emergencyContact || "",
    primaryContactRelation: prof.primaryContactRelation || "",
    primaryContactPhone: prof.primaryContactPhone || "",
    secondaryContactName: prof.secondaryContactName || "",
    secondaryContactRelation: prof.secondaryContactRelation || "",
    secondaryContactPhone: prof.secondaryContactPhone || "",

    // 7. Education
    highestDegree: prof.highestDegree || "",
    institution: prof.institution || "",
    fieldOfStudy: prof.fieldOfStudy || "",
    graduationYear: prof.graduationYear || "",
    gradeOrGpa: prof.gradeOrGpa || "",
    certifications: prof.certifications || "",

    // 8. Professional Details
    previousEmployer: prof.previousEmployer || "",
    previousDesignation: prof.previousDesignation || "",
    totalExperienceYears: prof.totalExperienceYears !== null && prof.totalExperienceYears !== undefined ? prof.totalExperienceYears : "",
    skills: prof.skills || "",
    linkedinUrl: prof.linkedinUrl || "",
    portfolioUrl: prof.portfolioUrl || "",

    // 10. Access & Permissions / System Credentials
    roleCode: employee.user?.role?.code || "EMPLOYEE",
    newPassword: "",
    isUserActive: employee.user?.isActive ?? true,
    createSystemAccount: Boolean(employee.userId),
  });

  // Action states
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Document upload state
  const [docUploadOpen, setDocUploadOpen] = useState(false);
  const [uploadDocType, setUploadDocType] = useState("AADHAAR");
  const [uploadDocTitle, setUploadDocTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Document verification modal state
  const [selectedDocForVerify, setSelectedDocForVerify] = useState<any | null>(null);
  const [verifyStatusAction, setVerifyStatusAction] = useState<"VERIFIED" | "REJECTED">("VERIFIED");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [verifyingDoc, setVerifyingDoc] = useState(false);

  // HR Approval modal state
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("Profile dossier and identity verified. Approved into active workforce.");
  const [approvalCompleted, setApprovalCompleted] = useState(false);

  // Check if current user is HR, Admin, or Corporate Executive
  const userRoleCode = (currentUser?.roleCode || currentUser?.role?.code || "").toUpperCase();
  const userRoleLevel = currentUser?.roleLevel ?? currentUser?.role?.level ?? 10;
  const isHrOrAdmin = ["SUPER_ADMIN", "ADMIN", "CEO", "HR"].includes(userRoleCode);
  const canApproveAndActivate = ["ADMIN", "CEO", "HR"].includes(userRoleCode);
  const isExecutive = ["SUPER_ADMIN", "ADMIN", "CHAIRPERSON", "CEO", "COO", "CFO", "CIO", "CTO", "CMO", "CHRO", "HR", "DIRECTOR", "VP", "PRESIDENT"].includes(userRoleCode) || userRoleLevel >= 40;

  // Delete state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showWelcomeMailBanner, setShowWelcomeMailBanner] = useState(
    searchParams?.get("newlyCreated") === "true"
  );

  // Forward / Resend Credentials Modal State
  const [resendModalOpen, setResendModalOpen] = useState(false);
  const [resendPassword, setResendPassword] = useState("");
  const [resendingMail, setResendingMail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const handleResendCredentials = async () => {
    try {
      setResendingMail(true);
      setResendError(null);
      setResendSuccess(null);
      const res = await fetch(`/api/employees/${employee.id}/resend-credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customPassword: resendPassword || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to forward credentials");
      }
      setResendSuccess(json.data?.message || "Credentials email forwarded successfully!");
      setTimeout(() => {
        setResendModalOpen(false);
        setResendSuccess(null);
        setResendPassword("");
      }, 2500);
    } catch (err: any) {
      setResendError(err.message || "Failed to forward email");
    } finally {
      setResendingMail(false);
    }
  };

  const handleDeleteEmployee = async () => {
    try {
      setDeleting(true);
      setDeleteError(null);
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "DELETE",
        headers: currentUser?.activeCompany?.id ? { "x-company-id": currentUser.activeCompany.id } : {},
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to delete employee");
      }
      setDeleteConfirmOpen(false);
      router.push("/app/hr/employees");
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete employee");
    } finally {
      setDeleting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setErrorMessage(null);
      const res = await fetch(`/api/employees/${employee.id}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to save profile changes");
      }

      setEmployee(json.data.employee);
      setCompletion(json.data.completion);

      if (json.data.employee) {
        const emp = json.data.employee;
        setFormData((prev) => ({
          ...prev,
          firstName: emp.firstName || prev.firstName,
          lastName: emp.lastName || prev.lastName,
          email: emp.email || prev.email,
          phone: emp.phone || prev.phone,
          designation: emp.designation || prev.designation,
          departmentId: emp.departmentId || prev.departmentId,
          managerId: emp.managerId || prev.managerId,
          roleCode: emp.user?.role?.code || prev.roleCode,
          newPassword: "",
          isUserActive: emp.user?.isActive ?? prev.isUserActive,
          createSystemAccount: Boolean(emp.userId),
        }));
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onRefresh?.();
    } catch (err: any) {
      setErrorMessage(err.message || "Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  // Quick auto-populate for HR/Super Admin demonstration
  const handleAutoFillSampleData = () => {
    setFormData((prev) => ({
      ...prev,
      dateOfBirth: prev.dateOfBirth || "1994-06-15",
      gender: prev.gender || "MALE",
      maritalStatus: prev.maritalStatus || "SINGLE",
      bloodGroup: prev.bloodGroup || "O+",
      nationality: prev.nationality || "Indian",
      fatherOrSpouseName: prev.fatherOrSpouseName || "Ramesh Sharma",
      bio: prev.bio || "Dynamic professional specializing in scalable enterprise workflows and team leadership.",

      currentAddress: prev.currentAddress || "Tower B-402, High Street Greens, Powai",
      permanentAddress: prev.permanentAddress || "Tower B-402, High Street Greens, Powai",
      personalEmail: prev.personalEmail || `personal.${employee.email}`,
      alternatePhone: prev.alternatePhone || "+91 98200 45678",
      city: prev.city || "Mumbai",
      state: prev.state || "Maharashtra",
      postalCode: prev.postalCode || "400076",
      country: "India",

      panNumber: prev.panNumber || "ABCDE1234F",
      aadhaarNumber: prev.aadhaarNumber || "8923 4512 7890",
      passportNumber: prev.passportNumber || "Z8942109",
      passportExpiry: prev.passportExpiry || "2032-11-20",

      bankName: prev.bankName || "HDFC Bank Ltd.",
      accountHolderName: prev.accountHolderName || `${employee.firstName} ${employee.lastName}`,
      accountNumber: prev.accountNumber || "50100492817290",
      ifscOrRoutingCode: prev.ifscOrRoutingCode || "HDFC0000240",
      branchName: prev.branchName || "Bandra Kurla Complex (BKC)",
      accountType: "SALARY",
      upiId: prev.upiId || `${employee.firstName.toLowerCase()}@okhdfcbank`,

      primaryContactName: prev.primaryContactName || "Sunita Sharma",
      primaryContactRelation: prev.primaryContactRelation || "Mother",
      primaryContactPhone: prev.primaryContactPhone || "+91 98200 11223",

      highestDegree: prev.highestDegree || "B.Tech in Computer Science",
      institution: prev.institution || "Indian Institute of Technology (IIT Bombay)",
      fieldOfStudy: prev.fieldOfStudy || "Computer Science & Engineering",
      graduationYear: prev.graduationYear || 2016,
      gradeOrGpa: prev.gradeOrGpa || "8.9 / 10 CGPA",
      certifications: prev.certifications || "AWS Solutions Architect, PMP Certified",

      previousEmployer: prev.previousEmployer || "Tata Consultancy Services Ltd.",
      previousDesignation: prev.previousDesignation || "Senior Systems Consultant",
      totalExperienceYears: prev.totalExperienceYears || 8.5,
      skills: prev.skills || "Enterprise Strategy, Full-Stack Architecture, React, Node.js, Cloud Operations",
      linkedinUrl: prev.linkedinUrl || "https://linkedin.com/in/enterprise-employee",
      portfolioUrl: prev.portfolioUrl || "https://github.com/enterprise-dev",
    }));
  };

  const handleFileSelect = (file: File) => {
    setFileError(null);
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      setFileError(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 10 MB maximum limit.`);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    if (!uploadDocTitle.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setUploadDocTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setFileError("Please attach a soft copy file (PDF, PNG, JPG, or DOCX) to upload.");
      return;
    }
    if (!uploadDocTitle.trim()) {
      setFileError("Please provide a title for this document.");
      return;
    }

    try {
      setUploadingDoc(true);
      setFileError(null);

      const data = new FormData();
      data.append("file", selectedFile);
      data.append("type", uploadDocType);
      data.append("title", uploadDocTitle.trim());

      const res = await fetch(`/api/employees/${employee.id}/documents`, {
        method: "POST",
        body: data,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to upload document");
      }

      // Re-fetch dossier to refresh completion and document vault
      const dossierRes = await fetch(`/api/employees/${employee.id}/profile`);
      const dossierJson = await dossierRes.json();
      if (dossierJson.success) {
        setEmployee(dossierJson.data.employee);
        setCompletion(dossierJson.data.completion);
      }

      setDocUploadOpen(false);
      setSelectedFile(null);
      setUploadDocTitle("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      onRefresh?.();
    } catch (err: any) {
      setFileError(err.message || "Failed to upload document");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleVerifyDocument = async () => {
    if (!selectedDocForVerify) return;
    try {
      setVerifyingDoc(true);
      const res = await fetch(`/api/employees/${employee.id}/documents/${selectedDocForVerify.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: verifyStatusAction,
          notes: verifyNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update verification status");
      }

      // Refresh dossier
      const dossierRes = await fetch(`/api/employees/${employee.id}/profile`);
      const dossierJson = await dossierRes.json();
      if (dossierJson.success) {
        setEmployee(dossierJson.data.employee);
        setCompletion(dossierJson.data.completion);
      }

      setSelectedDocForVerify(null);
      setVerifyNotes("");
    } catch (err: any) {
      alert(err.message || "Verification failed");
    } finally {
      setVerifyingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      const res = await fetch(`/api/employees/${employee.id}/documents/${docId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success && json.data?.dossier) {
        setEmployee(json.data.dossier.employee);
        setCompletion(json.data.dossier.completion);
      }
    } catch (err) {
      alert("Error deleting document");
    }
  };

  const handleApproveEmployee = async () => {
    try {
      setApproving(true);
      const res = await fetch(`/api/employees/${employee.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalNotes }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to approve employee");
      }

      setApprovalCompleted(true);
      // Re-fetch dossier
      const dossierRes = await fetch(`/api/employees/${employee.id}/profile`);
      const dossierJson = await dossierRes.json();
      if (dossierJson.success) {
        setEmployee(dossierJson.data.employee);
        setCompletion(dossierJson.data.completion);
      }
      setTimeout(() => {
        setApprovalModalOpen(false);
        setApprovalCompleted(false);
      }, 1500);
      onRefresh?.();
    } catch (err: any) {
      alert(err.message || "Failed to approve employee");
    } finally {
      setApproving(false);
    }
  };

  const score = completion?.totalScore || employee.profileCompletion || 0;
  const isProfileActive = employee.employmentStatus === "ACTIVE" && employee.onboardingStatus === "COMPLETED";

  // Navigation sections with completion status
  const SECTIONS = [
    { id: "personal", label: "Personal Information", icon: User },
    { id: "employment", label: "Employment Information", icon: Briefcase },
    { id: "contact", label: "Contact & Address", icon: MapPin },
    { id: "government", label: "Government IDs", icon: CreditCard },
    { id: "payroll", label: "Bank / Payroll", icon: Building },
    { id: "emergency", label: "Emergency Contact", icon: PhoneCall },
    { id: "education", label: "Education", icon: GraduationCap },
    { id: "professional", label: "Professional Details", icon: Briefcase },
    { id: "documents", label: "Documents", icon: FileText, count: employee.documents?.length || 0 },
    { id: "access", label: "Access & Permissions", icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Quick Nav */}
      <div className="flex items-center justify-between">
        <Link
          href="/app/hr/employees"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Employee Directory</span>
        </Link>
        <div className="flex items-center gap-2">
          {isExecutive && employee.id !== currentUser?.employee?.id && employee.user?.id !== currentUser?.id && employee.user?.role?.code !== "SUPER_ADMIN" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmOpen(true)}
              className="border-rose-500/30 bg-rose-500/10 text-xs text-rose-400 hover:text-white hover:bg-rose-600/30 hover:border-rose-500/60 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete Employee
            </Button>
          )}
          {isHrOrAdmin && !isProfileActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoFillSampleData}
              className="border-slate-700 bg-slate-800/80 text-xs text-slate-300 hover:text-white hover:bg-slate-700"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400 mr-1.5" />
              Auto-fill Complete Profile
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSaveProfile}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-sm"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saving ? "Saving..." : saveSuccess ? "Saved Successfully!" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Main Dossier Header Banner */}
      <div className="rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900 via-[#0d1627] to-slate-900 p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <Avatar
              name={`${employee.firstName} ${employee.lastName}`}
              size="lg"
              className="h-20 w-20 text-xl border-2 border-slate-700 ring-4 ring-blue-950/40 shrink-0"
            />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  {employee.firstName} {employee.lastName}
                </h1>
                <span className="font-mono text-xs text-blue-400 font-semibold bg-blue-950/70 px-2.5 py-0.5 rounded-full border border-blue-800/50">
                  {employee.employeeNumber}
                </span>

                {/* Status Badges */}
                {isProfileActive ? (
                  <Badge variant="success" size="sm" className="gap-1 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    ACTIVE ACCOUNT
                  </Badge>
                ) : employee.onboardingStatus === "PENDING_APPROVAL" ? (
                  <Badge variant="warning" size="sm" className="gap-1 bg-purple-500/20 text-purple-300 border-purple-500/30">
                    <Clock className="h-3 w-3 text-purple-400" />
                    READY FOR HR APPROVAL
                  </Badge>
                ) : employee.onboardingStatus === "PENDING_VERIFICATION" ? (
                  <Badge variant="warning" size="sm" className="gap-1 bg-amber-500/20 text-amber-300 border-amber-500/30">
                    <AlertTriangle className="h-3 w-3 text-amber-400" />
                    PENDING DOCUMENT VERIFICATION
                  </Badge>
                ) : (
                  <Badge variant="warning" size="sm" className="gap-1 bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                    <AlertCircle className="h-3 w-3 text-yellow-400" />
                    PROFILE INCOMPLETE ({score}%)
                  </Badge>
                )}
              </div>

              <p className="text-sm text-slate-300 font-medium">
                {employee.designation} • <span className="text-blue-400">{employee.department?.name || "Corporate"}</span>
                {employee.organization && <span className="text-slate-500"> ({employee.organization.name})</span>}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-0.5">
                <span>Email: <strong className="text-slate-300">{employee.email}</strong></span>
                {employee.phone && <span>Phone: <strong className="text-slate-300">{employee.phone}</strong></span>}
                <span>Location: <strong className="text-slate-300">{employee.location}</strong></span>
              </div>
            </div>
          </div>

          {/* Profile Completion & Approval Action CTA */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 border-t lg:border-t-0 border-slate-800 pt-4 lg:pt-0">
            {/* Completion Meter */}
            <div className="w-full sm:w-64 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  Profile Completion
                  {score >= 80 && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                </span>
                <span className="font-mono font-bold text-white text-sm">{score}%</span>
              </div>
              <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                <div
                  className={`h-full transition-all duration-700 ease-out ${
                    score >= 90
                      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                      : score >= 60
                      ? "bg-gradient-to-r from-amber-500 to-emerald-400"
                      : "bg-gradient-to-r from-red-500 to-amber-500"
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                {completion?.sections?.filter((s: any) => s.completed).length || 0} of 10 mandatory sections complete
              </p>
            </div>

            {/* Approval CTA Button */}
            {(canApproveAndActivate || (isHrOrAdmin && isProfileActive)) && (
              <div>
                {isProfileActive ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-800/40">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Approved by {employee.approvedBy || "HR"} ({formatDate(employee.approvedAt || employee.updatedAt)})</span>
                  </div>
                ) : canApproveAndActivate ? (
                  <Button
                    onClick={() => setApprovalModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2 shadow-lg shadow-emerald-900/30 gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve & Activate Account
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Newly Created Welcome Email Banner */}
      {showWelcomeMailBanner && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-xs text-emerald-200 flex items-start justify-between gap-3 shadow-lg animate-in fade-in">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-emerald-300 text-sm">
                Employee Profile Created &amp; Welcome Credentials Dispatched!
              </div>
              <p className="text-emerald-300/80">
                An official welcome email with portal credentials (Login ID: <strong className="text-white font-mono">{employee.email}</strong>) and direct login link has been forwarded to the employee. They will use their assigned ID and password to log in and fill out the rest of their profile details.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowWelcomeMailBanner(false)}
            className="text-emerald-400 hover:text-emerald-200 text-xs px-2 py-1 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error alert if any */}
      {errorMessage && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main 10-Section Navigation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side: Stepper Navigation for 10 Sections */}
        <div className="lg:col-span-1 space-y-2">
          <div className="rounded-xl border border-slate-800 bg-[#0f172a] p-3 shadow-md space-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-3 py-2">
              Profile Dossier Sections
            </h3>
            {SECTIONS.map((sec, index) => {
              const Icon = sec.icon;
              const sectionStatus = completion?.sections?.find((s: any) => s.id === sec.id);
              const isCompleted = sectionStatus?.completed;
              const isActive = activeTab === sec.id;

              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveTab(sec.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-sm"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono ${
                      isActive ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
                    }`}>
                      {index + 1}
                    </span>
                    <Icon className={`h-4 w-4 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
                    <span className="truncate">{sec.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {sec.id === "documents" && sec.count !== undefined && (
                      <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                        {sec.count}
                      </span>
                    )}
                    {isCompleted ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-amber-400/80" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Summary Card */}
          <div className="rounded-xl border border-slate-800 bg-[#0f172a] p-4 text-xs space-y-3">
            <h4 className="font-semibold text-slate-200">Onboarding Checklist</h4>
            <div className="space-y-2 text-slate-400">
              <div className="flex items-center justify-between">
                <span>Profile Score</span>
                <strong className={score >= 70 ? "text-emerald-400" : "text-amber-400"}>
                  {score}% {score >= 70 ? "Ready" : "Incomplete"}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Documents</span>
                <strong className="text-slate-200">
                  {employee.documents?.length || 0} uploaded
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Verified Docs</span>
                <strong className={employee.documents?.some((d: any) => d.verificationStatus === "VERIFIED") ? "text-emerald-400" : "text-slate-400"}>
                  {employee.documents?.filter((d: any) => d.verificationStatus === "VERIFIED").length || 0} / {employee.documents?.length || 0}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span>HR Approval</span>
                <strong className={isProfileActive ? "text-emerald-400" : "text-purple-400"}>
                  {isProfileActive ? "Approved" : "Pending"}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Active Section Form Panels */}
        <div className="lg:col-span-3">
          <Card className="border-slate-800 bg-[#0f172a] shadow-lg">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                    {SECTIONS.find((s) => s.id === activeTab)?.label}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 pt-0.5">
                    {activeTab === "personal" && "Individual identity, date of birth, marital status, and biological details."}
                    {activeTab === "employment" && "Job designation, organizational department, reporting manager, and employment mode."}
                    {activeTab === "contact" && "Current residential and permanent residential postal addresses and contact lines."}
                    {activeTab === "government" && "Statutory government identity proofs, PAN, Aadhaar, Passport, and Tax IDs."}
                    {activeTab === "payroll" && "Designated corporate salary disbursement bank account and UPI endpoints."}
                    {activeTab === "emergency" && "Authorized next-of-kin contacts for workplace emergencies and medical escalation."}
                    {activeTab === "education" && "Academic qualifications, university degrees, and professional certifications."}
                    {activeTab === "professional" && "Prior work experience, career milestones, technical skills, and portfolio profiles."}
                    {activeTab === "documents" && "Official credentials repository and HR verification vault."}
                    {activeTab === "access" && "System credentials, assigned organizational persona, and granular data scopes."}
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* SECTION 1: PERSONAL INFORMATION */}
              {activeTab === "personal" && (
                <div className="space-y-5">
                  {/* Primary Personnel Identity (Filled at Employee Creation) */}
                  <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-blue-400" />
                        Personnel Master Identity & Contact
                      </h4>
                      <Badge variant="outline" size="sm" className="text-[10px] text-blue-300 border-blue-500/40">
                        Employee ID: {employee.employeeNumber}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-200 block mb-1.5">
                          First Name <span className="text-red-400">*</span>
                        </label>
                        <Input
                          required
                          value={formData.firstName}
                          onChange={(e) => handleInputChange("firstName", e.target.value)}
                          placeholder="e.g. John"
                          className="bg-slate-900 border-slate-700 text-xs font-medium text-white focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-200 block mb-1.5">
                          Last Name <span className="text-red-400">*</span>
                        </label>
                        <Input
                          required
                          value={formData.lastName}
                          onChange={(e) => handleInputChange("lastName", e.target.value)}
                          placeholder="e.g. Doe"
                          className="bg-slate-900 border-slate-700 text-xs font-medium text-white focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-200 block mb-1.5">
                          Official Corporate Email <span className="text-red-400">*</span>
                        </label>
                        <Input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          placeholder="john.doe@company.com"
                          className="bg-slate-900 border-slate-700 text-xs font-mono text-white focus:border-blue-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Used for CRM system authentication and official communications.
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-200 block mb-1.5">
                          Primary Mobile / Phone
                        </label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                          placeholder="+91 98765 43210"
                          className="bg-slate-900 border-slate-700 text-xs text-white focus:border-blue-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Direct personal line for official notifications and alerts.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Biological and Civil Demographics */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Date of Birth *</label>
                      <Input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Gender *</label>
                      <Select
                        value={formData.gender}
                        onChange={(e) => handleInputChange("gender", e.target.value)}
                        options={[
                          { value: "", label: "Select Gender" },
                          { value: "MALE", label: "Male" },
                          { value: "FEMALE", label: "Female" },
                          { value: "NON_BINARY", label: "Non-Binary" },
                          { value: "OTHER", label: "Prefer not to say / Other" },
                        ]}
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Marital Status *</label>
                      <Select
                        value={formData.maritalStatus}
                        onChange={(e) => handleInputChange("maritalStatus", e.target.value)}
                        options={[
                          { value: "", label: "Select Status" },
                          { value: "SINGLE", label: "Single" },
                          { value: "MARRIED", label: "Married" },
                          { value: "DIVORCED", label: "Divorced" },
                          { value: "WIDOWED", label: "Widowed" },
                        ]}
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Blood Group *</label>
                      <Select
                        value={formData.bloodGroup}
                        onChange={(e) => handleInputChange("bloodGroup", e.target.value)}
                        options={[
                          { value: "", label: "Select Blood Group" },
                          { value: "A+", label: "A positive (A+)" },
                          { value: "A-", label: "A negative (A-)" },
                          { value: "B+", label: "B positive (B+)" },
                          { value: "B-", label: "B negative (B-)" },
                          { value: "AB+", label: "AB positive (AB+)" },
                          { value: "AB-", label: "AB negative (AB-)" },
                          { value: "O+", label: "O positive (O+)" },
                          { value: "O-", label: "O negative (O-)" },
                        ]}
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Nationality *</label>
                      <Input
                        value={formData.nationality}
                        onChange={(e) => handleInputChange("nationality", e.target.value)}
                        placeholder="Indian / American / etc."
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Father / Spouse Name</label>
                      <Input
                        value={formData.fatherOrSpouseName}
                        onChange={(e) => handleInputChange("fatherOrSpouseName", e.target.value)}
                        placeholder="Full Legal Name"
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">Biography & Professional Summary</label>
                    <textarea
                      rows={3}
                      value={formData.bio}
                      onChange={(e) => handleInputChange("bio", e.target.value)}
                      placeholder="Brief overview of background and career profile..."
                      className="w-full rounded-md border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 2: EMPLOYMENT INFORMATION */}
              {activeTab === "employment" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Employee ID (System Generated)</label>
                      <Input
                        disabled
                        value={employee.employeeNumber}
                        className="bg-slate-950 border-slate-800 text-xs font-mono text-blue-400 font-semibold cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Designation *</label>
                      <Input
                        value={formData.designation}
                        onChange={(e) => handleInputChange("designation", e.target.value)}
                        placeholder="e.g. Lead Software Architect"
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Department *</label>
                      <Select
                        value={formData.departmentId}
                        onChange={(e) => handleInputChange("departmentId", e.target.value)}
                        options={[
                          { value: "", label: "Select Department" },
                          ...departments.map((d) => ({ value: d.id, label: d.name })),
                        ]}
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Direct Line Manager</label>
                      <Select
                        disabled={!isHrOrAdmin && !isExecutive}
                        value={formData.managerId}
                        onChange={(e) => handleInputChange("managerId", e.target.value)}
                        options={[
                          { value: "", label: "Direct to Leadership / None" },
                          ...managers
                            .filter((m) => m.id !== employee.id)
                            .map((m) => ({
                              value: m.id,
                              label: `${m.firstName} ${m.lastName} (${m.designation})`,
                            })),
                        ]}
                        className={cn(
                          "bg-slate-900 border-slate-800 text-xs",
                          !isHrOrAdmin && !isExecutive && "opacity-60 cursor-not-allowed"
                        )}
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        {!isHrOrAdmin && !isExecutive
                          ? "Direct reporting line is designated by HR / Executive Management."
                          : "This assigned manager has exclusive operational oversight of this employee's tasks."}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Date of Joining / Hire Date *</label>
                      <Input
                        type="date"
                        value={formData.hireDate}
                        onChange={(e) => handleInputChange("hireDate", e.target.value)}
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Employment Type</label>
                      <Select
                        value={formData.employmentType}
                        onChange={(e) => handleInputChange("employmentType", e.target.value)}
                        options={[
                          { value: "FULL_TIME", label: "Full Time Permanent" },
                          { value: "CONTRACT", label: "Contractual / Consultant" },
                          { value: "PART_TIME", label: "Part Time" },
                          { value: "INTERN", label: "Internship" },
                        ]}
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Work Mode</label>
                      <Select
                        value={formData.workMode}
                        onChange={(e) => handleInputChange("workMode", e.target.value)}
                        options={[
                          { value: "ON_SITE", label: "On-Site (Office)" },
                          { value: "HYBRID", label: "Hybrid (Flexible)" },
                          { value: "REMOTE", label: "Remote (Work from Home)" },
                        ]}
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Work Location / Base Office</label>
                      <Input
                        value={formData.location}
                        onChange={(e) => handleInputChange("location", e.target.value)}
                        placeholder="Headquarters (Mumbai)"
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: CONTACT & ADDRESS */}
              {activeTab === "contact" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Personal Email Address *</label>
                      <Input
                        type="email"
                        value={formData.personalEmail}
                        onChange={(e) => handleInputChange("personalEmail", e.target.value)}
                        placeholder="employee.personal@gmail.com"
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Mobile / Primary Phone *</label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        placeholder="+91 98765 43210"
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Alternate Contact Phone</label>
                      <Input
                        value={formData.alternatePhone}
                        onChange={(e) => handleInputChange("alternatePhone", e.target.value)}
                        placeholder="+91 98765 00000"
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">City *</label>
                      <Input
                        value={formData.city}
                        onChange={(e) => handleInputChange("city", e.target.value)}
                        placeholder="Mumbai"
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">State / Province *</label>
                      <Input
                        value={formData.state}
                        onChange={(e) => handleInputChange("state", e.target.value)}
                        placeholder="Maharashtra"
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Postal / PIN Code *</label>
                      <Input
                        value={formData.postalCode}
                        onChange={(e) => handleInputChange("postalCode", e.target.value)}
                        placeholder="400001"
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">Current Residential Address *</label>
                    <textarea
                      rows={2}
                      value={formData.currentAddress}
                      onChange={(e) => handleInputChange("currentAddress", e.target.value)}
                      placeholder="Apartment, Street name, Area..."
                      className="w-full rounded-md border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-slate-300">Permanent Address</label>
                      <button
                        type="button"
                        onClick={() => handleInputChange("permanentAddress", formData.currentAddress)}
                        className="text-[11px] text-blue-400 hover:text-blue-300 underline"
                      >
                        Same as Current Address
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={formData.permanentAddress}
                      onChange={(e) => handleInputChange("permanentAddress", e.target.value)}
                      placeholder="Permanent hometown address..."
                      className="w-full rounded-md border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 4: GOVERNMENT IDS */}
              {activeTab === "government" && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 text-xs text-slate-400 flex items-start gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    <span>
                      Government identification numbers are securely stored and encrypted for compliance, tax filings, and legal onboarding verification.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">PAN Card Number (Income Tax) *</label>
                      <Input
                        value={formData.panNumber}
                        onChange={(e) => handleInputChange("panNumber", e.target.value.toUpperCase())}
                        placeholder="ABCDE1234F"
                        className="bg-slate-900 border-slate-800 text-xs font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Aadhaar Card Number (UID) *</label>
                      <Input
                        value={formData.aadhaarNumber}
                        onChange={(e) => handleInputChange("aadhaarNumber", e.target.value)}
                        placeholder="XXXX XXXX XXXX"
                        className="bg-slate-900 border-slate-800 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Passport Number</label>
                      <Input
                        value={formData.passportNumber}
                        onChange={(e) => handleInputChange("passportNumber", e.target.value.toUpperCase())}
                        placeholder="A1234567"
                        className="bg-slate-900 border-slate-800 text-xs font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Passport Expiry Date</label>
                      <Input
                        type="date"
                        value={formData.passportExpiry}
                        onChange={(e) => handleInputChange("passportExpiry", e.target.value)}
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">SSN / National ID (International)</label>
                      <Input
                        value={formData.ssnOrNationalId}
                        onChange={(e) => handleInputChange("ssnOrNationalId", e.target.value)}
                        placeholder="National Identification Number"
                        className="bg-slate-900 border-slate-800 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Tax Identification Number (TIN)</label>
                      <Input
                        value={formData.taxId}
                        onChange={(e) => handleInputChange("taxId", e.target.value)}
                        placeholder="Tax Identification Code"
                        className="bg-slate-900 border-slate-800 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 5: BANK / PAYROLL */}
              {activeTab === "payroll" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Bank Name *</label>
                      <Input
                        value={formData.bankName}
                        onChange={(e) => handleInputChange("bankName", e.target.value)}
                        placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Account Holder Name *</label>
                      <Input
                        value={formData.accountHolderName}
                        onChange={(e) => handleInputChange("accountHolderName", e.target.value)}
                        placeholder="Full name as printed in passbook"
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Bank Account Number *</label>
                      <Input
                        value={formData.accountNumber}
                        onChange={(e) => handleInputChange("accountNumber", e.target.value)}
                        placeholder="12 to 16 digit account number"
                        className="bg-slate-900 border-slate-800 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">IFSC / Routing / SWIFT Code *</label>
                      <Input
                        value={formData.ifscOrRoutingCode}
                        onChange={(e) => handleInputChange("ifscOrRoutingCode", e.target.value.toUpperCase())}
                        placeholder="HDFC0001234"
                        className="bg-slate-900 border-slate-800 text-xs font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Branch Name & Address</label>
                      <Input
                        value={formData.branchName}
                        onChange={(e) => handleInputChange("branchName", e.target.value)}
                        placeholder="e.g. Bandra Kurla Complex (BKC)"
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Account Type</label>
                      <Select
                        value={formData.accountType}
                        onChange={(e) => handleInputChange("accountType", e.target.value)}
                        options={[
                          { value: "SALARY", label: "Corporate Salary Account" },
                          { value: "SAVINGS", label: "Savings Account" },
                          { value: "CURRENT", label: "Current Account" },
                        ]}
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">UPI ID (Optional)</label>
                      <Input
                        value={formData.upiId}
                        onChange={(e) => handleInputChange("upiId", e.target.value)}
                        placeholder="username@okhdfcbank"
                        className="bg-slate-900 border-slate-800 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 6: EMERGENCY CONTACT */}
              {activeTab === "emergency" && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                      Primary Emergency Contact *
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-300 block mb-1.5">Contact Name *</label>
                        <Input
                          value={formData.primaryContactName}
                          onChange={(e) => handleInputChange("primaryContactName", e.target.value)}
                          placeholder="Parent / Spouse / Sibling"
                          className="bg-slate-900 border-slate-800 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-300 block mb-1.5">Relationship *</label>
                        <Input
                          value={formData.primaryContactRelation}
                          onChange={(e) => handleInputChange("primaryContactRelation", e.target.value)}
                          placeholder="e.g. Father, Spouse, Sister"
                          className="bg-slate-900 border-slate-800 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-300 block mb-1.5">Emergency Phone *</label>
                        <Input
                          value={formData.primaryContactPhone}
                          onChange={(e) => handleInputChange("primaryContactPhone", e.target.value)}
                          placeholder="+91 98765 43210"
                          className="bg-slate-900 border-slate-800 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-800">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Secondary Emergency Contact (Optional)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-300 block mb-1.5">Contact Name</label>
                        <Input
                          value={formData.secondaryContactName}
                          onChange={(e) => handleInputChange("secondaryContactName", e.target.value)}
                          placeholder="Secondary contact person"
                          className="bg-slate-900 border-slate-800 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-300 block mb-1.5">Relationship</label>
                        <Input
                          value={formData.secondaryContactRelation}
                          onChange={(e) => handleInputChange("secondaryContactRelation", e.target.value)}
                          placeholder="Friend / Relative"
                          className="bg-slate-900 border-slate-800 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-300 block mb-1.5">Phone Number</label>
                        <Input
                          value={formData.secondaryContactPhone}
                          onChange={(e) => handleInputChange("secondaryContactPhone", e.target.value)}
                          placeholder="+91 98765 00000"
                          className="bg-slate-900 border-slate-800 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 7: EDUCATION */}
              {activeTab === "education" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Highest Degree / Qualification *</label>
                      <Input
                        value={formData.highestDegree}
                        onChange={(e) => handleInputChange("highestDegree", e.target.value)}
                        placeholder="e.g. B.Tech / MBA / Master of Science"
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">University / Institution *</label>
                      <Input
                        value={formData.institution}
                        onChange={(e) => handleInputChange("institution", e.target.value)}
                        placeholder="e.g. University of Mumbai, IIT, etc."
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Field of Study / Specialization</label>
                      <Input
                        value={formData.fieldOfStudy}
                        onChange={(e) => handleInputChange("fieldOfStudy", e.target.value)}
                        placeholder="Computer Science / Finance / HR"
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Graduation Year *</label>
                      <Input
                        type="number"
                        value={formData.graduationYear}
                        onChange={(e) => handleInputChange("graduationYear", e.target.value)}
                        placeholder="2020"
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Grade / Percentage / CGPA</label>
                      <Input
                        value={formData.gradeOrGpa}
                        onChange={(e) => handleInputChange("gradeOrGpa", e.target.value)}
                        placeholder="e.g. 8.5 CGPA or 82%"
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Licenses & Certifications</label>
                      <Input
                        value={formData.certifications}
                        onChange={(e) => handleInputChange("certifications", e.target.value)}
                        placeholder="AWS Architect, PMP, SHRM-CP, etc."
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 8: PROFESSIONAL DETAILS */}
              {activeTab === "professional" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Previous Employer / Organization</label>
                      <Input
                        value={formData.previousEmployer}
                        onChange={(e) => handleInputChange("previousEmployer", e.target.value)}
                        placeholder="Previous Company Name"
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Previous Role / Designation</label>
                      <Input
                        value={formData.previousDesignation}
                        onChange={(e) => handleInputChange("previousDesignation", e.target.value)}
                        placeholder="e.g. Senior Software Engineer"
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">Total Relevant Experience (Years) *</label>
                      <Input
                        type="number"
                        step="0.5"
                        value={formData.totalExperienceYears}
                        onChange={(e) => handleInputChange("totalExperienceYears", e.target.value)}
                        placeholder="e.g. 5.5"
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">LinkedIn Profile URL</label>
                      <Input
                        value={formData.linkedinUrl}
                        onChange={(e) => handleInputChange("linkedinUrl", e.target.value)}
                        placeholder="https://linkedin.com/in/username"
                        className="bg-slate-900 border-slate-800 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">Key Technical & Leadership Skills *</label>
                    <textarea
                      rows={2}
                      value={formData.skills}
                      onChange={(e) => handleInputChange("skills", e.target.value)}
                      placeholder="e.g. React, Node.js, Prisma, PostgreSQL, System Design, Agile Leadership (comma separated)"
                      className="w-full rounded-md border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">Portfolio / GitHub / Website URL</label>
                    <Input
                      value={formData.portfolioUrl}
                      onChange={(e) => handleInputChange("portfolioUrl", e.target.value)}
                      placeholder="https://github.com/username or https://myportfolio.com"
                      className="bg-slate-900 border-slate-800 text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 9: DOCUMENTS & VERIFICATION VAULT */}
              {activeTab === "documents" && (
                <div className="space-y-6">
                  {/* Document Header & Upload Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                    <div>
                      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-emerald-400" />
                        Employee Document Vault
                      </h4>
                      <p className="text-xs text-slate-400 pt-0.5">
                        Uploaded official proofs require HR review and verification before account activation.
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => setDocUploadOpen(true)}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5 shrink-0"
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      Upload New Document
                    </Button>
                  </div>

                  {/* Document Upload Drawer/Modal inline */}
                  {docUploadOpen && (
                    <form
                      onSubmit={handleUploadDocument}
                      className="rounded-xl border border-blue-500/40 bg-gradient-to-b from-blue-950/30 to-[#0f172a] p-5 space-y-4 shadow-xl"
                    >
                      <div className="flex justify-between items-center border-b border-blue-500/20 pb-3">
                        <div className="flex items-center gap-2">
                          <UploadCloud className="h-4 w-4 text-blue-400" />
                          <h5 className="text-xs font-semibold uppercase tracking-wider text-blue-300">
                            Upload Soft Copy Document for HR Verification
                          </h5>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDocUploadOpen(false);
                            setSelectedFile(null);
                            setFileError(null);
                          }}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {fileError && (
                        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                          <span>{fileError}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-slate-300 block mb-1">
                            Document Category <span className="text-red-400">*</span>
                          </label>
                          <Select
                            value={uploadDocType}
                            onChange={(e) => setUploadDocType(e.target.value)}
                            options={DOCUMENT_TYPES}
                            className="bg-slate-900 border-slate-700 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-300 block mb-1">
                            Document Display Title <span className="text-red-400">*</span>
                          </label>
                          <Input
                            required
                            value={uploadDocTitle}
                            onChange={(e) => setUploadDocTitle(e.target.value)}
                            placeholder="e.g. Aadhaar Card (Front & Back)"
                            className="bg-slate-900 border-slate-700 text-xs text-white"
                          />
                        </div>
                      </div>

                      {/* Actual File Upload Dropzone */}
                      <div>
                        <label className="text-xs font-medium text-slate-300 block mb-1.5">
                          Attach Soft Copy File <span className="text-red-400">*</span>
                          <span className="text-slate-400 font-normal ml-1.5 text-[11px]">
                            (PDF, PNG, JPG, JPEG, WEBP, DOCX • Maximum file size: 10 MB)
                          </span>
                        </label>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleFileSelect(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />

                        {!selectedFile ? (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                              isDragging
                                ? "border-blue-500 bg-blue-500/10 text-white"
                                : "border-slate-700 hover:border-blue-500/60 bg-slate-900/50 hover:bg-slate-900/80"
                            }`}
                          >
                            <UploadCloud className="h-8 w-8 text-blue-400 mx-auto mb-2 animate-pulse" />
                            <p className="text-xs font-semibold text-slate-200">
                              Click to browse or drag and drop soft copy file here
                            </p>
                            <p className="text-[11px] text-slate-400 pt-1">
                              Supports official scanned PDFs or high-resolution images up to <strong className="text-blue-400">10 MB</strong>
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-blue-500/40 bg-blue-950/40 p-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-400 shrink-0">
                                <FileCheck className="h-6 w-6" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate font-mono">
                                  {selectedFile.name}
                                </p>
                                <p className="text-[11px] text-emerald-400 flex items-center gap-1.5 pt-0.5">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                  <span>
                                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                                  </span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-xs border-slate-700 text-slate-300 hover:text-white"
                              >
                                Change File
                              </Button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedFile(null);
                                  if (fileInputRef.current) fileInputRef.current.value = "";
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Remove attached file"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        <span className="text-[11px] text-slate-400">
                          Soft copies are securely stored in the internal personnel repository.
                        </span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDocUploadOpen(false);
                              setSelectedFile(null);
                              setFileError(null);
                            }}
                            className="text-xs text-slate-400 hover:text-white"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            size="sm"
                            disabled={uploadingDoc || !selectedFile}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 gap-1.5 shadow-md shadow-blue-900/30"
                          >
                            <UploadCloud className="h-3.5 w-3.5" />
                            {uploadingDoc ? "Uploading..." : "Upload Soft Copy (10MB Max)"}
                          </Button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* Documents List */}
                  {(!employee.documents || employee.documents.length === 0) ? (
                    <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                      <FileText className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">No documents uploaded yet.</p>
                      <p className="text-[11px] text-slate-500 pt-1">
                        At least 2 documents (Govt ID and Academic/Relieving letter) are required for 100% completion.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {employee.documents.map((doc: any) => {
                        const isVerified = doc.verificationStatus === "VERIFIED";
                        const isRejected = doc.verificationStatus === "REJECTED";
                        const formattedSize = doc.fileSize
                          ? doc.fileSize >= 1048576
                            ? `${(doc.fileSize / 1048576).toFixed(2)} MB`
                            : `${Math.round(doc.fileSize / 1024)} KB`
                          : "Soft copy attached";

                        return (
                          <div
                            key={doc.id}
                            className={`rounded-xl border p-4 transition-all ${
                              isVerified
                                ? "border-emerald-500/30 bg-emerald-950/10"
                                : isRejected
                                ? "border-red-500/30 bg-red-950/10"
                                : "border-slate-800 bg-slate-900/70"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className={`p-2.5 rounded-lg shrink-0 ${
                                  isVerified ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                                }`}>
                                  <FileText className="h-5 w-5" />
                                </div>
                                <div className="space-y-1 min-w-0">
                                  <h5 className="text-xs font-bold text-white leading-tight truncate">
                                    {doc.title}
                                  </h5>
                                  <p className="text-[11px] text-slate-400 font-mono truncate">
                                    {doc.fileName} • {formattedSize}
                                  </p>
                                  <div className="pt-1 flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                      {doc.type}
                                    </span>
                                    {isVerified ? (
                                      <Badge variant="success" size="sm" className="gap-1 bg-emerald-500/20 text-emerald-300">
                                        <CheckCircle2 className="h-2.5 w-2.5" /> VERIFIED
                                      </Badge>
                                    ) : isRejected ? (
                                      <Badge variant="danger" size="sm" className="gap-1 bg-red-500/20 text-red-300">
                                        <FileX className="h-2.5 w-2.5" /> REJECTED
                                      </Badge>
                                    ) : (
                                      <Badge variant="warning" size="sm" className="gap-1 bg-amber-500/20 text-amber-300">
                                        <Clock className="h-2.5 w-2.5" /> PENDING VERIFICATION
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {doc.fileUrl && (
                                  <a
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-950/70 hover:bg-blue-900/80 text-blue-300 hover:text-white border border-blue-800/50 text-[11px] font-medium transition-colors"
                                    title="Open and view soft copy in new tab"
                                  >
                                    <Eye className="h-3 w-3 text-blue-400" />
                                    <span>View</span>
                                    <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                                  </a>
                                )}

                                <button
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  className="text-slate-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                                  title="Delete document"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Verification meta & actions */}
                            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">
                                {isVerified ? (
                                  <span className="text-emerald-400">
                                    Verified by {doc.verifiedBy || "HR"}
                                  </span>
                                ) : (
                                  <span>Uploaded {formatDate(doc.uploadedAt)}</span>
                                )}
                              </span>

                              {/* HR Action buttons */}
                              {isHrOrAdmin && (
                                <div className="flex items-center gap-1.5">
                                  {!isVerified && (
                                    <button
                                      onClick={() => {
                                        setSelectedDocForVerify(doc);
                                        setVerifyStatusAction("VERIFIED");
                                      }}
                                      className="px-2 py-1 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 transition-colors font-medium text-[11px]"
                                    >
                                      Verify
                                    </button>
                                  )}
                                  {!isRejected && (
                                    <button
                                      onClick={() => {
                                        setSelectedDocForVerify(doc);
                                        setVerifyStatusAction("REJECTED");
                                      }}
                                      className="px-2 py-1 rounded bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 transition-colors font-medium text-[11px]"
                                    >
                                      Reject
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            {doc.verificationNotes && (
                              <p className="mt-2 text-[10px] text-slate-400 italic bg-slate-950/60 p-2 rounded border border-slate-800/60">
                                Note: {doc.verificationNotes}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 10: ACCESS & PERMISSIONS */}
              {activeTab === "access" && (
                <div className="space-y-6">
                  {/* Account Settings & Role Configuration Card */}
                  <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                        <Key className="h-3.5 w-3.5 text-blue-400" />
                        CRM Authentication & RBAC Role Assignment
                      </h4>
                      <Badge variant={employee.user ? "success" : "default"} size="sm">
                        {employee.user ? "ACCOUNT CONFIGURED" : "NO SYSTEM ACCOUNT"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-200 block mb-1.5">
                          Assigned System Role (RBAC) *
                        </label>
                        <Select
                          value={formData.roleCode}
                          onChange={(e) => handleInputChange("roleCode", e.target.value)}
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
                          className="bg-slate-900 border-slate-700 text-xs text-white"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Controls navigation menus, permission scopes, and managerial approval rights.
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-200 block mb-1.5">
                          CRM Login Password (Reset / Update)
                        </label>
                        <Input
                          type="password"
                          value={formData.newPassword}
                          onChange={(e) => handleInputChange("newPassword", e.target.value)}
                          placeholder="Enter new password (min 6 chars)"
                          className="bg-slate-900 border-slate-700 text-xs text-white placeholder:text-slate-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          {employee.user
                            ? "Leave blank to keep current password. Enter 6+ characters to reset."
                            : "Enter a password to initialize CRM login credentials for this employee."}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-200 block mb-1.5">
                          Portal Account Status
                        </label>
                        <Select
                          value={formData.isUserActive ? "ACTIVE" : "INACTIVE"}
                          onChange={(e) => handleInputChange("isUserActive", e.target.value === "ACTIVE")}
                          options={[
                            { label: "Active (Sign-in enabled)", value: "ACTIVE" },
                            { label: "Suspended / Inactive (Sign-in disabled)", value: "INACTIVE" },
                          ]}
                          className="bg-slate-900 border-slate-700 text-xs text-white"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Controls whether this employee can sign into the portal.
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-200 block mb-1.5">
                          Sign-In Username / Corporate Email
                        </label>
                        <Input
                          disabled
                          value={formData.email}
                          className="bg-slate-950 border-slate-800 text-xs font-mono text-blue-400 cursor-not-allowed"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Editable under Section 1 (Personal Information).
                        </p>
                      </div>
                    </div>

                    {!employee.user && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-950/40 border border-blue-800/60 text-blue-200 text-xs">
                        <Key className="h-4 w-4 shrink-0 text-blue-400" />
                        <span>
                          This employee currently does not have a CRM system user account. Entering a password above and clicking <strong>Save</strong> will create their login account immediately.
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">System Login Account</span>
                        <Badge variant={employee.user ? "success" : "default"} size="sm">
                          {employee.user ? "CONFIGURED" : "NONE"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">{employee.email}</p>
                      <p className="text-[11px] text-slate-400">
                        Status: <strong className={employee.user?.isActive ? "text-emerald-400" : "text-amber-400"}>
                          {employee.user?.isActive ? "Active (Can log in)" : "Pending Activation (Activates on HR Approval)"}
                        </strong>
                      </p>
                      {employee.user && isHrOrAdmin && (
                        <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400">Onboarding Access:</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setResendModalOpen(true)}
                            className="text-xs border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:text-white gap-1.5"
                          >
                            <Mail className="h-3.5 w-3.5 text-blue-400" />
                            <span>Forward Credentials Email</span>
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">Current Assigned Role</span>
                        <span className="font-mono text-xs text-blue-400 font-semibold bg-blue-950 px-2 py-0.5 rounded border border-blue-800/50">
                          {employee.user?.role?.code || formData.roleCode || "EMPLOYEE"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium">
                        {employee.user?.role?.name || "Corporate Employee"} (Level {employee.user?.role?.level || 10})
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Data Scope: <strong className="text-slate-300">{employee.user?.role?.dataScope || "SELF"}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Multi-Company Membership */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-blue-400" />
                      Company Memberships & Scopes
                    </h5>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-300 font-medium bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                        🏢 {employee.organization?.name || "Corporate Enterprise"} (Primary)
                      </span>
                    </div>
                  </div>

                  {/* Permissions Breakdown Preview */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Key className="h-3.5 w-3.5 text-amber-400" />
                        Role Permission Grants ({employee.user?.role?.rolePermissions?.length || 0})
                      </h5>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-2">
                      {employee.user?.role?.rolePermissions?.length > 0 ? (
                        employee.user.role.rolePermissions.map((rp: any) => (
                          <span
                            key={rp.id}
                            className="font-mono text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700/60"
                          >
                            {rp.permission?.code || rp.permissionId}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          Standard employee self-service permissions (Attendance, Leave Requests, Assigned Tasks, Profile View)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* DOCUMENT VERIFICATION MODAL */}
      {selectedDocForVerify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#0f172a] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {verifyStatusAction === "VERIFIED" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <FileX className="h-4 w-4 text-red-400" />
                )}
                {verifyStatusAction === "VERIFIED" ? "Verify Document" : "Reject Document"}
              </h3>
              <button
                onClick={() => setSelectedDocForVerify(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-300 font-medium">Document: {selectedDocForVerify.title}</p>
              <p className="text-slate-400 font-mono text-[11px]">{selectedDocForVerify.fileName}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Verification Notes / Review Comments (Optional)
              </label>
              <textarea
                rows={3}
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                placeholder={
                  verifyStatusAction === "VERIFIED"
                    ? "Verified against original government records. Matches employee identity."
                    : "Document illegible or information mismatch. Please re-upload clear proof."
                }
                className="w-full rounded-md border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDocForVerify(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={verifyingDoc}
                onClick={handleVerifyDocument}
                className={`text-white text-xs ${
                  verifyStatusAction === "VERIFIED"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-red-600 hover:bg-red-500"
                }`}
              >
                {verifyingDoc ? "Updating..." : `Confirm ${verifyStatusAction}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* HR APPROVAL MODAL */}
      {approvalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-emerald-500/40 bg-[#0f172a] p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-400" />
                HR Final Approval & Account Activation
              </h3>
              <button
                onClick={() => setApprovalModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Checklist */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2.5 text-xs">
              <h4 className="font-semibold text-slate-300">Approval Readiness Checklist:</h4>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Employee Profile Dossier
                </span>
                <span className="font-mono font-bold text-emerald-400">{score}% Complete</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  {employee.documents?.length > 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  )}
                  Verification Documents
                </span>
                <span>{employee.documents?.length || 0} in Vault</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  System Login Account
                </span>
                <span className="text-blue-400 font-mono">{employee.email}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Official HR Approval Endorsement Note
              </label>
              <textarea
                rows={2}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="All credentials and verification criteria satisfied..."
                className="w-full rounded-md border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {approvalCompleted ? (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-300 text-center text-xs font-semibold animate-pulse">
                🎉 Employee Account Approved & Activated Successfully!
              </div>
            ) : (
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setApprovalModalOpen(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={approving}
                  onClick={handleApproveEmployee}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 gap-1.5 shadow-lg shadow-emerald-900/30"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {approving ? "Approving..." : "Confirm & Activate Employee"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resend Credentials Email Modal */}
      {resendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#0f172a] p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <Mail className="h-5 w-5 text-blue-400" />
              <div>
                <h3 className="text-sm font-semibold text-white">Forward Login Credentials Email</h3>
                <p className="text-xs text-slate-400">Send or reset login details to {employee.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                This will dispatch an official welcome email containing the employee&apos;s Login ID, password, and portal sign-in URL so they can access the CRM.
              </p>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Assign New Password (optional)
                </label>
                <input
                  type="password"
                  value={resendPassword}
                  onChange={(e) => setResendPassword(e.target.value)}
                  placeholder="Leave empty to use Enterprise@2026"
                  className="w-full rounded-md border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  If set, updates the employee&apos;s password and emails the new credentials.
                </p>
              </div>

              {resendError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <span>{resendError}</span>
                </div>
              )}

              {resendSuccess && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{resendSuccess}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setResendModalOpen(false);
                  setResendError(null);
                  setResendSuccess(null);
                }}
                disabled={resendingMail}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleResendCredentials}
                disabled={resendingMail}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-4 gap-1.5 shadow-md shadow-blue-900/30"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{resendingMail ? "Dispatching..." : "Send Credentials Email"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteConfirmOpen(false);
            setDeleteError(null);
          }
        }}
        onConfirm={handleDeleteEmployee}
        title="Confirm Employee Deletion"
        message={
          deleteError
            ? `Error: ${deleteError}`
            : `Are you sure you want to permanently delete ${employee.firstName} ${employee.lastName} (${employee.employeeNumber})? All associated credentials, operational records, and HR profile records will be permanently removed.`
        }
        confirmLabel={deleting ? "Deleting..." : "Delete Employee"}
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
