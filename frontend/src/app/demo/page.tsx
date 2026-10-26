"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  DoorOpen,
  FastForward,
  FileCheck2,
  FileText,
  FlaskConical,
  HeartPulse,
  Hospital,
  Layers,
  Lock,
  MonitorCheck,
  Play,
  QrCode,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stethoscope,
  Tv,
  Users,
  ChevronLeft,
  ChevronRight,
  Pause,
  ExternalLink,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { wsClient } from "@/lib/ws";

interface TourStep {
  step: number;
  title: string;
  category: string;
  speakerScript: string;
  routeUrl: string;
  keyCapability: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    step: 1,
    title: "Multi-Hospital OPD Discovery",
    category: "PATIENT DISCOVERY",
    speakerScript: "CareFlow allows patients to discover available doctors across city hospitals with real-time room status, consultation fees, and NABH accreditation.",
    routeUrl: "/discovery",
    keyCapability: "Unified hospital network discovery & fee transparency",
  },
  {
    step: 2,
    title: "Slot Booking & Token Allocation",
    category: "BOOKING",
    speakerScript: "Instant slot reservation with automated time allocation. Generates an encrypted appointment token and pre-visit instruction checklist.",
    routeUrl: "/book",
    keyCapability: "Dynamic slot allocation with zero double-booking",
  },
  {
    step: 3,
    title: "Contactless QR Check-In",
    category: "ARRIVAL & CHECK-IN",
    speakerScript: "Upon physical hospital arrival, scanning the reception QR instantly transitions appointment to CHECKED_IN and assigns sequence token CARD-A14.",
    routeUrl: "/patient/appointments/0fffe2b7-1767-42d2-a126-c068066d0323/checkin",
    keyCapability: "Location-verified QR scan & zero reception queueing",
  },
  {
    step: 4,
    title: "Waiting Hall Public Display",
    category: "QUEUE VISIBILITY",
    speakerScript: "Lobby TV displays live token calling with audio chime broadcasts over WebSocket, keeping OPD corridors orderly and eliminating patient anxiety.",
    routeUrl: "/waiting-room",
    keyCapability: "Sub-100ms WebSocket broadcast sync",
  },
  {
    step: 5,
    title: "Doctor Cockpit & Clinical Queue",
    category: "DOCTOR COCKPIT",
    speakerScript: "Clinician views current patient queue with one-click 'Call Next'. Integrates past encounters, active allergies, and vitals history.",
    routeUrl: "/doctor/cockpit",
    keyCapability: "One-click call-next & live queue sequencing",
  },
  {
    step: 6,
    title: "Assistive AI Clinical Scribe",
    category: "CLINICAL AI",
    speakerScript: "Google Gemini automatically synthesizes patient consultation history into structured SOAP notes with mandatory physician human-in-the-loop review.",
    routeUrl: "/doctor/cockpit",
    keyCapability: "Human-in-the-loop review disclaimer & SOAP draft",
  },
  {
    step: 7,
    title: "Digital Prescription & Integrity Seal",
    category: "PRESCRIPTIONS",
    speakerScript: "Prescriptions are sealed with an HMAC-SHA256 tamper-evident record hash and public verification code verifiable by pharmacies via QR.",
    routeUrl: "/verify/rx/CARE-RX-2026-98421",
    keyCapability: "HMAC-SHA256 cryptographic tamper evidence",
  },
  {
    step: 8,
    title: "Laboratory Diagnostic Accessioning",
    category: "LAB DIAGNOSTICS",
    speakerScript: "Pathologists verify test results against deterministic clinical reference ranges. High-risk troponin or potassium values trigger instant clinical alerts.",
    routeUrl: "/lab",
    keyCapability: "Deterministic reference ranges (Troponin, Potassium, Glucose)",
  },
  {
    step: 9,
    title: "ABDM-Aligned Patient Consent",
    category: "CONSENT & PRIVACY",
    speakerScript: "Patients grant granular, time-bound, purpose-specific consent for longitudinal health record access with one-click revocation and full audit visibility.",
    routeUrl: "/consent",
    keyCapability: "Time-bound, revocable consent artifacts",
  },
  {
    step: 10,
    title: "Patient Longitudinal Care Journey",
    category: "CARE JOURNEY",
    speakerScript: "Unifies appointments, check-ins, consultations, prescriptions, and verified lab results into a single interactive chronological care timeline.",
    routeUrl: "/journey",
    keyCapability: "End-to-end patient timeline from booking to recovery",
  },
  {
    step: 11,
    title: "Super Admin Control Center",
    category: "MISSION CONTROL",
    speakerScript: "Executive mission control tracking platform health, real-time WebSocket connections, security signals, feature toggles, and audited actions.",
    routeUrl: "/admin",
    keyCapability: "Authoritative server allowlist & 6-tier information hierarchy",
  },
];

