"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, Lock, LogIn } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-950/40">
          <ShieldAlert className="w-8 h-8 stroke-[2]" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold">
            <Lock className="w-3.5 h-3.5" />
            HTTP 403 FORBIDDEN
          </div>
          <h1 className="text-xl font-black tracking-tight text-white">
            Restricted Platform Access
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
            Your authenticated account does not possess Super Admin privileges or is not present in the server-side authorization allowlist.
          </p>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 text-left space-y-2 text-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            Security Requirements
          </div>
          <ul className="space-y-1.5 text-slate-400 text-[11px]">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Role must strictly evaluate to <strong className="text-slate-200">SUPER_ADMIN</strong>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Email must match the server-side <strong className="text-slate-200">SUPER_ADMIN_EMAILS</strong> allowlist
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Account must be marked active and not suspended
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/"
            className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>
          <Link
            href="/admin/login"
            className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/40 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Admin Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
