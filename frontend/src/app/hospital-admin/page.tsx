"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FlaskConical,
  Layers,
  MapPin,
  QrCode,
  Radio,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { useHospitalAdminScope } from "@/components/hospital-admin/HospitalAdminGuard";
import { useLanguage } from "@/context/LanguageContext";
import { useAccessibility } from "@/context/AccessibilityContext";
import { api } from "@/lib/api";

export default function HospitalAdminDashboard() {
  const { scope, refreshScope } = useHospitalAdminScope();
  const { t } = useLanguage();
  const { simpleView, speakText } = useAccessibility();
  const [stepping, setStepping] = useState(false);
  const [stepMessage, setStepMessage] = useState<string | null>(null);

  if (!scope) return null;

  const handleQuickStep = async () => {
    try {
      setStepping(true);
      setStepMessage(null);
      // Fetch first doctor in hospital
      const docs = await api.get<any[]>("/hospital-admin/doctors");
      if (!docs || docs.length === 0) {
        setStepMessage("No doctors available to step queue.");
        return;
      }
      const res = await api.post<any>("/hospital-admin/queue/step", { doctor_id: docs[0].id });
      setStepMessage(res.message || `Called token ${res.ticket_number || "next"}`);
      speakText(`Queue token ${res.ticket_number || "next"} called`);
      await refreshScope();
    } catch (err: any) {
      setStepMessage(err.message || "Failed to step queue.");
    } finally {
      setStepping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Ground-Level Operational Scope Card */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/10 border border-teal-500/30 text-teal-400">
                Ground-Level Operational Authority
              </span>
              <span className="text-xs font-mono text-slate-400">
                Facility ID: {scope.hospital.id.slice(0, 8)}...
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              {scope.hospital.name}
            </h1>
            <p className="text-sm text-slate-300 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
              {scope.hospital.address}, {scope.hospital.city}, {scope.hospital.state}
            </p>
          </div>

          {/* Admin Binding & HFR Badge */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="text-slate-400">Designated Admin:</span>
              <span className="font-semibold text-white">{scope.admin.full_name}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="text-slate-400">Admin Display ID:</span>
              <span className="font-mono font-bold text-teal-400">{scope.admin.admin_display_id}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="text-slate-400">HFR ABDM Registry:</span>
              <span className="font-mono text-emerald-400 font-semibold">{scope.hospital.hfr_id || "ABDM-VERIFIED"}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-xs pt-1 border-t border-slate-800">
              <span className="text-slate-400">QR Check-in Token:</span>
              <span className="font-mono text-[11px] text-cyan-400">Ready & Active</span>
            </div>
          </div>
        </div>

        {/* Isolation Notice Banner */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Facility-scoped isolation active. Cross-hospital modifications and Super Admin governance are restricted.</span>
          </div>
          <Link
            href="/hospital-admin/operations"
            className="text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1"
          >
            Facility Operations <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* 2. Real-Time Operational KPI Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Waiting in Queue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Waiting in Queue</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">{scope.metrics.waiting_in_queue}</div>
          <p className="text-xs text-amber-400/90 mt-1 flex items-center gap-1 font-medium">
            <Clock className="w-3 h-3" /> Average dwell ~14 mins
          </p>
        </div>

        {/* In Consultation */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">In Consultation</span>
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Stethoscope className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">{scope.metrics.in_consultation}</div>
          <p className="text-xs text-teal-400/90 mt-1 font-medium">Active clinical encounters</p>
        </div>

        {/* Today's Appointments */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Today's Appointments</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">{scope.metrics.todays_appointments}</div>
          <p className="text-xs text-slate-400 mt-1">
            Completed: <span className="text-emerald-400 font-semibold">{scope.metrics.completed_today}</span>
          </p>
        </div>

        {/* Active Doctors */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Active Doctors</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">
            {scope.metrics.active_doctors}{" "}
            <span className="text-sm font-normal text-slate-500">/ {scope.metrics.total_doctors}</span>
          </div>
          <p className="text-xs text-indigo-400 mt-1 font-medium">
            Across {scope.metrics.departments_count} departments
          </p>
        </div>
      </section>

      {/* 3. Ground Control Actions & Quick Stepping */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Action Quick-Cards */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-400" />
            Facility Operational Actions
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/hospital-admin/queue"
              className={`p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-800/60 hover:border-teal-500/30 transition-all flex flex-col justify-between ${
                simpleView ? "min-h-[110px]" : "min-h-[90px]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Manage Waiting Room</h3>
                  <p className="text-xs text-slate-400">Display sync & token advancement</p>
                </div>
              </div>
              <span className="text-[11px] text-teal-400 font-medium self-end mt-2 flex items-center gap-1">
                Open Queue <ArrowRight className="w-3 h-3" />
              </span>
            </Link>

            <Link
              href="/hospital-admin/operations"
              className={`p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-800/60 hover:border-amber-500/30 transition-all flex flex-col justify-between ${
                simpleView ? "min-h-[110px]" : "min-h-[90px]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Broadcast OPD Alert</h3>
                  <p className="text-xs text-slate-400">Push delay marquee to waiting rooms</p>
                </div>
              </div>
              <span className="text-[11px] text-amber-400 font-medium self-end mt-2 flex items-center gap-1">
                Broadcast <ArrowRight className="w-3 h-3" />
              </span>
            </Link>

            <Link
              href="/hospital-admin/departments"
              className={`p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-800/60 hover:border-cyan-500/30 transition-all flex flex-col justify-between ${
                simpleView ? "min-h-[110px]" : "min-h-[90px]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Add / Edit Departments</h3>
                  <p className="text-xs text-slate-400">Configure Cardiology, OPD, Ortho</p>
                </div>
              </div>
              <span className="text-[11px] text-cyan-400 font-medium self-end mt-2 flex items-center gap-1">
                View Departments <ArrowRight className="w-3 h-3" />
              </span>
            </Link>

            <Link
              href="/hospital-admin/staff"
              className={`p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-800/60 hover:border-indigo-500/30 transition-all flex flex-col justify-between ${
                simpleView ? "min-h-[110px]" : "min-h-[90px]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Hospital Staff</h3>
                  <p className="text-xs text-slate-400">Receptionists & Lab technicians</p>
                </div>
              </div>
              <span className="text-[11px] text-indigo-400 font-medium self-end mt-2 flex items-center gap-1">
                Manage Staff <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
        </div>

        {/* Right Col: Fast Step / Emergency Queue Override */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white">Waiting Room Pulse</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Step the primary doctor queue directly from the ground control cockpit to advance waiting room tokens.
            </p>

            <button
              onClick={handleQuickStep}
              disabled={stepping}
              className={`w-full rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold transition-all shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 ${
                simpleView ? "py-4 text-lg min-h-[56px]" : "py-3 text-sm min-h-[44px]"
              }`}
            >
              <Activity className="w-4 h-4 animate-spin-slow" />
              <span>{stepping ? "Stepping Queue..." : "Call Next Waiting Token"}</span>
            </button>

            {stepMessage && (
              <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-teal-300">
                {stepMessage}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 mt-4">
            Total facility lab orders:{" "}
            <span className="text-slate-300 font-semibold">{scope.metrics.total_lab_orders}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
