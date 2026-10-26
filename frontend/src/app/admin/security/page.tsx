"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  KeyRound,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Laptop,
  Globe,
  Clock,
  Radio,
} from "lucide-react";
import { api } from "@/lib/api";
import ConfirmationModal from "@/components/admin/ConfirmationModal";

interface SecuritySummary {
  failed_admin_logins_24h: number;
  suspicious_signals_count: number;
  active_admin_sessions_count: number;
  signals: Array<{
    id: string;
    type: string;
    description: string;
    severity: string;
    timestamp: string;
    ip_address?: string;
  }>;
}

interface AdminSession {
  id: string;
  user_id: string;
  admin_email: string;
  admin_name: string;
  ip_address: string;
  user_agent: string;
  device_info: string;
  last_activity: string;
  created_at: string;
  is_active: boolean;
}

export default function SecurityCenterPage() {
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const [sumRes, sessRes] = await Promise.all([
        api.get<SecuritySummary>("/admin/security-summary"),
        api.get<AdminSession[]>("/admin/sessions").catch(() => []),
      ]);

      setSummary(sumRes);
      if (Array.isArray(sessRes)) {
        setSessions(sessRes);
      }
    } catch (err: any) {
      console.error("Failed to load security telemetry:", err);
      setFeedback({ type: "error", message: err?.message || "Failed to load security data." });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeOtherSessions = async () => {
    try {
      const res = await api.post<{ revoked_count: number; message: string }>("/admin/sessions/revoke-others", {});
      setFeedback({
        type: "success",
        message: res?.message || `Successfully revoked ${res?.revoked_count || 0} active sessions.`,
      });
      fetchSecurityData();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to revoke sessions." });
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              PLATFORM DEFENSE
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Security & Defense Center
          </h1>
          <p className="text-xs text-slate-400">
            Real-time telemetry on authentication anomalies, brute-force mitigation, and active Super Admin tokens.
          </p>
        </div>

        <button
          onClick={() => setRevokeModalOpen(true)}
          className="px-4 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>Revoke Other Admin Sessions</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Failed Admin Logins (24h)</span>
            <Lock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-black text-rose-400">
            {summary?.failed_admin_logins_24h ?? 0}
          </div>
          <p className="text-[11px] text-slate-400">
            Unauthorized password or allowlist mismatches
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Security Signals</span>
            <Radio className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400">
            {summary?.suspicious_signals_count ?? 0}
          </div>
          <p className="text-[11px] text-slate-400">
            Anomalous privilege elevations or rate limit triggers
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Active Admin Sessions</span>
            <KeyRound className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">
            {summary?.active_admin_sessions_count ?? 1}
          </div>
          <p className="text-[11px] text-slate-400">
            Active verified JWT sessions across devices
          </p>
        </div>
      </div>

      {/* Security Signals Stream */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Anomalous Security Signals & Defense Log
            </h2>
          </div>
          <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
            CRYPTOGRAPHIC AUDIT FEED
          </span>
        </div>

        {!summary?.signals || summary.signals.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800/60 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Zero critical defense anomalies or brute-force attempts recorded in the audit store.</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {summary.signals.map((sig) => (
              <div
                key={sig.id}
                className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex items-start justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30 px-2 py-0.2 rounded">
                      {sig.type}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(sig.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-200 font-medium">{sig.description}</p>
                </div>
                {sig.ip_address && (
                  <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                    IP: {sig.ip_address}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Admin Sessions Table */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Laptop className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Active Super Admin Sessions
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Validated against server-side session hash table
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Administrator</th>
                <th className="py-3 px-4">Device / User Agent</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4">Session State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    Active TLS session active on this console.
                  </td>
                </tr>
              ) : (
                sessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-100">
                      <div>{sess.admin_name || "Super Admin"}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{sess.admin_email}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 line-clamp-1 max-w-xs">{sess.device_info || sess.user_agent}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {sess.ip_address || "127.0.0.1"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(sess.last_activity).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      {sess.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          REVOKED
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Session Revocation */}
      <ConfirmationModal
        isOpen={revokeModalOpen}
        onClose={() => setRevokeModalOpen(false)}
        onConfirm={handleRevokeOtherSessions}
        title="Revoke All Other Admin Sessions?"
        description="This will instantly invalidate all existing tokens and sessions for this administrator across other browsers and mobile devices. You will remain logged into this current workstation."
        requiredPhrase="REVOKE"
        confirmButtonText="Revoke Other Sessions"
        isDanger={true}
      />
    </div>
  );
}
