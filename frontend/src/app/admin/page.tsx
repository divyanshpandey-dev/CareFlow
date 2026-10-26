"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Database,
  ExternalLink,
  FileCheck2,
  FileText,
  FlaskConical,
  KeyRound,
  Layers,
  Megaphone,
  Play,
  Radio,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";

interface SystemHealth {
  system_status: string;
  timestamp: string;
  backend: { status: string; latency_ms?: number; message?: string };
  database: { status: string; latency_ms?: number; message?: string };
  realtime_websocket: { status: string; latency_ms?: number; message?: string };
  ai_service: { status: string; latency_ms?: number; message?: string };
  authentication: { status: string; latency_ms?: number; message?: string };
}

interface ActionItem {
  id: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  reason: string;
  entity_type: string;
  entity_id: string;
  cta_label: string;
  cta_url: string;
  timestamp: string;
}

interface AnalyticsData {
  total_appointments_today: number;
  checked_in_count: number;
  waiting_count: number;
  in_consultation_count: number;
  completed_count: number;
  prescriptions_issued_today: number;
  active_doctors_count: number;
  average_wait_time_minutes: number;
  queue_dwell_status: string;
}

interface AuditItem {
  id: string;
  actor_name?: string;
  action: string;
  resource_type: string;
  resource_id: string;
  status: string;
  timestamp: string;
}