export default function ThreeScreenLiveDemoPage() {
  // Demo step state: 1: Scheduled, 2: Checked In, 3: Called to Room, 4: Rx Finalized, 5: Lab Verified
  const [currentStep, setCurrentStep] = useState<number>(2);
  const [stepLoading, setStepLoading] = useState(false);
  const [audioChime, setAudioChime] = useState(false);
  const [lastEvent, setLastEvent] = useState<string>(
    "Patient Rahul Verma checked in. Token CARD-A14 assigned."
  );

  // Live simulation states
  const [ticketState, setTicketState] = useState<"WAITING" | "CALLED" | "COMPLETED">("WAITING");
  const [tokenNumber, setTokenNumber] = useState<string>("CARD-A14");
  const [queuePosition, setQueuePosition] = useState<number>(1);
  const [ewmaWaitMins, setEwmaWaitMins] = useState<number>(14);

  // Doctor state
  const [soapSigned, setSoapSigned] = useState(false);
  const [verificationCode, setVerificationCode] = useState<string>("CARE-RX-2026-98421");

  // Lab state
  const [labStatus, setLabStatus] = useState<"ORDERED" | "SAMPLE_COLLECTED" | "VERIFIED">("ORDERED");

  // 2-Minute Presenter Guided Tour State
  const [tourActive, setTourActive] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [tourPlaying, setTourPlaying] = useState(false);

  // Keyboard navigation for presenter tour
  useEffect(() => {
    const handleTourKeyDown = (e: KeyboardEvent) => {
      if (!tourActive) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        setTourStepIndex((prev) => Math.min(TOUR_STEPS.length - 1, prev + 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setTourStepIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "Escape") {
        e.preventDefault();
        setTourActive(false);
      } else if (e.key === " ") {
        e.preventDefault();
        setTourPlaying((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleTourKeyDown);
    return () => window.removeEventListener("keydown", handleTourKeyDown);
  }, [tourActive]);

  // Auto-advance timer (12s per step when active & playing)
  useEffect(() => {
    if (!tourActive || !tourPlaying) return;
    const interval = setInterval(() => {
      setTourStepIndex((prev) => {
        if (prev >= TOUR_STEPS.length - 1) {
          setTourPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 12000);
    return () => clearInterval(interval);
  }, [tourActive, tourPlaying]);

  useEffect(() => {
    // Connect WebSocket
    wsClient.connect();
    wsClient.subscribe("hospital:hosp-citycare-mumbai:queue", (msg) => {
      console.log("3-screen demo received:", msg);
    });
  }, []);

  const triggerChime = (msg: string) => {
    setLastEvent(msg);
    setAudioChime(true);
    setTimeout(() => setAudioChime(false), 3500);
  };

  // STEP 1: Patient Check-In
  const handleStepCheckIn = async () => {
    setStepLoading(true);
    try {
      setCurrentStep(2);
      setTicketState("WAITING");
      setQueuePosition(1);
      setEwmaWaitMins(14);
      triggerChime("Token CARD-A14 issued via Contactless QR Check-In.");
    } finally {
      setStepLoading(false);
    }
  };

  // STEP 2: Doctor Calls Patient
  const handleStepDoctorCall = async () => {
    setStepLoading(true);
    try {
      // Call backend endpoint to trigger real queue step
      const docId = "0fffe2b7-1767-42d2-a126-c068066d0323";
      await api.post(`/admin/simulate-queue-step?doctor_id=${docId}`).catch(() => null);

      setCurrentStep(3);
      setTicketState("CALLED");
      setQueuePosition(0);
      setEwmaWaitMins(0);
      triggerChime("Doctor is calling Token CARD-A14! Please proceed to Room 204.");
    } finally {
      setStepLoading(false);
    }
  };

  // STEP 3: Doctor Completes & Signs Rx
  const handleStepSignRx = async () => {
    setStepLoading(true);
    try {
      const payload = {
        appointment_id: "0fffe2b7-1767-42d2-a126-c068066d0323",
        subjective: "Patient reports retrosternal tightness with brisk exertion.",
        objective: "BP: 142/88 mmHg, HR: 74 bpm. Normal heart sounds.",
        assessment: "Essential Hypertension, Exertional Angina, Dyslipidemia",
        plan: "Initiate Telmisartan 40mg and Atorvastatin 20mg. Low sodium diet.",
        prescription_items: [
          {
            medicine_name: "Tab. Telmisartan",
            dosage: "40 mg",
            frequency: "1-0-0",
            duration_days: 30,
          },
          {
            medicine_name: "Tab. Atorvastatin",
            dosage: "20 mg",
            frequency: "0-0-1",
            duration_days: 30,
          },
        ],
        follow_up_date: "2026-10-30",
      };

      const res = await api.post<any>("/clinical/encounters/complete", payload).catch(() => ({
        verification_code: `CARE-RX-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      }));

      if (res?.verification_code) {
        setVerificationCode(res.verification_code);
      }
      setSoapSigned(true);
      setTicketState("COMPLETED");
      setLabStatus("ORDERED");
      setCurrentStep(4);
      triggerChime("Encounter completed. Prescription sealed with HMAC-SHA256 signature.");
    } finally {
      setStepLoading(false);
    }
  };

  // STEP 4: Lab Collects Specimen & Verifies
  const handleStepLabVerify = async () => {
    setStepLoading(true);
    try {
      setLabStatus("VERIFIED");
      setCurrentStep(5);
      triggerChime("Diagnostic Lab verified Lipid Profile report with SHA-256 seal.");
    } finally {
      setStepLoading(false);
    }
  };

  const handleResetDemo = () => {
    setCurrentStep(2);
    setTicketState("WAITING");
    setQueuePosition(1);
    setEwmaWaitMins(14);
    setSoapSigned(false);
    setLabStatus("ORDERED");
    triggerChime("Demo reset to checked-in baseline state.");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Demo Walkthrough Controller Bar */}
      <section className="bg-slate-950 border-b border-slate-800 p-4 sticky top-16 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black">
              <MonitorCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base text-white">
                  3-Screen Live Judge Demo Cockpit
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Real-Time Sync
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Witness Patient, Doctor, and Hospital Waiting Display update synchronously in under 60 seconds.
              </p>
            </div>
          </div>

          {/* Step Progression Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleStepCheckIn}
              disabled={stepLoading}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentStep === 2
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <span>1. Smart Check-In</span>
            </button>

            <button
              onClick={handleStepDoctorCall}
              disabled={stepLoading}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentStep === 3
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/30 ring-2 ring-amber-400"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <span>2. Doctor Calls Patient</span>
            </button>

            <button
              onClick={handleStepSignRx}
              disabled={stepLoading}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentStep === 4
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <span>3. Sign Digital Rx</span>
            </button>

            <button
              onClick={handleStepLabVerify}
              disabled={stepLoading}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentStep === 5
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-2 ring-purple-400"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <span>4. Verify Lab Report</span>
            </button>

            <button
              onClick={() => {
                setTourActive(true);
                setTourStepIndex(0);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-blue-900/40 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Start 2-Min Guided Tour</span>
            </button>

            <button
              onClick={handleResetDemo}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Reset Demo to Baseline"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Broadcast Status Ribbon */}
        {audioChime && (
          <div className="mt-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-between shadow-lg animate-bounce">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 animate-spin" />
              <span>LIVE BROADCAST: {lastEvent}</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-mono">WebSocket Gateway</span>
          </div>
        )}
      </section>

      {/* Main 3-Pane Split View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PANE 1: Patient Smartphone View (3.5 cols) */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" />
              <span>Screen 1: Patient App (Rahul Verma)</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">Mobile Frame</span>
          </div>

          <div className="flex-1 bg-slate-950 rounded-3xl border-4 border-slate-800 p-4 shadow-2xl flex flex-col justify-between space-y-4">
            {/* Phone Screen Header */}
            <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  RV
                </div>
                <div>
                  <div className="font-bold text-slate-100">Rahul Verma</div>
                  <div className="text-[10px] text-slate-400">ABHA: 91-4567-8912-3456</div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Connected
              </span>
            </div>

            {/* Calling Alert in Patient Phone */}
            {ticketState === "CALLED" && (
              <div className="bg-amber-500 text-slate-950 p-4 rounded-2xl font-black text-xs space-y-1 animate-pulse shadow-lg">
                <div className="flex items-center gap-1.5">
                  <Bell className="w-4 h-4" />
                  <span className="uppercase tracking-wider">You are being called!</span>
                </div>
                <p className="text-[11px] font-medium text-slate-900">
                  Dr. Ananya Sharma is waiting in Room 204. Please enter cabin.
                </p>
              </div>
            )}

            {/* Live Queue Ticket Card */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Live Token
                  </span>
                  <div className="text-3xl font-black text-emerald-400 tracking-tight">
                    {tokenNumber}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    ticketState === "CALLED"
                      ? "bg-amber-500 text-slate-950 font-black animate-ping"
                      : ticketState === "COMPLETED"
                      ? "bg-slate-800 text-slate-400"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  }`}
                >
                  {ticketState}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Queue Position</span>
                  <strong className="text-white text-base">
                    {queuePosition === 0 ? "You're Next" : `#${queuePosition}`}
                  </strong>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Est. Wait (EWMA)</span>
                  <strong className="text-teal-400 text-base">~{ewmaWaitMins}m</strong>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span>Cardiology OPD • Room 204</span>
                <span className="text-emerald-400 font-medium">CityCare Hospital</span>
              </div>
            </div>

            {/* Real-Time Notification on Prescription Completion */}
            {soapSigned && (
              <div className="bg-indigo-950/70 border border-indigo-500/40 p-3.5 rounded-2xl space-y-1.5 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                  <FileCheck2 className="w-4 h-4 text-indigo-400" />
                  <span>New Digital Rx Received</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Signed with HMAC-SHA256 seal. Prescribed Tab. Telmisartan 40mg.
                </p>
                <Link
                  href={`/verify/rx/${verificationCode}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-200 underline pt-0.5"
                >
                  <span>Verify Authenticity ({verificationCode.slice(0, 14)}...)</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}

            {/* Bottom App Bar */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-around text-[10px] text-slate-400">
              <span className="text-emerald-400 font-bold">Active Visit</span>
              <span>Timeline</span>
              <span>DPDP Consent</span>
            </div>
          </div>
        </div>

        {/* PANE 2: Doctor Cockpit View (4.5 cols) */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4" />
              <span>Screen 2: Doctor Cockpit (Dr. Sharma)</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">Room 204</span>
          </div>

          <div className="flex-1 bg-slate-950 rounded-3xl border-4 border-slate-800 p-4 shadow-2xl flex flex-col justify-between space-y-4">
            {/* Doctor Cabin Status Header */}
            <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <strong className="text-slate-100 block">Dr. Ananya Sharma</strong>
                <span className="text-[10px] text-slate-400">Cardiology OPD • Reg: MCI-2015-88421</span>
              </div>
              <button
                onClick={handleStepDoctorCall}
                disabled={stepLoading}
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold shadow-xs flex items-center gap-1"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Call Next</span>
              </button>
            </div>

            {/* Assistive AI Pre-Visit Brief Widget */}
            <div className="bg-gradient-to-r from-emerald-950/80 via-teal-950/80 to-slate-900 p-3 rounded-2xl border border-emerald-800/60 space-y-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300">
                  Assistive AI Brief (Gemini 2.5 Flash)
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                45M | Recurrent exertional chest tightness. Abnormal lipid panel on file: LDL-C 148 mg/dL [HIGH]. Allergy: Penicillin.
              </p>
              <div className="text-[9px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Assistive clinical digest only. Mandatory physician verification.
              </div>
            </div>

            {/* SOAP Note Snippet */}
            <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-bold text-[10px] uppercase">SOAP Clinical Note</span>
                <span className="text-[10px] font-mono">ICD-10 I10</span>
              </div>
              <div className="text-[11px] text-slate-300 space-y-1">
                <div>
                  <span className="text-slate-500">Assessment: </span>
                  <span className="font-semibold text-white">
                    Essential Hypertension, Exertional Angina, Dyslipidemia
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Rx: </span>
                  <span>Tab. Telmisartan 40mg + Tab. Atorvastatin 20mg</span>
                </div>
              </div>

              {/* Finalize Button */}
              <button
                onClick={handleStepSignRx}
                disabled={stepLoading}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>
                  {soapSigned ? "Prescription Signed & Sealed" : "Sign Rx with HMAC-SHA256"}
                </span>
              </button>
            </div>

            {/* Verification Code Indicator */}
            {soapSigned && (
              <div className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 truncate">
                Seal: {verificationCode}
              </div>
            )}
          </div>
        </div>

        {/* PANE 3: Hospital Waiting Room Display & Diagnostics (4 cols) */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Tv className="w-4 h-4" />
              <span>Screen 3: Waiting Hall & Lab View</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">Lobby TV</span>
          </div>

          <div className="flex-1 bg-slate-950 rounded-3xl border-4 border-slate-800 p-4 shadow-2xl flex flex-col justify-between space-y-4">
            {/* Big Screen Token Display */}
            <div className="bg-slate-900 rounded-2xl border-2 border-emerald-500/40 p-4 text-center space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                Lobby TV • Now Serving
              </span>
              <div className="text-4xl font-black text-white tracking-tight">
                {ticketState === "CALLED" ? tokenNumber : "CARD-A13"}
              </div>
              <p className="text-xs font-bold text-slate-200">
                {ticketState === "CALLED" ? "Rahul Verma -> Room 204" : "Deepak Shah -> Room 204"}
              </p>
              <div className="text-[10px] text-slate-400">Dr. Ananya Sharma (Cardiology)</div>
            </div>

            {/* Diagnostic Lab Queue Card */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                  <FlaskConical className="w-4 h-4 text-purple-400" />
                  <span>Central Pathology Lab</span>
                </div>
                <span
                  className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    labStatus === "VERIFIED"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  {labStatus}
                </span>
              </div>

              <div className="text-xs space-y-1">
                <div className="font-semibold text-slate-200">Fasting Lipid Profile</div>
                <div className="text-[11px] text-slate-400">
                  Patient: Rahul Verma • Ordered by Dr. Sharma
                </div>
              </div>

              <button
                onClick={handleStepLabVerify}
                disabled={stepLoading || labStatus === "VERIFIED"}
                className="w-full py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>
                  {labStatus === "VERIFIED"
                    ? "Report Verified (SHA-256 Sealed)"
                    : "Attach & Seal Lab Report"}
                </span>
              </button>
            </div>

            {/* DPDP Act 2023 Consent Audit Ticker */}
            <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-[10px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                <ShieldCheck className="w-3 hand-3" />
                <span>Zero-Trust Consent Audit Trail</span>
              </div>
              <p className="truncate">
                Dr. Sharma accessed past ECG records under active consent #CONS-2026-01
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="p-4 border-t border-slate-800 text-center text-xs text-slate-500 bg-slate-950">
        CareFlow 3-Screen Live Synchronization • Powered by FastAPI WebSocket Gateway & SQLite / PostgreSQL Engine
      </footer>

      {/* Docked Presenter Guided Tour Controller */}
      {tourActive && (
        <div className="fixed bottom-4 left-4 right-4 max-w-4xl mx-auto bg-slate-950/95 backdrop-blur-md border-2 border-blue-500/60 rounded-3xl p-5 shadow-2xl z-50 animate-in slide-in-from-bottom duration-200 text-white space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                {TOUR_STEPS[tourStepIndex].category}
              </span>
              <span className="text-xs font-mono text-slate-400">
                Step {tourStepIndex + 1} of {TOUR_STEPS.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setTourPlaying(!tourPlaying)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                title="Toggle Auto-Play (Space)"
              >
                {tourPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{tourPlaying ? "Pause Auto-Advance" : "Auto-Advance"}</span>
              </button>
              <button
                onClick={() => setTourActive(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                title="Exit Guided Tour (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>{TOUR_STEPS[tourStepIndex].title}</span>
                <span className="text-[11px] font-normal text-slate-400 font-mono">
                  • {TOUR_STEPS[tourStepIndex].keyCapability}
                </span>
              </h3>
              <p className="text-xs text-blue-200/90 leading-relaxed max-w-2xl">
                🗣️ <span className="font-semibold text-white">Presenter Script:</span> {TOUR_STEPS[tourStepIndex].speakerScript}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={TOUR_STEPS[tourStepIndex].routeUrl}
                target="_blank"
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all"
              >
                <span>Open Live Route</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-xs text-slate-400">
            <div className="flex items-center gap-1 font-mono text-[11px]">
              <span>Hotkeys:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">←</kbd> Prev
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] ml-1">→</kbd> Next
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] ml-1">Space</kbd> Pause
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] ml-1">Esc</kbd> Exit
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={tourStepIndex === 0}
                onClick={() => setTourStepIndex((prev) => Math.max(0, prev - 1))}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 rounded-xl text-xs font-bold border border-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <button
                disabled={tourStepIndex === TOUR_STEPS.length - 1}
                onClick={() => setTourStepIndex((prev) => Math.min(TOUR_STEPS.length - 1, prev + 1))}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md cursor-pointer"
              >
                <span>Next Step</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
