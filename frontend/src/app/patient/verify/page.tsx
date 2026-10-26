"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Globe,
  Mail,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
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

function PatientVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTarget = searchParams.get("target") || "";

  const { currentLanguage, setLanguageCode, t } = useLanguage();
  const { simpleView, speakText } = useAccessibility();

  const [identifier, setIdentifier] = useState(initialTarget);
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [demoCodeNotice, setDemoCodeNotice] = useState<string | null>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const handleSendCode = async () => {
    if (!identifier.trim()) {
      setError("Please enter your mobile number or email address.");
      return;
    }
    setLoading(true);
    setError(null);
    setDemoCodeNotice(null);

    try {
      const res = await api.post<any>("/auth/send-otp", {
        identifier: identifier.trim(),
        purpose: "REGISTRATION",
      });
      setCountdown(45);
      if (res.demo_otp) {
        setDemoCodeNotice(res.demo_otp);
      }
      speakText("Verification code sent successfully.");
    } catch (err: any) {
      setError(err?.message || "Failed to dispatch verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !code.trim()) {
      setError("Please provide both your contact number/email and the 6-digit code.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await api.post<any>("/auth/verify-otp", {
        identifier: identifier.trim(),
        code: code.trim(),
        purpose: "REGISTRATION",
      });
      setSuccess(true);
      speakText("Verification successful.");
      setTimeout(() => {
        router.push("/patient/login");
      }, 2000);
    } catch (err: any) {
      setError(err?.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#e1f2f6] text-slate-800 flex flex-col justify-between p-3 sm:p-6 font-sans">
      <header className="max-w-md w-full mx-auto flex items-center justify-between py-2">
        <Link
          href="/patient/login"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white/90 px-3 py-1.5 rounded-full shadow-xs border border-teal-200/60"
        >
          <ArrowLeft className="w-4 h-4 text-teal-600" />
          <span>Back to Sign In</span>
        </Link>
      </header>

      <main className="max-w-md w-full mx-auto my-auto">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-teal-100 text-center">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Account Verification
          </h1>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            Confirm your registered mobile number or email address to activate your patient identity.
          </p>

          {error && (
            <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 text-left">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-bold">Contact verified! Redirecting to sign in...</span>
            </div>
          )}

          {demoCodeNotice && (
            <div className="p-3 mb-4 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-800 flex items-center justify-between">
              <span>Code: <strong className="font-mono text-sm">{demoCodeNotice}</strong></span>
              <span className="text-[10px] text-teal-600 font-bold uppercase">10m valid</span>
            </div>
          )}

          <form onSubmit={handleVerifyCode} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number or Email Address
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. 9876543210 or yourname@patient.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  6-Digit Verification Code
                </label>
                {countdown > 0 ? (
                  <span className="text-[11px] text-slate-400">Resend in {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={loading}
                    className="text-[11px] font-semibold text-teal-600 hover:underline"
                  >
                    Request Code
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 583192"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-center font-mono text-lg tracking-widest text-slate-900 focus:outline-none focus:border-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 mt-4"
            >
              <span>{loading ? "Verifying..." : "Confirm & Activate"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      <footer className="max-w-md w-full mx-auto text-center text-xs text-slate-500 py-2">
        CareFlow Healthcare • Verification Security Gateway
      </footer>
    </div>
  );
}

export default function PatientVerifyPage() {
  return (
    <LanguageProvider>
      <AccessibilityProvider>
        <Suspense
          fallback={
            <div className="min-h-screen bg-[#e1f2f6] text-slate-700 flex flex-col items-center justify-center p-4">
              <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-semibold text-slate-600">Loading verification portal...</p>
            </div>
          }
        >
          <PatientVerifyContent />
        </Suspense>
      </AccessibilityProvider>
    </LanguageProvider>
  );
}

