"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  DoorOpen,
  FileCheck2,
  FileText,
  FlaskConical,
  HeartPulse,
  Hospital,
  Layers,
  Lock,
  Plus,
  QrCode,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  User,
  Users,
  Volume2,
} from "lucide-react";
import { api } from "@/lib/api";
import { wsClient } from "@/lib/ws";

interface QueuePatient {
  id: string;
  appointment_id: string;
  ticket_number: string;
  sequence_number: number;
  patient_name: string;
  patient_id?: string;
  state: string;
  check_in_time: string;
  estimated_wait_minutes: number;
  reason?: string;
}

interface DoctorQueueData {
  doctor_id: string;
  current_patient: QueuePatient | null;
  waiting_patients: QueuePatient[];
  waiting_count: number;
  completed_count: number;
  total_today: number;
}

interface PreVisitBrief {
  patient_id: string;
  patient_name: string;
  age?: number;
  gender?: string;
  blood_group?: string;
  allergies: string[];
  chronic_conditions: string[];
  recent_consultations_count: number;
  recent_prescriptions_count: number;
  recent_lab_reports_count: number;
  clinical_timeline: Array<{
    date: string;
    event: string;
    provider: string;
    summary: string;
  }>;
  clinical_synthesis_notes: string;
  is_ai_generated: boolean;
  ai_model: string;
  safety_disclaimer: string;
}

interface RxItem {
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  special_instructions?: string;
}

