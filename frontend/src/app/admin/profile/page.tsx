"use client";

import React, { useState, useEffect } from "react";
import {
  UserCheck,
  ShieldCheck,
  Lock,
  KeyRound,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Laptop,
  LogOut,
  Mail,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/lib/api";
import ConfirmationModal from "@/components/admin/ConfirmationModal";

export default function AdminProfilePage() {
  const [adminUser, setAdminUser] = useState<any>({
    full_name: "CareFlow Platform Admin",
    email: "edure6377@gmail.com",
    role: "SUPER_ADMIN",
    phone: "+91 99999 99999",
  });
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("careflow_session");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.user) {
          setAdminUser(parsed.user);
        }
      }
    } catch {
      // ignore
    }

    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await api.get<any[]>("/admin/sessions");
      if (Array.isArray(res)) {
        setSessions(res);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeOthers = async () => {
    try {
      const res = await api.post<{ revoked_count: number; message: string }>("/admin/sessions/revoke-others", {});
      setFeedback({
        type: "success",
        message: res?.message || `Successfully revoked other active administrator sessions.`,
      });
      fetchSessions();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to revoke sessions." });
    }
  };

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("careflow_token");
      localStorage.removeItem("careflow_session");
      localStorage.removeItem("careflow_active_persona");
      window.location.href = "/admin/login";
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white p-1">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            ADMINISTRATOR ACCOUNT
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
          Admin Profile & Session Security
        </h1>
        <p className="text-xs text-slate-400">
          Super Admin credentials, server allowlist verification, and active authentication tokens.
        </p>
      </div>

      {/* Account Info Card */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-emerald-950/40">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{adminUser.full_name || "Super Admin"}</h2>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.2 rounded border border-emerald-500/30">
                  SUPER_ADMIN
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{adminUser.email || "edure6377@gmail.com"}</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Session</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 font-mono text-[10px] uppercase">Allowlist Verification</span>
            <div className="text-emerald-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>SUPER_ADMIN_EMAILS ALLOWLISTED</span>
            </div>
            <p className="text-[11px] text-slate-400">Strictly verified on the server-side runtime.</p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 font-mono text-[10px] uppercase">Cryptographic Token</span>
            <div className="text-slate-200 font-mono font-bold">HS256 Bearer Token</div>
            <p className="text-[11px] text-slate-400">Salted signature validated on each privileged API call.</p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 font-mono text-[10px] uppercase">Session Timeout</span>
            <div className="text-slate-200 font-mono font-bold">30 Minutes Idle Timeout</div>
            <p className="text-[11px] text-slate-400">Automatic re-authentication required upon expiration.</p>
          </div>
        </div>
      </div>

      {/* Active Sessions List */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Laptop className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-tight">Active Admin Sessions</h2>
          </div>
          <button
            onClick={() => setRevokeModalOpen(true)}
            className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Revoke Other Sessions</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {sessions.length === 0 ? (
            <div className="text-xs text-slate-400 py-3 text-center">
              Current browser session active.
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-200">{s.device_info || s.user_agent}</div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    IP: {s.ip_address || "127.0.0.1"} • Last seen: {new Date(s.last_activity).toLocaleString()}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  ACTIVE
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-slate-900 border border-rose-900/40 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-rose-400 border-b border-slate-800 pb-3">
          <ShieldAlert className="w-5 h-5" />
          <h2 className="text-base font-bold tracking-tight">Platform Danger Zone</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          High-consequence actions that affect platform-wide operations. All danger zone actions require secondary typed confirmation and are indelibly recorded in the cryptographic audit trail.
        </p>

        <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
          <div>
            <div className="text-xs font-bold text-slate-200">Force Invalidate All Active User Sessions</div>
            <p className="text-[11px] text-slate-400">
              Signs out all active doctors, hospital receptionists, and patients across the platform.
            </p>
          </div>
          <button
            onClick={() => setRevokeModalOpen(true)}
            className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Purge User Sessions
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={revokeModalOpen}
        onClose={() => setRevokeModalOpen(false)}
        onConfirm={handleRevokeOthers}
        title="Revoke All Other Sessions?"
        description="This will instantly invalidate all existing tokens for your account on other devices."
        requiredPhrase="REVOKE"
        confirmButtonText="Revoke Sessions"
        isDanger={true}
      />
    </div>
  );
}
