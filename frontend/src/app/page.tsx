"use client";

import React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  FlaskConical,
  HeartPulse,
  Hospital,
  Layers,
  Lock,
  MonitorCheck,
  QrCode,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50 to-slate-100 border-b border-slate-200 py-16 sm:py-24">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0596690a_1px,transparent_1px),linear-gradient(to_bottom,#0596690a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold shadow-xs">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Unified Healthcare Coordination & Journey Platform</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight sm:leading-none">
              Connecting Every Step of Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                Care Journey
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed">
              CareFlow eliminates fragmented healthcare workflows. Unifying Discovery, Smart Check-In,
              EWMA Live Queuing, Clinical Cockpits, Cryptographic Digital Prescriptions, and DPDP-compliant consent sharing into one seamless operating layer.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link
                href="/demo"
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base shadow-lg shadow-emerald-600/25 transition-all hover:scale-105"
              >
                <MonitorCheck className="w-5 h-5" />
                Launch 3-Screen Live Judge Demo
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/patient/login"
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-base border border-slate-300 shadow-xs transition-all hover:border-teal-500"
              >
                <Users className="w-5 h-5 text-teal-600" />
                Dedicated Patient Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Role Navigation Quick Launch */}
      <section className="py-12 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-xs uppercase font-bold tracking-wider text-slate-400">
              Interactive Stakeholder Portals
            </h2>
            <p className="text-2xl font-bold text-slate-900 mt-1">Experience CareFlow by Role</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Patient Portal Card */}
            <Link
              href="/login?role=PATIENT&redirect=/patient/dashboard"
              className="group p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700">Patient Portal</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Single timeline for discovery, appointments, QR check-in, live queue tracking, and DPDP consent controls.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <span>Sign in as Patient (Rahul Verma)</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Doctor Portal Card */}
            <Link
              href="/doctor/cockpit"
              className="group p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-teal-500 hover:bg-teal-50/30 transition-all hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700">Doctor Cockpit</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Real-time patient queue, AI-assisted pre-visit brief, structured SOAP notes, and HMAC-signed prescriptions.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                <span>Enter Dr. Sharma&apos;s OPD</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Diagnostic Lab Card */}
            <Link
              href="/lab"
              className="group p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 transition-all hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FlaskConical className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700">Diagnostic Lab</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Sample barcode tracking, automated abnormal flag detection, and SHA-256 cryptographic report verification.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                <span>Open Diagnostic Workbench</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Hospital Operations Card */}
            <Link
              href="/hospital/operations"
              className="group p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-purple-500 hover:bg-purple-50/30 transition-all hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Hospital className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-700">Hospital Operations</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Live OPD waiting room monitor, real-time EWMA queue metrics, and cross-departmental coordination.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-purple-700">
                <span>View Live Waiting Screen</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>

          {/* Super Admin Command Center Showcase Banner */}
          <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-orange-950/50">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded border border-orange-500/30">
                    MISSION CONTROL & GOVERNANCE
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                    ● ZERO-TRUST SERVER ALLOWLIST ACTIVE
                  </span>
                </div>
                <h3 className="text-xl font-black text-white mt-1">Super Admin Control Center</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Platform-wide governance: doctor & hospital suspension, dynamic feature toggles, live AI safety oversight, 2FA security, and tamper-evident audit explorer.
                </p>
              </div>
            </div>

            <Link
              href="/admin/login"
              className="px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-950/40 flex items-center gap-2 transition-all hover:scale-105 shrink-0"
            >
              <span>Access Admin Panel</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Architectural Pillars */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs uppercase font-bold tracking-wider text-emerald-700">Enterprise Healthcare Engineering</h2>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">Built for National Scale & Clinical Trust</p>
            <p className="text-slate-600 mt-3 text-sm">
              CareFlow is not a simple CRUD booking widget. It is an end-to-end operating layer designed against national standards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Adaptive EWMA Live Queuing</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Replaces static slot guesses with real-time Exponentially Weighted Moving Average pacing. Updates patients instantly via WebSockets when delays occur.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900">DPDP Act 2023 Consent Guard</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Granular, time-bound, purpose-restricted consent records aligned with NRCeS HL7 FHIR R4. Patients can grant, inspect, or revoke cross-hospital access with 1 click.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900">HMAC-SHA256 Cryptographic Rx</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Every consultation prescription is sealed with an immutable cryptographic digital signature verifiable by pharmacies and patients via public QR/URL.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Assistive Pre-Visit AI Briefing</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Powered by Gemini 2.5 Flash. Summarizes past hospital encounters, active medications, and abnormal lab markers for clinicians in 3 seconds—strictly assisting, never diagnosing.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Continuous Care Journey Timeline</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Connects what happened, what is happening now, and what needs to happen next. Unifies consultations, blood tests, and follow-ups across hospital networks.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Zero-Trust Audit Trail</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Every access attempt, consultation note review, and prescription issuance is logged with immutable actor timestamps and IP tracing for full compliance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-slate-900">CareFlow</span>
            <span className="text-xs text-slate-500">| Unified Healthcare Operating Platform</span>
          </div>
          <div className="text-xs text-slate-500">
            Compliant with ABDM & NRCeS HL7® FHIR® R4 Indian Health Guidelines
          </div>
        </div>
      </footer>
    </div>
  );
}