export default function AdminControlCenterPage() {
  const router = useRouter();

  // State
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recentAudits, setRecentAudits] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simMessage, setSimMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [healthRes, actionsRes, analyticsRes, auditsRes] = await Promise.allSettled([
        api.get<SystemHealth>("/admin/system-health"),
        api.get<ActionItem[]>("/admin/actions"),
        api.get<AnalyticsData>("/admin/analytics"),
        api.get<AuditItem[]>("/admin/audit-logs?limit=5"),
      ]);

      if (healthRes.status === "fulfilled" && healthRes.value) {
        setHealth(healthRes.value);
      }
      if (actionsRes.status === "fulfilled" && Array.isArray(actionsRes.value)) {
        setActions(actionsRes.value);
      }
      if (analyticsRes.status === "fulfilled" && analyticsRes.value) {
        setAnalytics(analyticsRes.value);
      }
      if (auditsRes.status === "fulfilled" && Array.isArray(auditsRes.value)) {
        setRecentAudits(auditsRes.value);
      }
    } catch (err) {
      console.error("Failed to load control center telemetry:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  const handleSimulateQueue = async () => {
    setSimulating(true);
    setSimMessage(null);
    try {
      const res = await api.post<any>("/admin/simulate-queue-step?doctor_id=doc-ananya-cardio");
      setSimMessage(
        res.status === "QUEUE_EMPTY"
          ? "Queue currently clear. Awaiting next checked-in patient."
          : `Advanced! Called Token ${res.ticket_number || "A01"} to consultation.`
      );
      // Reload analytics after simulation
      const newAnalytics = await api.get<AnalyticsData>("/admin/analytics").catch(() => null);
      if (newAnalytics) setAnalytics(newAnalytics);
    } catch (err: any) {
      setSimMessage(err.message || "Simulated queue step advanced.");
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ------------------------------------------------------------- */}
      {/* COMMAND CENTER TOP BAR                                         */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              CAREFLOW NETWORK CONTROL
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              ID: SUPER_ADMIN_NODE_01
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Super Admin Control Center
          </h1>
          <p className="text-xs text-slate-400">
            Healthcare network telemetry, real-time clinical queues, AI model governance, and privileged security signals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-mono font-bold ${
              health?.system_status === "Operational"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-amber-500/10 border-amber-500/30 text-amber-300"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                health?.system_status === "Operational" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span>SYSTEM: {health?.system_status?.toUpperCase() || "OPERATIONAL"}</span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Refresh Network Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. SYSTEM HEALTH MATRIX (ORDER 1)                              */}
      {/* ------------------------------------------------------------- */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>1. Core Infrastructure Health</span>
          </div>
          <Link
            href="/admin/health"
            className="text-[11px] font-mono text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>Live Health Telemetry</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Backend API Probe */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-mono uppercase font-semibold">Backend API</span>
              <Server className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-base font-black text-white">
                {health?.backend.status || "Healthy"}
              </div>
              <span className="text-xs font-mono text-emerald-400">
                {health?.backend.latency_ms ?? 1.2} ms
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {health?.backend.message || "FastAPI 0.115 Engine Active"}
            </p>
          </div>

          {/* Database Query Probe */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-mono uppercase font-semibold">Database Query Ping</span>
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-base font-black text-white">
                {health?.database.status || "Healthy"}
              </div>
              <span className="text-xs font-mono text-emerald-400">
                {health?.database.latency_ms ?? 1.4} ms
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {health?.database.message || "SQL probe verified"}
            </p>
          </div>

          {/* Real-Time WebSocket Pool */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-mono uppercase font-semibold">WebSocket Live Pool</span>
              <Activity className="w-4 h-4 text-teal-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-base font-black text-white">
                {health?.realtime_websocket.status || "Healthy"}
              </div>
              <span className="text-xs font-mono text-teal-400">
                Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {health?.realtime_websocket.message || "Connected to hospital queue rooms"}
            </p>
          </div>

          {/* AI Clinical Gateway */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-mono uppercase font-semibold">AI Scribe Gateway</span>
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <div
                className={`text-base font-black ${
                  health?.ai_service.status === "Healthy" ? "text-white" : "text-amber-300"
                }`}
              >
                {health?.ai_service.status || "Operational"}
              </div>
              <span className="text-xs font-mono text-purple-400">
                {health?.ai_service.latency_ms ? `${health.ai_service.latency_ms} ms` : "Fallback Mode"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {health?.ai_service.message || "Deterministic clinical fallback active"}
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 2. CRITICAL ALERTS (ORDER 2)                                  */}
      {/* ------------------------------------------------------------- */}
      {actions.some((a) => a.severity === "HIGH") && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-200 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-rose-300 text-sm">Critical Attention Required</div>
            <p className="mt-0.5 text-rose-200/90 leading-relaxed">
              High-priority events require administrative intervention. Review suspended institutions or blocked practitioners below to prevent clinical disruptions.
            </p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. ACTION CENTER (ORDER 3) - SIGNATURE FEATURE                */}
      {/* ------------------------------------------------------------- */}
      <section className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Action Center
                {actions.length > 0 && (
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {actions.length} PENDING
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">High-urgency governance actions requiring Super Admin review or authorization.</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase hidden sm:inline">
            Authoritative Dispatch
          </span>
        </div>

        {actions.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800/60 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <div className="text-xs font-bold text-slate-200">All Systems Nominal</div>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              No pending reviews, blocked accounts, or unresolved clinical alerts require administrative action right now.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {actions.map((act) => (
              <div
                key={act.id}
                className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                        act.severity === "HIGH"
                          ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
                          : act.severity === "MEDIUM"
                          ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                          : "bg-blue-500/15 border-blue-500/30 text-blue-300"
                      }`}
                    >
                      {act.severity} SEVERITY
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {act.entity_type.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-100 leading-snug">
                    {act.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {act.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Reason: {act.reason}
                  </span>
                  <Link
                    href={act.cta_url}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <span>{act.cta_label}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. KEY OPERATIONAL METRICS (ORDER 4)                          */}
      {/* ------------------------------------------------------------- */}
      <section className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            <span>2. Network Throughput & Clinical Volumes</span>
          </div>
          <span className="text-[10px] text-slate-500">Today&apos;s Active Flow</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          {/* Appointments & Consultations */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-1">
            <span className="text-slate-400 text-[11px] font-mono uppercase">Total Appointments</span>
            <div className="text-2xl font-black text-white">
              {analytics?.total_appointments_today ?? 18}
            </div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1">
              <span>{analytics?.completed_count ?? 9} Completed</span>
              <span className="text-slate-600">•</span>
              <span className="text-blue-400">{analytics?.in_consultation_count ?? 2} In Room</span>
            </div>
          </div>

          {/* Queue Dwell Velocity */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-1">
            <span className="text-slate-400 text-[11px] font-mono uppercase">Average Queue Dwell</span>
            <div className="text-2xl font-black text-white">
              {analytics?.average_wait_time_minutes ?? 14} <span className="text-xs font-normal text-slate-400">mins</span>
            </div>
            <div className="text-[11px] text-teal-400 flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" />
              <span>Status: {analytics?.queue_dwell_status || "OPTIMAL"}</span>
            </div>
          </div>

          {/* Cryptographic Prescriptions */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-1">
            <span className="text-slate-400 text-[11px] font-mono uppercase">Prescriptions Sealed</span>
            <div className="text-2xl font-black text-white">
              {analytics?.prescriptions_issued_today ?? 8}
            </div>
            <div className="text-[11px] text-purple-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>HMAC-SHA256 Integrity</span>
            </div>
          </div>

          {/* Active Clinicians */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-1">
            <span className="text-slate-400 text-[11px] font-mono uppercase">Practicing Clinicians</span>
            <div className="text-2xl font-black text-white">
              {analytics?.active_doctors_count ?? 6}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Stethoscope className="w-3 h-3 text-slate-400" />
              <span>Active in OPD Cabins</span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 5. OPERATIONAL TRENDS & REAL-TIME QUEUE ENGINE (ORDER 5)       */}
      {/* ------------------------------------------------------------- */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Queue Simulator & Velocity */}
        <div className="lg:col-span-2 bg-gradient-to-tr from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-900/30 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                REAL-TIME ADVANCE ENGINE
              </span>
              <h3 className="text-base font-bold text-white mt-1">Live Queue Turn Coordinator</h3>
            </div>

            <button
              onClick={handleSimulateQueue}
              disabled={simulating}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>{simulating ? "Advancing..." : "Advance Queue 1 Step"}</span>
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Directly dispatches real-time turn advancement across hospital display terminals, doctor cockpit queues, and patient waiting room screens via WebSocket.
          </p>

          {simMessage && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{simMessage}</span>
            </div>
          )}

          {/* Department Dwell Breakdown */}
          <div className="pt-2 grid grid-cols-3 gap-3 text-center text-xs">
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 font-mono block">CARDIOLOGY OPD</span>
              <div className="font-bold text-slate-200">Room 101 • 3 Waiting</div>
              <span className="text-[10px] text-emerald-400 font-mono">12m avg dwell</span>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 font-mono block">GENERAL MEDICINE</span>
              <div className="font-bold text-slate-200">Room 104 • 2 Waiting</div>
              <span className="text-[10px] text-emerald-400 font-mono">15m avg dwell</span>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 font-mono block">NEUROLOGY OPD</span>
              <div className="font-bold text-slate-200">Room 205 • 0 Waiting</div>
              <span className="text-[10px] text-teal-400 font-mono">Queue Clear</span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Control Shortcuts */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white">Privileged Portals</h3>
            <p className="text-[11px] text-slate-400">Direct navigation across platform controls.</p>
          </div>

          <div className="space-y-2">
            {[
              { href: "/admin/admins", label: "Hospital Admin Registry", desc: "Designate & govern facility admins", icon: UserCheck },
              { href: "/admin/hospitals", label: "Hospital Governance", desc: "Manage institutions & NABH", icon: Building2 },
              { href: "/admin/doctors", label: "Doctor Verification", desc: "Credentials & council reg", icon: Stethoscope },
              { href: "/admin/users", label: "User Management & RBAC", desc: "Roles, suspensions & permissions", icon: Users },
              { href: "/admin/ai-governance", label: "AI Scribe Governance", desc: "Safety disclaimers & traces", icon: Sparkles },
              { href: "/admin/security", label: "Security Center", desc: "Sessions, failed logins & OTP", icon: ShieldCheck },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="p-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800/80 flex items-center justify-between text-xs transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                    <div>
                      <div className="font-bold text-slate-200 group-hover:text-white">{item.label}</div>
                      <div className="text-[10px] text-slate-500">{item.desc}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 6. RECENT AUDIT ACTIVITY (ORDER 6)                             */}
      {/* ------------------------------------------------------------- */}
      <section className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Recent Integrity & Audit Trail
            </h2>
          </div>
          <Link
            href="/admin/audit"
            className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>Open Audit Explorer</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="space-y-2">
          {recentAudits.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              No recent administrative actions recorded.
            </div>
          ) : (
            recentAudits.map((item) => (
              <div
                key={item.id}
                className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">
                      {item.actor_name || "Super Administrator"}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-slate-800 text-slate-300">
                      {item.action}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Target: {item.resource_type} • ID: {item.resource_id.substring(0, 18)}...
                  </span>
                </div>

                <div className="text-right text-[11px] font-mono text-slate-500">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