export default function DoctorCockpitPage() {
  const [doctorId, setDoctorId] = useState<string>("0fffe2b7-1767-42d2-a126-c068066d0323"); // Dr. Ananya Sharma
  const [queueData, setQueueData] = useState<DoctorQueueData | null>(null);
  const [activePatient, setActivePatient] = useState<QueuePatient | null>(null);
  const [aiBrief, setAiBrief] = useState<PreVisitBrief | null>(null);
  const [aiBriefOpen, setAiBriefOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [callLoading, setCallLoading] = useState(false);
  const [finalizeLoading, setFinalizeLoading] = useState(false);
  const [signedResult, setSignedResult] = useState<any | null>(null);

  // SOAP State
  const [subjective, setSubjective] = useState(
    "Patient reports intermittent retrosternal chest heaviness over past 3 weeks, primarily after brisk morning walking. Subsides with rest within 5-10 minutes. No orthopnea or PND."
  );
  const [objective, setObjective] = useState(
    "BP: 142/88 mmHg | Heart Rate: 74 bpm (Regular) | SpO2: 98% on room air\nCVS: S1 S2 heard, no murmurs or clicks. Chest: Bilateral clear, no crepitations."
  );
  const [assessment, setAssessment] = useState(
    "Essential Hypertension (ICD-10 I10), Exertional Angina / Suspected CAD, Mixed Dyslipidemia."
  );
  const [plan, setPlan] = useState(
    "1. Dietary salt restriction (<5g/day) and low saturated fat.\n2. Initiate anti-hypertensive and statin therapy.\n3. Laboratory lipid panel and resting ECG."
  );

  // Prescriptions
  const [rxItems, setRxItems] = useState<RxItem[]>([
    {
      medicine_name: "Tab. Telmisartan",
      dosage: "40 mg",
      frequency: "1-0-0 (Morning after breakfast)",
      duration_days: 30,
      special_instructions: "Monitor blood pressure weekly",
    },
    {
      medicine_name: "Tab. Atorvastatin",
      dosage: "20 mg",
      frequency: "0-0-1 (Night before sleep)",
      duration_days: 30,
      special_instructions: "Report any muscle aches",
    },
  ]);

  // Lab Orders
  const [selectedLabTests, setSelectedLabTests] = useState<string[]>([
    "Fasting Lipid Profile",
    "Serum Creatinine & eGFR",
    "12-Lead Resting ECG",
  ]);

  // Follow-up
  const [followUpDays, setFollowUpDays] = useState(30);

  useEffect(() => {
    initDoctorSession();
  }, []);

  const initDoctorSession = async () => {
    setLoading(true);
    try {
      // Check current user session
      const me = await api.get<any>("/auth/me").catch(() => null);
      let targetDoctorId = doctorId;
      if (me?.doctor_profile?.id) {
        targetDoctorId = me.doctor_profile.id;
        setDoctorId(targetDoctorId);
      }

      await loadQueue(targetDoctorId);

      // Connect WebSocket for doctor queue room
      wsClient.connect();
      wsClient.subscribe(`doctor:${targetDoctorId}:queue`, (msg) => {
        console.log("Doctor queue ws update:", msg);
        loadQueue(targetDoctorId);
      });
    } catch (err) {
      console.error("Failed to init doctor session:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadQueue = async (docId: string) => {
    try {
      const q = await api.get<DoctorQueueData>(`/queue/doctor/${docId}`);
      setQueueData(q);

      // Automatically select active or first patient
      const candidate = q.current_patient || q.waiting_patients[0] || null;
      if (candidate && (!activePatient || activePatient.id === candidate.id)) {
        selectPatientForConsultation(candidate);
      }
    } catch (err) {
      console.error("Failed to load queue:", err);
    }
  };

  const selectPatientForConsultation = async (patient: QueuePatient) => {
    setActivePatient(patient);
    setSignedResult(null);

    // Fetch AI Pre-Visit Briefing if patient_id exists
    if (patient.patient_id) {
      try {
        const brief = await api.get<PreVisitBrief>(`/ai/pre-visit-brief/${patient.patient_id}`);
        setAiBrief(brief);
      } catch (err) {
        console.warn("AI Briefing unavailable, using clinical fallbacks:", err);
      }
    }
  };

  const handleCallNext = async () => {
    setCallLoading(true);
    try {
      const res = await api.post<any>(`/queue/doctor/${doctorId}/call-next`);
      await loadQueue(doctorId);
    } catch (err: any) {
      alert(err.message || "Failed to call next patient.");
    } finally {
      setCallLoading(false);
    }
  };

  const handleAddRxItem = () => {
    setRxItems((prev) => [
      ...prev,
      {
        medicine_name: "",
        dosage: "",
        frequency: "1-0-0",
        duration_days: 14,
      },
    ]);
  };

  const handleRemoveRxItem = (index: number) => {
    setRxItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateRxItem = (index: number, field: keyof RxItem, val: any) => {
    setRxItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const toggleLabTest = (testName: string) => {
    setSelectedLabTests((prev) =>
      prev.includes(testName) ? prev.filter((t) => t !== testName) : [...prev, testName]
    );
  };

  const handleFinalizeEncounter = async () => {
    if (!activePatient) return;
    setFinalizeLoading(true);
    try {
      const today = new Date();
      const followUp = new Date(today.getTime() + followUpDays * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const payload = {
        appointment_id: activePatient.appointment_id,
        subjective,
        objective,
        assessment,
        plan,
        prescription_items: rxItems.filter((i) => i.medicine_name.trim().length > 0),
        prescription_instructions: "Take medications with lukewarm water as scheduled.",
        follow_up_date: followUp,
        lab_orders: selectedLabTests.map((t) => ({
          test_name: t,
          priority: "ROUTINE",
          clinical_notes: "Evaluate cardiovascular risk markers",
        })),
      };

      const res = await api.post<any>("/clinical/encounters/complete", payload);
      setSignedResult(res);
      await loadQueue(doctorId);
    } catch (err: any) {
      alert(err.message || "Failed to finalize consultation.");
    } finally {
      setFinalizeLoading(false);
    }
  };

  const switchDoctorPersona = async () => {
    try {
      const res = await api.post<{ access_token: string }>("/auth/login", {
        identifier: "dr.ananya@citycare.com",
        password: "password123",
      });
      api.setToken(res.access_token);
      localStorage.setItem("careflow_active_persona", "Dr. Ananya Sharma (Cardiology)");
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Clinical Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
            <Stethoscope className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                Dr. Ananya Sharma, MD (Cardiology)
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full">
                MCI-2015-88421
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <span>Cardiology OPD</span>
              <span>•</span>
              <span className="font-semibold text-slate-700">Room 204</span>
              <span>•</span>
              <span>CityCare Superspecialty Hospital</span>
            </p>
          </div>
        </div>

        {/* Action Controls & Queue Summary */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <Users className="w-4 h-4 text-emerald-600" />
            <span className="text-slate-500">In Waiting:</span>
            <strong className="text-slate-900">{queueData?.waiting_count ?? 0}</strong>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">Completed:</span>
            <strong className="text-slate-900">{queueData?.completed_count ?? 0}</strong>
          </div>

          <button
            onClick={handleCallNext}
            disabled={callLoading || !queueData?.waiting_count}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Bell className="w-4 h-4" />
            {callLoading ? "Calling Next..." : "Call Next Patient"}
          </button>

          <button
            onClick={switchDoctorPersona}
            className="text-[11px] text-slate-400 hover:text-slate-700 underline"
            title="Log in directly as Dr. Ananya Sharma"
          >
            Force Doctor Auth
          </button>
        </div>
      </div>

      {/* Main Two-Column Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Queue Roster (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" />
                <span>Today&apos;s Live OPD Queue</span>
              </h3>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                EWMA Pacing
              </span>
            </div>

            {/* Currently Serving Box */}
            {queueData?.current_patient ? (
              <div
                onClick={() => selectPatientForConsultation(queueData.current_patient!)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  activePatient?.id === queueData.current_patient.id
                    ? "bg-teal-50/70 border-teal-500 shadow-xs"
                    : "bg-amber-50/50 border-amber-300 hover:border-teal-400"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
                    {queueData.current_patient.state === "CALLED" ? "CALLED (ENTERING)" : "IN CONSULTATION"}
                  </span>
                  <span className="text-xl font-black text-slate-900">
                    {queueData.current_patient.ticket_number}
                  </span>
                </div>
                <h4 className="font-bold text-base text-slate-900 mt-2">
                  {queueData.current_patient.patient_name}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {queueData.current_patient.reason || "Scheduled consultation"}
                </p>
                <div className="mt-2 text-[11px] text-teal-700 font-semibold flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Active in Consultation Room</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
                No patient currently in consultation room. Press &quot;Call Next Patient&quot; to summon the next in queue.
              </div>
            )}

            {/* Waiting Queue List */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Waiting List ({queueData?.waiting_patients?.length ?? 0})
              </span>

              {queueData?.waiting_patients?.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No other patients waiting in corridor.
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {queueData?.waiting_patients?.map((pat) => (
                    <div
                      key={pat.id}
                      onClick={() => selectPatientForConsultation(pat)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        activePatient?.id === pat.id
                          ? "bg-teal-50 border-teal-500"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-900">{pat.patient_name}</strong>
                        <span className="font-mono font-bold text-teal-700">{pat.ticket_number}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 mt-1 text-[11px]">
                        <span>Checked in: {pat.check_in_time}</span>
                        <span>~{pat.estimated_wait_minutes}m wait</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Clinical Encounter & Assistive AI (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {activePatient ? (
            <div className="space-y-6">
              {/* Encounter Patient Banner */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900">
                      {activePatient.patient_name}
                    </h2>
                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                      {activePatient.ticket_number}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Chief Complaint: <strong className="text-slate-800">{activePatient.reason || "Hypertension & Angina review"}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    ABHA Records Shared
                  </span>
                </div>
              </div>

              {/* Assistive Pre-Visit AI Brief Accordion */}
              {aiBrief && (
                <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 text-white rounded-3xl p-5 shadow-md border border-emerald-900/60 space-y-3">
                  <div
                    onClick={() => setAiBriefOpen(!aiBriefOpen)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-emerald-400" />
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-100">
                          Assistive Pre-Visit Briefing
                        </h4>
                        <p className="text-[11px] text-emerald-400 font-mono">
                          {aiBrief.ai_model}
                        </p>
                      </div>
                    </div>
                    <button className="text-slate-400 hover:text-white">
                      {aiBriefOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>

                  {aiBriefOpen && (
                    <div className="space-y-4 pt-3 border-t border-slate-800/80 animate-in fade-in duration-150">
                      {/* Safety Disclaimer Banner */}
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-200 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>{aiBrief.safety_disclaimer}</span>
                      </div>

                      {/* Synthesis Notes */}
                      <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                        {aiBrief.clinical_synthesis_notes}
                      </div>

                      {/* Quick Summary Badges */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 block uppercase">Allergies</span>
                          <span className="font-bold text-rose-300">
                            {aiBrief.allergies.join(", ") || "None Known"}
                          </span>
                        </div>
                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 block uppercase">Conditions</span>
                          <span className="font-bold text-slate-200">
                            {aiBrief.chronic_conditions.join(", ") || "None"}
                          </span>
                        </div>
                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 block uppercase">Prior Encounters</span>
                          <span className="font-bold text-teal-300">
                            {aiBrief.recent_consultations_count} Encounters
                          </span>
                        </div>
                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 block uppercase">Lab Reports</span>
                          <span className="font-bold text-purple-300">
                            {aiBrief.recent_lab_reports_count} Verified
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Success Result Modal / Card */}
              {signedResult && (
                <div className="bg-emerald-50 border-2 border-emerald-500 rounded-3xl p-6 shadow-md space-y-4 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-slate-900">
                          Encounter Completed & Cryptographically Signed
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Prescription sealed with HMAC-SHA256. Stored in Patient Care Journey.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-emerald-200 text-xs font-mono space-y-1">
                    <div className="text-slate-500">Public Verification Code:</div>
                    <div className="font-bold text-sm text-emerald-800 break-all">
                      {signedResult.verification_code}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/verify/rx/${signedResult.verification_code}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700"
                    >
                      <FileCheck2 className="w-4 h-4" />
                      <span>Verify Digital Rx in Registry</span>
                    </Link>
                    <button
                      onClick={() => setSignedResult(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* SOAP Documentation Form */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-teal-600" />
                    <span>SOAP Clinical Documentation</span>
                  </h3>
                  <span className="text-xs text-slate-400">HL7® FHIR® R4 Encounter Format</span>
                </div>

                {/* S - Subjective */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subjective (Patient Complaints & History)
                  </label>
                  <textarea
                    rows={2}
                    value={subjective}
                    onChange={(e) => setSubjective(e.target.value)}
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/30 font-sans"
                  />
                </div>

                {/* O - Objective */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Objective (Physical Examination & Vitals)
                  </label>
                  <textarea
                    rows={2}
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/30 font-sans"
                  />
                </div>

                {/* A - Assessment */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assessment (Clinical Diagnosis & ICD-10)
                  </label>
                  <input
                    type="text"
                    value={assessment}
                    onChange={(e) => setAssessment(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/30 font-sans font-semibold text-slate-900"
                  />
                </div>

                {/* P - Plan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Plan (Lifestyle & Non-Pharmacological Advice)
                  </label>
                  <textarea
                    rows={2}
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/30 font-sans"
                  />
                </div>
              </div>

              {/* Prescription Builder */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-base text-slate-900">
                      Prescription Builder (Cryptographically Sealed)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRxItem}
                    className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Drug</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {rxItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                    >
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                          Drug & Formulation
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Tab. Telmisartan"
                          value={item.medicine_name}
                          onChange={(e) => handleUpdateRxItem(idx, "medicine_name", e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                          Dosage
                        </label>
                        <input
                          type="text"
                          placeholder="40 mg"
                          value={item.dosage}
                          onChange={(e) => handleUpdateRxItem(idx, "dosage", e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                          Frequency
                        </label>
                        <input
                          type="text"
                          placeholder="1-0-0 morning"
                          value={item.frequency}
                          onChange={(e) => handleUpdateRxItem(idx, "frequency", e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                          Days
                        </label>
                        <input
                          type="number"
                          value={item.duration_days}
                          onChange={(e) =>
                            handleUpdateRxItem(idx, "duration_days", parseInt(e.target.value) || 1)
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                        />
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveRxItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lab Requisitions & Follow-up Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lab Test Requisition */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <FlaskConical className="w-4 h-4 text-purple-600" />
                    <h4 className="font-bold text-sm text-slate-900">
                      Diagnostics Requisition
                    </h4>
                  </div>

                  <div className="space-y-2">
                    {[
                      "Fasting Lipid Profile",
                      "Serum Creatinine & eGFR",
                      "12-Lead Resting ECG",
                      "HbA1c & Fasting Glucose",
                      "Complete Blood Count (CBC)",
                    ].map((test) => {
                      const isChecked = selectedLabTests.includes(test);
                      return (
                        <label
                          key={test}
                          onClick={() => toggleLabTest(test)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer select-none transition-colors ${
                            isChecked
                              ? "bg-purple-50/70 border-purple-300 text-purple-950 font-semibold"
                              : "bg-slate-50 border-slate-200 text-slate-600"
                          }`}
                        >
                          <span>{test}</span>
                          <span
                            className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                              isChecked
                                ? "bg-purple-600 border-purple-600 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Follow-up & Finalize Card */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <h4 className="font-bold text-sm text-slate-900">
                        Follow-Up Schedule
                      </h4>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[14, 30, 60].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setFollowUpDays(d)}
                          className={`py-2 text-xs font-semibold rounded-xl border transition-colors ${
                            followUpDays === d
                              ? "bg-amber-600 text-white border-amber-600"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {d} Days
                        </button>
                      ))}
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Follow-up appointment will be automatically queued in the Care Journey with reminders.
                    </p>
                  </div>

                  {/* Finalize Encounter Button */}
                  <div className="pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleFinalizeEncounter}
                      disabled={finalizeLoading}
                      className="w-full py-3.5 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                    >
                      <Lock className="w-4 h-4" />
                      {finalizeLoading
                        ? "Cryptographically Signing..."
                        : "Finalize Consultation & Sign Rx"}
                    </button>
                    <p className="text-[10px] text-slate-400 text-center mt-1.5">
                      Signs prescription with HMAC-SHA256 and advances Care Journey.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <Stethoscope className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-base text-slate-700">No Patient Selected</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Select a patient from today&apos;s queue roster on the left or press &quot;Call Next Patient&quot; to begin consultation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

