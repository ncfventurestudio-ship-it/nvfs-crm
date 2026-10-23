"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  User,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Building2,
  GraduationCap,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Clock,
  HeartHandshake,
} from "lucide-react";

function OnboardingFormContent() {
  const searchParams = useSearchParams();
  const rawOrg = (searchParams.get("org") || "NFVS").toUpperCase();
  const isNF = rawOrg === "NF" || rawOrg === "NAREE";
  const orgCode = isNF ? "NF" : "NFVS";
  const companyName = isNF ? "Naree Foundation" : "Naree Foundation Venture Studio";

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    aadhaarNumber: "",
    gender: "MALE",
    maritalStatus: "SINGLE",
    bloodGroup: "O+",
    currentAddress: "",
    permanentAddress: "",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "Parent",
    highestDegree: "Bachelor's Degree",
    institution: "",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live Employee ID estimate preview
  const joiningYear = new Date().getFullYear();
  let birthDayPreview = "DD";
  if (formData.dateOfBirth) {
    const parts = formData.dateOfBirth.split("-");
    if (parts.length === 3) birthDayPreview = parts[2];
  }
  let aadhaarLast4Preview = "XXXX";
  if (formData.aadhaarNumber) {
    const digits = formData.aadhaarNumber.replace(/\D/g, "");
    if (digits.length >= 4) aadhaarLast4Preview = digits.slice(-4);
  }
  const idPreview = `${orgCode}-${joiningYear}-${birthDayPreview}-${aadhaarLast4Preview}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          orgCode,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to submit information");
      }

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while submitting.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-8 shadow-2xl text-center space-y-6 animate-fadeIn backdrop-blur-xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/50">
              Submission Received
            </span>
            <h2 className="text-2xl font-bold text-white pt-2">Thank You, {formData.firstName}!</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your pre-onboarding personnel dossier has been securely transmitted to the Human Resources department at <strong>{companyName}</strong>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-left space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Target Organization</span>
              <span className="font-semibold text-slate-200">{companyName}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Corporate Email Contact</span>
              <span className="font-mono text-blue-400">{formData.email}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
              <span className="text-slate-500">Projected Employee ID</span>
              <span className="font-mono font-bold text-emerald-400">{idPreview}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 text-left flex items-start gap-2.5">
            <Clock className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
            <span>
              <strong>What Happens Next:</strong> HR will review your submission and configure your department and designation. Once approved, you will receive an official welcome email containing your <strong>Employee ID</strong>, <strong>login password</strong>, and portal link to begin onboarding.
            </span>
          </div>

          <p className="text-[11px] text-slate-500">
            You may safely close this browser window.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Background radial glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-600/10 blur-[130px] rounded-full"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-indigo-600/10 blur-[120px] rounded-full"></div>
      </div>

      {/* Header */}
      <header className="border-b border-slate-800/70 bg-slate-950/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              {orgCode === "NFVS" ? "VS" : "NF"}
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-tight">{companyName}</div>
              <div className="text-[10px] text-blue-400 uppercase tracking-widest font-semibold">
                HR Pre-Onboarding Intake
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-blue-950/80 border border-blue-800/60 text-blue-300">
              Official Form
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto px-4 py-8 flex-1">
        {/* Intro Banner */}
        <div className="mb-8 rounded-2xl border border-blue-500/25 bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/30 p-6 shadow-xl relative overflow-hidden">
          <div className="space-y-2 relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 text-xs font-medium border border-blue-500/30">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Employee Self-Registration Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome to {companyName}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Please complete this pre-onboarding form. Your details will be routed to HR to initialize your personnel record and auto-generate your corporate credentials.
            </p>
          </div>

          {/* Live ID Preview Box */}
          <div className="mt-5 p-3.5 rounded-xl bg-black/40 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Projected Corporate ID Format
                </div>
                <div className="text-base font-mono font-bold text-emerald-400 tracking-wide">
                  {idPreview}
                </div>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-2">
              <span className="text-blue-300 font-mono">[{orgCode}]</span> Company &bull;
              <span className="text-blue-300 font-mono">[{joiningYear}]</span> Year &bull;
              <span className="text-blue-300 font-mono">[{birthDayPreview}]</span> Birthday &bull;
              <span className="text-blue-300 font-mono">[{aadhaarLast4Preview}]</span> Aadhaar
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-200 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <div className="font-semibold text-rose-100">Submission Error</div>
              <div>{error}</div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Basic Identity */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
              <User className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-semibold text-white">1. Personal Details</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  First Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Atharv"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Last Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Narawade"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Date of Birth <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Used for official ID: Day <strong>{birthDayPreview}</strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="NON_BINARY">Non-Binary</option>
                  <option value="OTHER">Other / Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Blood Group
                </label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                >
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Identification & Government Details */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
              <CreditCard className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-semibold text-white">2. Government Identity Card</h2>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Aadhaar Card Number (12 Digits) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 1234 5678 8999"
                value={formData.aadhaarNumber}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^\d\s]/g, "");
                  setFormData({ ...formData, aadhaarNumber: cleaned });
                }}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-mono tracking-wider"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Last 4 digits <strong>[{aadhaarLast4Preview}]</strong> will form the final part of your Employee ID.
              </span>
            </div>
          </div>

          {/* Section 3: Contact & Address */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
              <MapPin className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-semibold text-white">3. Contact &amp; Residential Address</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email Address (For CRM Credentials) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="atharvnarawade@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Mobile Phone Number <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Current Residential Address
              </label>
              <textarea
                rows={2}
                placeholder="House / Flat No., Street, Area / Locality"
                value={formData.currentAddress}
                onChange={(e) => setFormData({ ...formData, currentAddress: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Postal Code</label>
                <input
                  type="text"
                  placeholder="400001"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Emergency Contact & Education */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
              <HeartHandshake className="w-5 h-5 text-rose-400" />
              <h2 className="text-base font-semibold text-white">4. Emergency Contact &amp; Education</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Narawade"
                  value={formData.emergencyContactName}
                  onChange={(e) =>
                    setFormData({ ...formData, emergencyContactName: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Relationship
                </label>
                <input
                  type="text"
                  placeholder="Father / Spouse / Sibling"
                  value={formData.emergencyContactRelation}
                  onChange={(e) =>
                    setFormData({ ...formData, emergencyContactRelation: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Emergency Contact Phone
                </label>
                <input
                  type="tel"
                  placeholder="+91 98000 00000"
                  value={formData.emergencyContactPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, emergencyContactPhone: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Highest Educational Qualification
                </label>
                <input
                  type="text"
                  placeholder="e.g. B.Tech / B.Sc / MBA"
                  value={formData.highestDegree}
                  onChange={(e) => setFormData({ ...formData, highestDegree: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  University / Institution Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai University"
                  value={formData.institution}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              By submitting this form, you verify that all supplied details are accurate and authorize HR processing.
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Transmitting to HR...</span>
                </>
              ) : (
                <>
                  <span>Submit Pre-Onboarding Dossier</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-600">
        &copy; 2026 {companyName}. Confidential Pre-Employment Intake Portal.
      </footer>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
          Loading pre-onboarding portal...
        </div>
      }
    >
      <OnboardingFormContent />
    </Suspense>
  );
}
