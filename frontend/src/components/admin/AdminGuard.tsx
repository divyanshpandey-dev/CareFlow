"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Lock, Activity, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const verifySuperAdmin = async () => {
      try {
        const token = api.getToken();
        if (!token) {
          router.replace("/admin/login");
          return;
        }

        // Verify with backend authoritative check
        // The /admin/security-summary endpoint is protected by get_current_super_admin
        // which enforces active status, SUPER_ADMIN role, and normalized email allowlist!
        await api.get("/admin/security-summary");

        if (isMounted) {
          setAuthorized(true);
          setLoading(false);
        }
      } catch (err: any) {
        if (!isMounted) return;

        const errMsg = err?.message || "";
        console.warn("Super Admin verification failed:", errMsg);

        if (
          errMsg.includes("403") ||
          errMsg.includes("Forbidden") ||
          errMsg.includes("Super Admin") ||
          errMsg.includes("privileges")
        ) {
          router.replace("/unauthorized");
        } else if (
          errMsg.includes("401") ||
          errMsg.includes("Unauthorized") ||
          errMsg.includes("expired")
        ) {
          api.clearToken();
          router.replace("/admin/login");
        } else {
          // If network or server error, display clean alert with retry
          setErrorMessage(errMsg || "Failed to establish secure Super Admin session.");
          setLoading(false);
        }
      }
    };

    verifySuperAdmin();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 animate-pulse">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight">
          Super Admin Verification
        </h2>
        <p className="text-xs text-slate-400 max-w-sm mt-1.5 leading-relaxed">
          Cryptographically validating session token, role permissions, and server-side email allowlist...
        </p>
        <div className="w-48 h-1 bg-slate-800 rounded-full mt-6 overflow-hidden">
          <div className="w-full h-full bg-emerald-500 animate-[shimmer_1.5s_infinite]" />
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-5">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight">
          Access Gateway Error
        </h2>
        <p className="text-xs text-rose-300 max-w-sm mt-1.5 leading-relaxed">
          {errorMessage}
        </p>
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Retry Verification
          </button>
          <button
            onClick={() => {
              api.clearToken();
              router.push("/admin/login");
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Sign In with Super Admin
          </button>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
