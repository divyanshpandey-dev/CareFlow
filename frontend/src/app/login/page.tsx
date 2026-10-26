"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  HeartPulse,
  Hospital,
  Lock,
  Mail,
  Phone,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
  Volume2,
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

const ROLE_PRESETS = [
  {
    role: "PATIENT",
    title: "Patient",
    name: "Rahul Verma",
    id: "rahul@patient.com",
    pass: "password123",
    badge: "ABDM Record",
    icon: User,
  },
  {
    role: "DOCTOR",
    title: "Doctor",
    name: "Dr. Ananya Sharma",
    id: "dr.ananya@citycare.com",
    pass: "password123",
    badge: "Cardiology OPD",
    icon: Stethoscope,
  },
  {
    role: "HOSPITAL_ADMIN",
    title: "Hospital Admin",
    name: "Amitabh Sen",
    id: "amit.admin@maxhealthcare.in",
    pass: "password123",
    badge: "Facility Control",
    icon: Hospital,
  },
  {
    role: "SUPER_ADMIN",
    title: "Super Admin",
    name: "Platform Chief",
    id: "edure6377@gmail.com",
    pass: "CareFlowAdmin#2026",
    badge: "Platform Governance",
    icon: ShieldCheck,
  },
];

function CareflowCrossLogo({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Center core */}
      <rect x="16" y="16" width="12" height="12" rx="3.5" fill="#0D9488" />
      {/* Top arm */}
      <rect x="16" y="4" width="12" height="9" rx="3" fill="#14B8A6" />
      {/* Bottom arm */}
      <rect x="16" y="31" width="12" height="9" rx="3" fill="#14B8A6" />
      {/* Left arm */}
      <rect x="4" y="16" width="9" height="12" rx="3" fill="#14B8A6" />
      {/* Right arm */}
      <rect x="31" y="16" width="9" height="12" rx="3" fill="#14B8A6" />
      {/* Corner accent beads */}
      <circle cx="9" cy="9" r="2.5" fill="#5EEAD4" />
      <circle cx="35" cy="9" r="2.5" fill="#5EEAD4" />
      <circle cx="9" cy="35" r="2.5" fill="#5EEAD4" />
      <circle cx="35" cy="35" r="2.5" fill="#5EEAD4" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const roleParam = searchParams.get("role");

  const { currentLanguage, setLanguageCode, t } = useLanguage();
  const { simpleView, setSimpleView, speakText } = useAccessibility();

  const [identifier, setIdentifier] = useState("rahul@patient.com");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [selectedRole, setSelectedRole] = useState(roleParam || "PATIENT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (roleParam) {
      const match = ROLE_PRESETS.find((p) => p.role === roleParam);
      if (match) {
        setSelectedRole(match.role);
        setIdentifier(match.id);
        setPassword(match.pass);
      }
    }
  }, [roleParam]);

  const handleSelectPreset = (preset: (typeof ROLE_PRESETS)[0]) => {
    setSelectedRole(preset.role);
    setIdentifier(preset.id);
    setPassword(preset.pass);
    setError(null);
    speakText(`Selected ${preset.title} profile`);
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

      // ZERO-TRUST ROUTING: Dictated STRICTLY by the backend-authenticated user role
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
      } else if (authenticatedRole === "RECEPTIONIST") {
        destination = "/hospital-admin/queue";
      } else {
        destination =
          redirectUrl && redirectUrl.startsWith("/patient")
            ? redirectUrl
            : "/patient/dashboard";
      }

      speakText(`Welcome, login successful. Loading ${authenticatedRole}`);
      router.push(destination);
    } catch (err: any) {
      setError(
        err?.message ||
          "Invalid credentials. Please verify your email/phone and password."
      );
      speakText("Login failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#e1f2f6] text-slate-800 flex flex-col justify-between p-3 sm:p-6 lg:p-8 font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Top Header: Back Arrow, Brand & Accessibility / Language Controls */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between gap-3 py-2 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Back Arrow button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white/90 hover:bg-white hover:text-teal-700 px-3.5 py-2 rounded-full shadow-xs border border-teal-200/60 transition-all hover:shadow-sm"
            title="Go back to Home"
          >
            <ArrowLeft className="w-4 h-4 text-teal-600" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Back</span>
          </Link>

          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-teal-200/80">
            <span className="font-bold text-sm tracking-wide text-slate-900">CareFlow</span>
            <span className="text-[10px] bg-teal-100 text-teal-800 font-semibold px-2 py-0.5 rounded-full">
              HEALTHCARE SECURE PORTAL
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
              {simpleView ? t("normal_view", "Standard") : t("simple_view", "Simple View")}
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
                "Welcome to CareFlow Healthcare. Click your role card or enter your registered mobile number or email and password to sign in."
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
            {/* Ambient Background Circles & Cross Accents */}
            <div className="w-72 h-72 rounded-full bg-teal-100/40 absolute -top-12 -left-12 blur-2xl pointer-events-none" />
            <div className="w-64 h-64 rounded-full bg-cyan-100/50 absolute -bottom-10 -right-10 blur-xl pointer-events-none" />

            {/* Decorative Floating Cross Badges */}
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
            <div className="relative z-10 w-full max-w-[380px] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/medical-team-illustration-transparent.png"
                alt="CareFlow Healthcare Medical Team"
                className="w-full h-auto max-h-[360px] object-contain drop-shadow-md transition-transform duration-500 hover:scale-[1.02]"
              />
            </div>

            {/* Slogan & Supporting Text */}
            <div className="relative z-10 mt-4 space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                CareFlow Healthcare Network
              </h2>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Connecting patients, doctors & hospitals seamlessly with real-time queues and verified records.
              </p>
            </div>
          </div>

          {/* Right Column: Clean, Elegant Login Form */}
          <div className="md:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
            {/* Logo, Title & Subtitle */}
            <div className="flex flex-col items-center text-center mb-5">
              <CareflowCrossLogo className="w-10 h-10 mb-2 drop-shadow-xs" />
              <span className="text-[11px] font-extrabold tracking-[0.22em] text-teal-700 uppercase">
                CAREFLOW
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2.5">
                {t("welcome_back", "Welcome Back")}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {t("welcome_subtitle", "Welcome back! Please enter your details.")}
              </p>
            </div>

            {/* 1-Click Role Switcher Pills */}
            <div className="mb-5">
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5 px-0.5">
                <span className="font-semibold text-slate-700">Quick Access Role:</span>
                <span className="text-teal-600 font-medium">Auto-fills credentials</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-50 border border-slate-200/90 rounded-2xl">
                {ROLE_PRESETS.map((preset) => {
                  const isSelected = selectedRole === preset.role;
                  return (
                    <button
                      key={preset.role}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold transition-all text-center truncate ${
                        isSelected
                          ? "bg-teal-600 text-white shadow-sm ring-1 ring-teal-500"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white"
                      }`}
                      title={`${preset.title}: ${preset.name} (${preset.id})`}
                    >
                      {preset.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="leading-tight">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t("phone_or_email", "Email or Phone")}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter email or 10-digit mobile"
                    className={`w-full pl-10 pr-3.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-3 focus:ring-teal-100 transition-all ${
                      simpleView ? "py-3 text-base min-h-[48px]" : "py-2.5 min-h-[42px]"
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    {t("password", "Password")}
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
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

              {/* Remember me & Forgot Password */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 border-slate-300 focus:ring-teal-500"
                  />
                  <span>Remember for 30 days</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    alert(
                      "For demo recovery, simply click one of the quick role presets above (Patient, Doctor, Hospital Admin, Super Admin) to restore default access credentials."
                    )
                  }
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
                  {loading
                    ? t("logging_in", "Signing in securely...")
                    : t("sign_in", "LOG IN")}
                </span>
                {!loading && <ArrowRight className="w-4 h-4 stroke-[2.5]" />}
              </button>
            </form>

            {/* Patient Portal & Sign Up Callout */}
            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5 text-center">
              <div className="p-3 rounded-2xl bg-teal-50/80 border border-teal-200/70 flex flex-col sm:flex-row items-center justify-between gap-2 text-left">
                <div>
                  <span className="text-xs font-bold text-teal-950 block">Dedicated Patient Portal</span>
                  <span className="text-[11px] text-teal-700">Clean, patient-only login & registrations</span>
                </div>
                <Link
                  href="/patient/login"
                  className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold px-3.5 py-1.5 rounded-xl shadow-xs whitespace-nowrap self-stretch sm:self-auto text-center"
                >
                  Open Patient Portal &rarr;
                </Link>
              </div>

              <p className="text-xs text-slate-500 pt-1">
                New patient?{" "}
                <Link
                  href="/patient/register"
                  className="text-teal-600 font-bold hover:text-teal-700 hover:underline transition-colors"
                >
                  Register as New Patient
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Global Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center text-xs text-slate-500 py-2">
        <p>
          CareFlow Healthcare Operating Layer • NRCeS FHIR R4 & ABDM M1/M2/M3 Compliant • Zero-Trust Role Verification
        </p>
      </footer>
    </div>
  );
}

export default function UnifiedLoginPage() {
  return (
    <LanguageProvider>
      <AccessibilityProvider>
        <Suspense
          fallback={
            <div className="min-h-screen bg-[#e1f2f6] text-slate-700 flex flex-col items-center justify-center p-4">
              <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-semibold text-slate-600">
                Loading secure authorization portal...
              </p>
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </AccessibilityProvider>
    </LanguageProvider>
  );
}
