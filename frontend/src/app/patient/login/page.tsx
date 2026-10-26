"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  HeartPulse,
  KeyRound,
  Lock,
  Mail,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Volume2,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  INDIAN_LANGUAGES,
  LanguageProvider,
  useLanguage,
} from "@/context/LanguageContext";
import {
  AccessibilityProvider,
  useAccessibility,
} from "@/context/AccessibilityContext";

function CareflowPatientCrossLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="16" y="16" width="12" height="12" rx="3.5" fill="#0D9488" />
      <rect x="16" y="4" width="12" height="9" rx="3" fill="#14B8A6" />
      <rect x="16" y="31" width="12" height="9" rx="3" fill="#14B8A6" />
      <rect x="4" y="16" width="9" height="12" rx="3" fill="#14B8A6" />
      <rect x="31" y="16" width="9" height="12" rx="3" fill="#14B8A6" />
      <circle cx="9" cy="9" r="2.5" fill="#5EEAD4" />
      <circle cx="35" cy="9" r="2.5" fill="#5EEAD4" />
      <circle cx="9" cy="35" r="2.5" fill="#5EEAD4" />
      <circle cx="35" cy="35" r="2.5" fill="#5EEAD4" />
    </svg>
  );
}

function PatientLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");

  const { currentLanguage, setLanguageCode, t } = useLanguage();
  const { simpleView, setSimpleView, speakText } = useAccessibility();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot Password / Recovery Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetStep, setResetStep] = useState<"REQUEST" | "VERIFY">("REQUEST");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);
  const [resetErrorMsg, setResetErrorMsg] = useState<string | null>(null);
  const [demoCodeNotice, setDemoCodeNotice] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Please enter your registered mobile number or email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post<any>("/auth/login", {
        identifier: identifier.trim(),
        password: password,
      });

      if (!res.access_token) {
        throw new Error("Invalid response from authorization server.");
      }

      api.setToken(res.access_token);

      const authenticatedRole = res.user?.role;
      let destination = "/patient/dashboard";

      if (authenticatedRole === "SUPER_ADMIN") {
        destination = "/admin";
      } else if (authenticatedRole === "HOSPITAL_ADMIN") {
        destination = "/hospital-admin";
      } else if (authenticatedRole === "DOCTOR") {
        destination = "/doctor/cockpit";
      } else if (authenticatedRole === "LAB_TECH") {
        destination = "/lab";
      } else {
        destination =
          redirectUrl && redirectUrl.startsWith("/patient")
            ? redirectUrl
            : "/patient/dashboard";
      }

      speakText("Sign in successful. Loading your healthcare journey.");
      router.push(destination);
    } catch (err: any) {
      setError(
        err?.message ||
          "Invalid mobile number, email, or password. Please verify your credentials."
      );
      speakText("Login failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetIdentifier.trim()) {
      setResetErrorMsg("Please enter your registered mobile number or email address.");
      return;
    }
    setResetLoading(true);
    setResetErrorMsg(null);
    setDemoCodeNotice(null);

    try {
      const res = await api.post<any>("/auth/send-otp", {
        identifier: resetIdentifier.trim(),
        purpose: "PASSWORD_CHANGE",
      });
      setResetStep("VERIFY");
      setResetSuccessMsg("Verification code dispatched to " + resetIdentifier.trim());
      if (res.demo_otp) {
        setDemoCodeNotice(res.demo_otp);
      }
    } catch (err: any) {
      setResetErrorMsg(err?.message || "Failed to dispatch verification code. Please check details.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode.trim() || newPassword.length < 6) {
      setResetErrorMsg("Please enter the 6-digit code and a new password (min 6 characters).");
      return;
    }
    setResetLoading(true);
    setResetErrorMsg(null);

    try {
      await api.post<any>("/auth/reset-password", {
        identifier: resetIdentifier.trim(),
        code: resetCode.trim(),
        new_password: newPassword,
      });
      setResetSuccessMsg("Password reset successfully. You can now log in.");
      setTimeout(() => {
        setShowForgotModal(false);
        setResetStep("REQUEST");
        setResetSuccessMsg(null);
        setPassword(newPassword);
        setIdentifier(resetIdentifier);
      }, 1800);
    } catch (err: any) {
      setResetErrorMsg(err?.message || "Invalid or expired verification code.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#e1f2f6] text-slate-800 flex flex-col justify-between p-3 sm:p-6 lg:p-8 font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Top Header: Back Link & Accessibility / Language Controls */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between gap-3 py-2 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white/90 hover:bg-white hover:text-teal-700 px-3.5 py-2 rounded-full shadow-xs border border-teal-200/60 transition-all hover:shadow-sm"
            title="Return to CareFlow Homepage"
          >
            <ArrowLeft className="w-4 h-4 text-teal-600" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Back</span>
          </Link>

          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-teal-200/80">
            <span className="font-bold text-sm tracking-wide text-slate-900">CareFlow</span>
            <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              DEDICATED PATIENT PORTAL
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Simple View / Accessibility Toggle */}
          <button
            onClick={() => setSimpleView((prev) => !prev)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
              simpleView
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "bg-white/90 border border-teal-200/60 text-slate-700 hover:text-teal-700 hover:bg-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span suppressHydrationWarning>
              {simpleView ? t("normal_view", "Standard") : t("simple_view", "Simple / Elder View")}
            </span>
          </button>

          {/* 22 Indian Languages Dropdown */}
          <div className="flex items-center bg-white/90 border border-teal-200/60 rounded-full px-3 py-1 text-xs shadow-xs hover:bg-white transition-colors">
            <Globe className="w-3.5 h-3.5 text-teal-600 mr-1.5 shrink-0" />
            <select
              aria-label="Interface Language"
              value={currentLanguage.code}
              onChange={(e) => setLanguageCode(e.target.value)}
              className="bg-transparent text-xs text-slate-800 font-medium outline-none cursor-pointer pr-1"
            >
              {INDIAN_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-white text-slate-800">
                  {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
          </div>

          {/* Voice Prompt Help */}
          <button
            onClick={() =>
              speakText(
                "Welcome to CareFlow Patient Portal. Enter your registered mobile number or email address and password to sign in. If you are a new patient, click Register as New Patient."
              )
            }
            className="p-2 rounded-full bg-white/90 border border-teal-200/60 text-slate-600 hover:text-teal-600 hover:bg-white shadow-xs transition-colors"
            title="Read instructions aloud"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container: Wide Central Card with Two-Column Split Layout */}
      <main className="max-w-5xl w-full mx-auto my-6 sm:my-8">
        <div className="bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl shadow-teal-950/10 border border-teal-100 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
          {/* Left Column: Healthcare Team Illustration with Organic Accents */}
          <div className="md:col-span-6 bg-[#edf8fa] p-8 sm:p-10 flex flex-col items-center justify-center relative overflow-hidden text-center border-b md:border-b-0 md:border-r border-teal-100/60">
            <div className="w-72 h-72 rounded-full bg-teal-100/40 absolute -top-12 -left-12 blur-2xl pointer-events-none" />
            <div className="w-64 h-64 rounded-full bg-cyan-100/50 absolute -bottom-10 -right-10 blur-xl pointer-events-none" />

            <div className="absolute top-8 left-8 w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-400/30 flex items-center justify-center text-teal-600 shadow-xs">
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>
            <div className="absolute bottom-10 left-12 w-6 h-6 rounded-lg bg-teal-500/15 flex items-center justify-center text-teal-600">
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <div className="absolute top-12 right-10 w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-600">
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </div>

            {/* Medical Team Graphic */}
            <div className="relative z-10 w-full max-w-[360px] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/medical-team-illustration-transparent.png"
                alt="CareFlow Healthcare Medical Team"
                className="w-full h-auto max-h-[340px] object-contain drop-shadow-md transition-transform duration-500 hover:scale-[1.02]"
              />
            </div>

            {/* Slogan & Supporting Text */}
            <div className="relative z-10 mt-4 space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                Your Health, Connected in One Place
              </h2>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Access your doctor appointments, digital prescriptions, lab results, and longitudinal care journey with zero hassle.
              </p>
            </div>
          </div>

          {/* Right Column: Clean, Dedicated Patient Login Form */}
          <div className="md:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
            <div className="flex flex-col items-center text-center mb-6">
              <CareflowPatientCrossLogo className="w-10 h-10 mb-2 drop-shadow-xs" />
              <span className="text-[11px] font-extrabold tracking-[0.22em] text-teal-700 uppercase">
                CAREFLOW PATIENT PORTAL
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2.5">
                {t("patient_login", "Patient Sign In")}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Enter your registered mobile number or email address to access your records.
              </p>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="p-3.5 mb-5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="leading-tight">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Registered Mobile Number or Email Address
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. 9876543210 or yourname@patient.com"
                    className={`w-full pl-10 pr-3.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-3 focus:ring-teal-100 transition-all ${
                      simpleView ? "py-3 text-base min-h-[48px]" : "py-2.5 min-h-[42px]"
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your account password"
                    className={`w-full pl-10 pr-10 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-3 focus:ring-teal-100 transition-all ${
                      simpleView ? "py-3 text-base min-h-[48px]" : "py-2.5 min-h-[42px]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 border-slate-300 focus:ring-teal-500"
                  />
                  <span>Keep me signed in</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setResetIdentifier(identifier);
                    setResetErrorMsg(null);
                    setResetSuccessMsg(null);
                  }}
                  className="text-teal-600 hover:text-teal-700 font-semibold transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-60 text-white font-bold tracking-wider uppercase text-xs shadow-md shadow-teal-600/25 transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer ${
                  simpleView ? "py-4 text-base min-h-[52px]" : "py-3 min-h-[44px]"
                }`}
              >
                <span>
                  {loading ? "Verifying Credentials..." : "LOG IN TO PATIENT PORTAL"}
                </span>
                {!loading && <ArrowRight className="w-4 h-4 stroke-[2.5]" />}
              </button>
            </form>

            {/* Register Action Callout */}
            <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
              <div className="text-center">
                <span className="text-xs text-slate-500">First time at CareFlow? </span>
                <Link
                  href="/patient/register"
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline"
                >
                  Register as New Patient
                </Link>
              </div>

              {/* Professional Portal Link (Doctor / Admin) */}
              <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                <p className="text-[11px] text-slate-500">
                  Are you a Doctor, Hospital Operator, or Super Admin?{" "}
                  <Link
                    href="/login"
                    className="text-teal-700 font-bold hover:underline"
                  >
                    Use Professional Portal
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Reset Password</h3>
                <p className="text-xs text-slate-500">Verified identity recovery</p>
              </div>
            </div>

            {resetSuccessMsg && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resetSuccessMsg}</span>
              </div>
            )}

            {resetErrorMsg && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{resetErrorMsg}</span>
              </div>
            )}

            {demoCodeNotice && (
              <div className="p-3 mb-4 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-800 flex items-center justify-between">
                <span>Verification Code: <strong className="font-mono text-sm">{demoCodeNotice}</strong></span>
                <span className="text-[10px] text-teal-600 uppercase font-bold">Valid for 10m</span>
              </div>
            )}

            {resetStep === "REQUEST" ? (
              <form onSubmit={handleSendResetCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registered Mobile or Email
                  </label>
                  <input
                    type="text"
                    required
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                    placeholder="Enter 10-digit mobile or email"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    We will send a one-time 6-digit verification code.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5"
                  >
                    {resetLoading ? "Sending Code..." : "Send Verification Code"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleConfirmReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="e.g. 583192"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono text-center tracking-widest text-slate-900 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setResetStep("REQUEST")}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    &larr; Back
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5"
                  >
                    {resetLoading ? "Updating..." : "Save New Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Global Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center text-xs text-slate-500 py-2">
        <p>
          CareFlow Healthcare Platform • DPDP Act 2023 & Ayushman Bharat Digital Mission (ABDM) Compliant
        </p>
      </footer>
    </div>
  );
}

export default function PatientLoginPage() {
  return (
    <LanguageProvider>
      <AccessibilityProvider>
        <Suspense
          fallback={
            <div className="min-h-screen bg-[#e1f2f6] text-slate-700 flex flex-col items-center justify-center p-4">
              <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-semibold text-slate-600">
                Loading dedicated patient portal...
              </p>
            </div>
          }
        >
          <PatientLoginForm />
        </Suspense>
      </AccessibilityProvider>
    </LanguageProvider>
  );
}

