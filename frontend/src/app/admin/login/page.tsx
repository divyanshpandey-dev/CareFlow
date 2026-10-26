"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Activity,
  Eye,
  EyeOff,
  Zap,
  Shield,
  LockKeyhole,
} from "lucide-react";
import { api } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Please provide both email address and administrator password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post<{
        access_token: string;
        token_type: string;
        user: {
          id: string;
          email?: string;
          role: string;
          full_name: string;
          is_active: boolean;
        };
      }>("/auth/login", {
        identifier: identifier.trim(),
        password,
      });

      if (!response.access_token) {
        throw new Error("Invalid authentication response received.");
      }

      if (response.user.role !== "SUPER_ADMIN") {
        setError("403 Forbidden: Authenticated account does not have SUPER_ADMIN privileges.");
        return;
      }

      api.setToken(response.access_token);
      localStorage.setItem("careflow_token", response.access_token);
      localStorage.setItem("careflow_session", JSON.stringify(response));
      localStorage.setItem("careflow_active_persona", "CareFlow Platform Admin (Super Admin)");

      router.push("/admin");
    } catch (err: any) {
      console.error("Super Admin login failure:", err);
      const msg = err?.message || "Authentication failed. Please verify credentials.";
      if (msg.includes("403") || msg.includes("allowlist") || msg.includes("Super Admin")) {
        setError("403 Access Denied: Account is not in the server-side Super Admin allowlist.");
      } else if (msg.includes("Invalid credentials") || msg.includes("401")) {
        setError("Invalid administrator email or password.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = () => {
    setIdentifier("edure6377@gmail.com");
    setPassword("CareFlowAdmin#2026");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row">
      {/* Left Column: Visual Data Security Illustration Panel */}
      <div className="lg:w-1/2 bg-[#005ae6] relative overflow-hidden flex flex-col justify-between p-6 sm:p-10 lg:p-12 text-white">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-700/40 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white font-bold shadow-lg transition-transform group-hover:scale-105">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-white">CareFlow</span>
                <span className="text-[10px] font-mono bg-white/20 text-white font-bold px-2 py-0.5 rounded-full border border-white/30">
                  ENTERPRISE
                </span>
              </div>
              <p className="text-[11px] text-blue-100/80 font-medium">Healthcare Coordination Engine</p>
            </div>
          </Link>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-mono font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-200" />
            <span>DPDP & ABDM COMPLIANT</span>
          </div>
        </div>

        {/* Center: Hero Illustration */}
        <div className="relative z-10 my-8 lg:my-auto flex flex-col items-center justify-center">
          <div className="relative w-full max-w-md xl:max-w-lg aspect-[614/491] rounded-2xl overflow-hidden shadow-2xl shadow-blue-950/40 bg-[#005ae6]">
            <Image
              src="/images/admin_security_art.png"
              alt="CareFlow Super Admin Data Security Gateway"
              fill
              priority
              className="object-contain"
            />
          </div>

          <div className="mt-6 text-center max-w-md space-y-2">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Zero-Trust Platform Mission Control
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              Cryptographically verified administrative access for hospital networks, clinical registries, and live patient queue coordination.
            </p>
          </div>
        </div>

        {/* Bottom Feature Badges */}
        <div className="relative z-10 pt-4 border-t border-white/15 grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-xl bg-white/10 backdrop-blur-xs">
            <div className="text-[11px] font-bold text-white">Strict Allowlist</div>
            <div className="text-[9px] text-blue-100/80">Server-Side Enforced</div>
          </div>
          <div className="p-2 rounded-xl bg-white/10 backdrop-blur-xs">
            <div className="text-[11px] font-bold text-white">SHA-256 Audit</div>
            <div className="text-[9px] text-blue-100/80">Tamper-Evident Trail</div>
          </div>
          <div className="p-2 rounded-xl bg-white/10 backdrop-blur-xs">
            <div className="text-[11px] font-bold text-white">JWT Session</div>
            <div className="text-[9px] text-blue-100/80">Revocable Clusters</div>
          </div>
        </div>
      </div>

      {/* Right Column: Super Admin Login Form */}
      <div className="lg:w-1/2 bg-slate-950 flex flex-col justify-between p-6 sm:p-10 lg:p-14">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px] text-emerald-400 uppercase tracking-wider font-semibold">
              Security Gateway Active
            </span>
          </div>
          <Link
            href="/"
            className="hover:text-slate-200 transition-colors text-xs flex items-center gap-1"
          >
            <span>Return to OPD Portal</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="w-full max-w-md mx-auto my-auto py-8 space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono font-bold">
              <LockKeyhole className="w-3 h-3" />
              <span>SUPER ADMIN CONTROL CENTER</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Platform Authentication
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Platform-level operations, security and governance.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="leading-snug font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Administrator Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="username"
                  placeholder="admin@domain.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Administrator Password *
                </label>
                <span className="text-[10px] text-slate-400">CareFlow Independent Credential</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Validating Credentials & Allowlist...</span>
                </div>
              ) : (
                <>
                  <span>Authenticate & Access Control Center</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
            <div className="pt-4 border-t border-slate-900 flex items-center justify-between">
              <button
                type="button"
                onClick={handleQuickFill}
                className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800/90 border border-slate-800 rounded-xl text-xs text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer font-medium"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>⚡ Quick Fill Super Admin (edure6377)</span>
              </button>
            </div>
          )}

          <div className="rounded-xl p-3 bg-slate-900/60 border border-slate-800/70 text-slate-400 text-[11px] leading-relaxed flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            <span>
              Restricted platform area. Authentication requires a validated database account and membership in the server-side <code className="text-slate-300 font-mono">SUPER_ADMIN_EMAILS</code> allowlist.
            </span>
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-400 border-t border-slate-900 pt-4">
          CareFlow Healthcare Operating Layer • Version 1.0.0 (FHIR R4)
        </div>
      </div>
    </div>
  );
}
