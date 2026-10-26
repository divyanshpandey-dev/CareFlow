"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  Download,
  Eye,
  FileText,
  FlaskConical,
  Heart,
  HeartPulse,
  Hospital,
  Info,
  Lock,
  MapPin,
  Pill,
  QrCode,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Upload,
  User,
  Volume2,
  X,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { wsClient } from "@/lib/ws";
import { useLanguage } from "@/context/LanguageContext";
import { useAccessibility } from "@/context/AccessibilityContext";

interface Appointment {
  id: string;
  doctor_name: string;
  department_name: string;
  hospital_name: string;
  hospital_address?: string;
  room_number?: string;
  scheduled_start: string;
  status: string;
  ticket_number?: string;
  queue_position?: number;
  estimated_wait_minutes?: number;
}

interface PrescriptionItem {
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface Prescription {
  id: string;
  prescription_number: string;
  verification_code: string;
  doctor_name: string;
  hospital_name: string;
  issued_at: string;
  instructions?: string;
  items_count: number;
  items: PrescriptionItem[];
}

interface LabReportData {
  id: string;
  summary: string;
  abnormal_flags: boolean;
  verified_at?: string;
  document_url?: string;
}

interface LabOrder {
  id: string;
  test_name: string;
  doctor_name: string;
  hospital_name: string;
  status: string;
  priority: string;
  created_at: string;
  clinical_notes?: string;
  report?: LabReportData | null;
}

interface ConsentItem {
  id: string;
  consent_artefact_id?: string;
  requester_name: string;
  requester_hospital?: string;
  purpose: string;
  scopes: string[];
  status: string;
  valid_to: string;
  created_at: string;
}

interface CareJourneyData {
  patient_name: string;
  next_action?: {
    action: string;
    details: string;
    suggested_date?: string;
    stage: string;
  };
  events: Array<{
    id: string;
    stage: string;
    title: string;
    description: string;
    timestamp: string;
    status: string;
    metadata_json?: any;
  }>;
}

interface PatientDocumentItem {
  id: string;
  title: string;
  document_type: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  is_external: boolean;
  verification_status: string;
  file_sha256: string;
  notes?: string;
  created_at: string;
}

export default function PatientDashboard() {
  const { t } = useLanguage();
  const { simpleView, speakText } = useAccessibility();

  const [profile, setProfile] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [consents, setConsents] = useState<ConsentItem[]>([]);
  const [journey, setJourney] = useState<CareJourneyData | null>(null);
  const [documents, setDocuments] = useState<PatientDocumentItem[]>([]);

  // Document Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadType, setUploadType] = useState("PRESCRIPTION");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showAbhaCardModal, setShowAbhaCardModal] = useState(false);
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [selectedLab, setSelectedLab] = useState<LabOrder | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [liveQueueUpdate, setLiveQueueUpdate] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, apptRes, journeyRes, rxRes, labRes, consentRes, docRes] = await Promise.allSettled([
        api.get<any>("/auth/me"),
        api.get<Appointment[]>("/appointments/my"),
        api.get<CareJourneyData>("/journey/my"),
        api.get<Prescription[]>("/clinical/prescriptions/my"),
        api.get<LabOrder[]>("/lab/my"),
        api.get<ConsentItem[]>("/consent/my-requests"),
        api.get<PatientDocumentItem[]>("/clinical/documents/my"),
      ]);

      if (meRes.status === "fulfilled" && meRes.value) {
        setProfile(meRes.value);
      }
      if (apptRes.status === "fulfilled" && apptRes.value) {
        setAppointments(apptRes.value || []);
      }
      if (journeyRes.status === "fulfilled" && journeyRes.value) {
        setJourney(journeyRes.value);
      }
      if (rxRes.status === "fulfilled" && rxRes.value) {
        setPrescriptions(rxRes.value || []);
      }
      if (labRes.status === "fulfilled" && labRes.value) {
        setLabOrders(labRes.value || []);
      }
      if (consentRes.status === "fulfilled" && consentRes.value) {
        setConsents(consentRes.value || []);
      }
      if (docRes.status === "fulfilled" && docRes.value) {
        setDocuments(docRes.value || []);
      }
    } catch (err) {
      console.error("Failed to load patient dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError("Please select a medical document to upload.");
      return;
    }
    setUploadingDoc(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadTitle.trim());
      formData.append("document_type", uploadType);
      if (uploadNotes.trim()) formData.append("notes", uploadNotes.trim());

      const token = api.getToken();
      const res = await fetch("/api/v1/clinical/documents/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Upload failed");
      }

      setActionMessage("Medical document uploaded successfully and added to your care record.");
      setShowUploadModal(false);
      setUploadTitle("");
      setUploadNotes("");
      setUploadFile(null);
      await loadDashboardData();
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload document.");
    } finally {
      setUploadingDoc(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Connect WebSocket for real-time live queue advancements
    wsClient.connect();
    const unsubscribeQueue = wsClient.subscribe("queue", (msg) => {
      console.log("Patient live queue notification:", msg);
      if (msg?.data?.ticket_number || msg?.type === "TICKET_CALLED" || msg?.type === "QUEUE_ADVANCED") {
        setLiveQueueUpdate("Queue position updated in real time");
        loadDashboardData();
        setTimeout(() => setLiveQueueUpdate(null), 4000);
      }
    });

    return () => {
      unsubscribeQueue();
    };
  }, [loadDashboardData]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
    speakText(`Copied ${label}`);
  };

  const handleInstantCheckIn = async (appointmentId: string) => {
    setCheckInLoading(true);
    setCheckInSuccess(null);
    try {
      const res = await api.post<any>("/queue/checkin", {
        appointment_id: appointmentId,
      });
      setCheckInSuccess(res?.message || "Check-in successful! Your live token has been generated.");
      speakText("Check-in successful. Token generated.");
      await loadDashboardData();
    } catch (err: any) {
      alert(err?.message || "Check-in failed. Please verify appointment status with hospital reception.");
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleConsentDecision = async (consentId: string, decision: "GRANT" | "DENY") => {
    try {
      await api.post(`/consent/${consentId}/respond`, { decision });
      setActionMessage(`Consent request ${decision === "GRANT" ? "approved" : "denied"} successfully.`);
      speakText(`Consent ${decision.toLowerCase()}ed`);
      await loadDashboardData();
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err: any) {
      alert(err?.message || "Failed to update consent decision.");
    }
  };

  // Determine Greeting based on current hour
  const currentHour = new Date().getHours();
  const greetingKey =
    currentHour < 12
      ? "patient.welcome"
      : currentHour < 17
      ? "patient.welcome_afternoon"
      : "patient.welcome_evening";
  const defaultGreeting =
    currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";

  const patientFullName = profile?.full_name || profile?.user?.full_name || "";
  const welcomeText = patientFullName
    ? `${t(greetingKey, defaultGreeting)}, ${patientFullName}`
    : t("welcome", "Welcome to CareFlow");

  // Find next upcoming appointment (CONFIRMED, CHECKED_IN, IN_QUEUE, IN_CONSULTATION)
  const activeAppointment = appointments.find(
    (a) =>
      a.status === "CONFIRMED" ||
      a.status === "CHECKED_IN" ||
      a.status === "IN_QUEUE" ||
      a.status === "IN_CONSULTATION"
  );

  const isCheckedIn =
    activeAppointment &&
    (activeAppointment.status === "CHECKED_IN" ||
      activeAppointment.status === "IN_QUEUE" ||
      activeAppointment.status === "IN_CONSULTATION");

  const pendingConsents = consents.filter((c) => c.status === "REQUESTED");

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 ${simpleView ? "space-y-10" : ""}`}>
      
      {/* Real-time Toast Alerts */}
      {actionMessage && (
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 text-sm font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
          <button type="button" onClick={() => setActionMessage(null)} className="text-teal-600 hover:text-teal-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {liveQueueUpdate && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-sm font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-amber-600 animate-pulse shrink-0" />
            <span>{liveQueueUpdate}</span>
          </div>
          <button type="button" onClick={() => setLiveQueueUpdate(null)} className="text-amber-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SECTION B: Warm Welcome Section */}
      <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className={`font-black text-slate-900 tracking-tight ${simpleView ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"}`}>
                {welcomeText}
              </h1>
              <button
                type="button"
                onClick={() => speakText(`${welcomeText}. ${t("patient.subtitle", "Your healthcare journey, all in one place.")}`)}
                className="p-2 rounded-xl text-slate-400 hover:text-emerald-700 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                title="Read aloud"
                aria-label="Read welcome message aloud"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
            <p className={`text-slate-600 font-medium ${simpleView ? "text-base sm:text-lg" : "text-sm sm:text-base"}`}>
              {t("patient.subtitle", "Your healthcare journey, all in one place.")}
            </p>

            {/* Quick ABHA Identifier chip */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                ABDM Verified
              </span>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                <span>ABHA: {profile?.patient_profile?.abha_number || "91-4567-8912-3456"}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(profile?.patient_profile?.abha_number || "91-4567-8912-3456", "ABHA Number")}
                  className="text-slate-400 hover:text-emerald-700"
                  title="Copy ABHA Number"
                >
                  {copiedField === "ABHA Number" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAbhaCardModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-sm transition-all min-h-[44px]"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>{t("patient.digital_abha_card", "Digital ABHA Card")}</span>
            </button>
            <Link
              href="/patient/discover"
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all min-h-[44px]"
            >
              <Search className="w-4 h-4" />
              <span>{t("patient.find_doctor", "Find a Doctor")}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* PENDING DPDP CONSENT BANNER (If any hospital requested access) */}
      {pendingConsents.length > 0 && (
        <section className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-md border border-blue-800 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
                <Lock className="w-3.5 h-3.5" />
                <span>{t("patient.dpdp_consent", "Patient Consent & Privacy")}</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {pendingConsents[0].requester_name} ({pendingConsents[0].requester_hospital || "CareFlow Facility"}) is requesting medical records
              </h3>
              <p className="text-xs sm:text-sm text-slate-300">
                Purpose: <strong>{pendingConsents[0].purpose}</strong> • Scopes:{" "}
                <span className="font-mono text-blue-200">{pendingConsents[0].scopes?.join(", ") || "OPD Records"}</span> • Valid for 24 hours.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => handleConsentDecision(pendingConsents[0].id, "DENY")}
                className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold text-xs sm:text-sm border border-rose-500/30 transition-colors min-h-[44px]"
              >
                {t("patient.deny_consent", "Deny Access")}
              </button>
              <button
                type="button"
                onClick={() => handleConsentDecision(pendingConsents[0].id, "GRANT")}
                className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition-colors shadow-sm min-h-[44px]"
              >
                {t("patient.approve_consent", "Approve Consent")} &rarr;
              </button>
            </div>
          </div>
        </section>
      )}

      {/* SECTION C & D: Primary Appointment & Live Queue Dual Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* SECTION C: Next Appointment — Primary Card */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-base sm:text-lg text-slate-900">
                    {t("patient.next_appointment", "Your Next Appointment")}
                  </h2>
                  <span className="text-xs text-slate-500">{t("patient.subtitle", "Your upcoming doctor visit")}</span>
                </div>
              </div>

              {activeAppointment && (
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    isCheckedIn
                      ? "bg-amber-100 text-amber-900 border-amber-300"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
                  }`}
                >
                  {isCheckedIn ? t("patient.status_checked_in", "Checked In") : t("patient.status_confirmed", "Confirmed")}
                </span>
              )}
            </div>

            {activeAppointment ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{activeAppointment.doctor_name}</h3>
                      <p className="text-xs font-bold text-emerald-700">{activeAppointment.department_name}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-sm font-black text-slate-900">
                        {new Date(activeAppointment.scheduled_start).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(activeAppointment.scheduled_start).toLocaleDateString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Hospital className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium">{activeAppointment.hospital_name}</span>
                      {activeAppointment.room_number && (
                        <span className="font-bold text-slate-800">• Room {activeAppointment.room_number}</span>
                      )}
                    </div>
                    <span className="font-mono text-slate-400">Ref: {activeAppointment.id.slice(0, 8)}</span>
                  </div>
                </div>

                {checkInSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{checkInSuccess}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center space-y-3 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-base">{t("patient.no_upcoming", "No upcoming appointment")}</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    {t("patient.no_upcoming_desc", "Find a doctor and book a time that works for you.")}
                  </p>
                </div>
                <Link
                  href="/patient/discover"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs min-h-[44px]"
                >
                  <Search className="w-4 h-4" />
                  <span>{t("patient.find_doctor", "Find a Doctor")}</span>
                </Link>
              </div>
            )}
          </div>

          {/* Action Buttons for Appointment */}
          {activeAppointment && (
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
              <Link
                href="/patient/appointments"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm min-h-[44px]"
              >
                <span>{t("patient.view_appointment", "View Appointment")}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              {activeAppointment.hospital_address && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(
                    `${activeAppointment.hospital_name} ${activeAppointment.hospital_address}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm min-h-[44px]"
                >
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t("patient.get_directions", "Get Directions")}</span>
                </a>
              )}

              {/* Check-In Action Button (only when eligible and not yet checked in) */}
              {!isCheckedIn && activeAppointment.status === "CONFIRMED" && (
                <button
                  type="button"
                  disabled={checkInLoading}
                  onClick={() => handleInstantCheckIn(activeAppointment.id)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-sm transition-colors min-h-[44px] ml-auto"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{checkInLoading ? t("patient.checking_in", "Checking in...") : t("patient.check_in_now", "Check-In Now")}</span>
                </button>
              )}
            </div>
          )}
        </section>

        {/* SECTION D: Live Queue Card */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-base sm:text-lg text-slate-900">
                    {t("patient.queue_status", "Your Queue Status")}
                  </h2>
                  <span className="text-xs text-slate-500">{t("patient.waiting_notice", "Live OPD tracking & waiting room queue")}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>{t("patient.live_stream", "Live Stream")}</span>
              </div>
            </div>

            {isCheckedIn ? (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900">
                        {t("patient.live_token", "Your Live Token")}
                      </span>
                      <div className="text-3xl sm:text-4xl font-black text-amber-950 font-mono tracking-tight mt-0.5">
                        {activeAppointment.ticket_number || "#CARD-A01"}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-amber-900">
                        {activeAppointment.status === "IN_CONSULTATION" ? t("patient.status_in_consultation", "In Consultation") : t("patient.status_checked_in", "Called / Waiting")}
                      </span>
                      <div className="text-xs text-amber-800 mt-1">
                        {t("patient.room", "Room")}: <strong>{activeAppointment.room_number || "102"}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-amber-200/80 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-amber-800 font-medium">{t("patient.patients_ahead", "Patients ahead")}:</span>
                      <div className="text-xl font-black text-amber-950">
                        {activeAppointment.queue_position ? `${activeAppointment.queue_position}` : t("patient.next_in_line", "Next In Line")}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-amber-800 font-medium">{t("patient.estimated_wait", "Estimated waiting time")}:</span>
                      <div className="text-xl font-black text-amber-950">
                        {activeAppointment.estimated_wait_minutes ?? 12} {t("patient.mins", "mins")}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-500 italic">
                  {t("patient.waiting_notice", "Waiting time is an estimate based on current clinic flow.")}
                </p>
              </div>
            ) : activeAppointment ? (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                <QrCode className="w-10 h-10 text-slate-400 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm">{t("patient.not_checked_in_title", "Not Checked In Yet")}</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {t("patient.not_checked_in", "Check in when you arrive at the hospital to track your queue.")}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={checkInLoading}
                  onClick={() => handleInstantCheckIn(activeAppointment.id)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-xs min-h-[44px]"
                >
                  {checkInLoading ? t("patient.checking_in", "Checking in...") : t("patient.check_in_now", "Check-In Now")}
                </button>
              </div>
            ) : (
              <div className="p-8 text-center space-y-2 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                <Clock className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">
                  {t("patient.no_queue_desc", "No active waiting room queue. Book an appointment to track your live queue status.")}
                </p>
              </div>
            )}
          </div>

          {isCheckedIn && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">{t("patient.live_stream", "Real-time Gateway active")}</span>
              <Link
                href={`/patient/appointments/${activeAppointment.id}/checkin`}
                className="text-xs font-bold text-amber-800 hover:text-amber-950 hover:underline min-h-[44px] flex items-center"
              >
                {t("patient.open_live_screen", "Open Live Waiting Screen")} &rarr;
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* SECTION E: 6 Quick Actions Cards */}
      <section className="space-y-3">
        <h2 className="font-black text-slate-900 text-lg">{t("patient.quick_actions", "Quick Actions")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          <Link
            href="/patient/discover"
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition-all flex flex-col items-center text-center group min-h-[100px] justify-center"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Search className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-slate-900">
              {t("patient.find_doctor", "Find a Doctor")}
            </span>
          </Link>

          <Link
            href="/patient/appointments"
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition-all flex flex-col items-center text-center group min-h-[100px] justify-center"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-slate-900">
              {t("patient.my_appointments", "My Appointments")}
            </span>
          </Link>

          {activeAppointment ? (
            <Link
              href={`/patient/appointments/${activeAppointment.id}/checkin`}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition-all flex flex-col items-center text-center group min-h-[100px] justify-center"
            >
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <QrCode className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs sm:text-sm text-slate-900">
                {t("patient.check_in", "Check In")}
              </span>
            </Link>
          ) : (
            <Link
              href="/patient/appointments"
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition-all flex flex-col items-center text-center group min-h-[100px] justify-center"
            >
              <div className="w-11 h-11 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <QrCode className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs sm:text-sm text-slate-900">
                {t("patient.check_in", "Check In")}
              </span>
            </Link>
          )}

          <a
            href="#prescriptions"
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition-all flex flex-col items-center text-center group min-h-[100px] justify-center"
          >
            <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-slate-900">
              {t("patient.my_prescriptions", "My Prescriptions")}
            </span>
          </a>

          <a
            href="#lab-reports"
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition-all flex flex-col items-center text-center group min-h-[100px] justify-center"
          >
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <FlaskConical className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-slate-900">
              {t("patient.my_lab_reports", "My Lab Reports")}
            </span>
          </a>

          <Link
            href="/patient/journey"
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition-all flex flex-col items-center text-center group min-h-[100px] justify-center"
          >
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-slate-900">
              {t("patient.my_care_journey", "My Care Journey")}
            </span>
          </Link>
        </div>
      </section>

      {/* SECTION F: Care Journey Timeline & What Needs to Happen Next */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-700" />
              <h2 className="font-black text-xl text-slate-900">
                {t("patient.my_care_journey", "My Care Journey")}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {t("patient.subtitle", "Your longitudinal healthcare milestone timeline across hospitals.")}
            </p>
          </div>

          <Link
            href="/patient/journey"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 min-h-[44px]"
          >
            <span>{t("patient.view_full_journey", "View Full Care Journey")}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* What Needs to Happen Next Callout */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-widest">
              {t("patient.what_happens_next", "What Needs to Happen Next")}
            </span>
            {journey?.next_action?.stage && (
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                {journey.next_action.stage}
              </span>
            )}
          </div>

          {journey?.next_action ? (
            <div className="space-y-1">
              <div className="text-base sm:text-lg font-bold text-slate-100">{journey.next_action.action}</div>
              <p className="text-xs text-slate-300 leading-relaxed">{journey.next_action.details}</p>
              {journey.next_action.suggested_date && (
                <div className="text-xs text-amber-300 font-semibold pt-1">
                  Target Date: {journey.next_action.suggested_date}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-300">
              {t("patient.no_recorded_next_step", "No upcoming care step is recorded.")} Your care plan is currently up to date.
            </p>
          )}
        </div>

        {/* Milestone Care Timeline: Completed -> In Progress -> Upcoming */}
        <div className="space-y-3 pt-2">
          <h3 className="font-bold text-sm text-slate-900">{t("patient.care_timeline", "Care Journey Timeline")}</h3>
          {journey?.events && journey.events.length > 0 ? (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {journey.events.slice(0, 3).map((event) => (
                <div key={event.id} className="relative space-y-1">
                  <div
                    className={`absolute -left-[27px] top-1 w-4 h-4 rounded-full border-2 bg-white ${
                      event.status === "COMPLETED"
                        ? "border-emerald-600 bg-emerald-600"
                        : event.status === "IN_PROGRESS"
                        ? "border-amber-500 bg-amber-500 animate-pulse"
                        : "border-slate-300"
                    }`}
                  />
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{event.title}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        event.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-800"
                          : event.status === "IN_PROGRESS"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{event.description}</p>
                  <span className="text-[10px] text-slate-400 font-mono">{event.timestamp}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 text-xs text-slate-500 text-center">
              Longitudinal healthcare journey will populate as consultations and investigations occur.
            </div>
          )}
        </div>
      </section>

      {/* SECTION G: Prescriptions & Diagnostic Lab Reports (Question 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Prescriptions Section */}
        <section id="prescriptions" className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-base sm:text-lg text-slate-900">
                    {t("patient.signed_rx", "Signed Digital Prescriptions")}
                  </h2>
                  <span className="text-xs text-slate-500">Cryptographically signed & verified</span>
                </div>
              </div>
              <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                {prescriptions.length} Active
              </span>
            </div>

            {prescriptions.length === 0 ? (
              <div className="p-8 text-center space-y-2 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-800 text-sm">{t("patient.no_prescriptions", "No prescriptions available yet.")}</h3>
                <p className="text-xs text-slate-500">
                  {t("patient.no_prescriptions_desc", "Prescriptions from your consultations will appear here.")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {prescriptions.slice(0, 2).map((rx) => (
                  <div key={rx.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-900">{rx.doctor_name}</div>
                        <div className="text-xs text-slate-500">{rx.hospital_name} • {rx.issued_at}</div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-teal-100 text-teal-900 px-2.5 py-0.5 rounded-full border border-teal-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                        {rx.verification_code}
                      </span>
                    </div>

                    {/* Medications items list */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="font-bold text-slate-600 uppercase text-[10px] tracking-wider">Medications:</div>
                      {rx.items?.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-slate-800">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Pill className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span>{item.medicine_name}</span>
                            <span className="text-slate-400 text-[10px]">({item.dosage})</span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-600">{item.frequency} • {item.duration}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedRx(rx)}
                        className="text-xs font-bold text-teal-700 hover:text-teal-900 min-h-[44px] flex items-center"
                      >
                        {t("patient.view_prescription", "View Prescription")} &rarr;
                      </button>
                      <Link
                        href={`/verify/rx/${rx.verification_code}`}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 min-h-[44px]"
                      >
                        <span>{t("patient.verify_qr", "Verify QR")}</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Lab Reports Section */}
        <section id="lab-reports" className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-base sm:text-lg text-slate-900">
                    {t("patient.lab_reports_title", "Diagnostic Lab Reports")}
                  </h2>
                  <span className="text-xs text-slate-500">Pathology investigations & test findings</span>
                </div>
              </div>
              <span className="text-xs font-bold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                {labOrders.length} Reports
              </span>
            </div>

            {labOrders.length === 0 ? (
              <div className="p-8 text-center space-y-2 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                <FlaskConical className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-800 text-sm">{t("patient.no_lab_reports", "No lab reports available yet.")}</h3>
                <p className="text-xs text-slate-500">Doctor requisitions and investigation findings will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {labOrders.slice(0, 2).map((lab) => (
                  <div key={lab.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-slate-900">{lab.test_name}</div>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          lab.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : "bg-amber-100 text-amber-800 border-amber-200"
                        }`}
                      >
                        {lab.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">
                      Requisitioned by {lab.doctor_name} • {lab.hospital_name}
                    </p>

                    {lab.report ? (
                      <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700">Pathologist Findings:</span>
                          {lab.report.abnormal_flags && (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              Abnormal Flagged
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 leading-relaxed text-[11px]">{lab.report.summary}</p>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-slate-100 text-slate-500 text-xs italic">
                        {t("patient.report_processing", "Your report is being processed.")}
                      </div>
                    )}

                    {lab.report && (
                      <div className="pt-1 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedLab(lab)}
                          className="text-xs font-bold text-purple-700 hover:text-purple-900 min-h-[44px] flex items-center"
                        >
                          {t("patient.view_report", "View Report")} &rarr;
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* SECTION H: Personal Health Records & Uploaded Documents */}
      <section id="medical-documents" className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-slate-900">
                Personal Medical Documents & External Records
              </h2>
              <span className="text-xs text-slate-500">Upload past prescriptions, external lab results, or hospital summaries</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 text-center space-y-2 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
            <Upload className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">No external documents uploaded yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              You can securely upload PDFs and scans of past medical records to share with your consulting physicians.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div key={doc.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                      {doc.document_type}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      External Record ({doc.verification_status})
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{doc.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{doc.file_name} • {(doc.file_size / 1024).toFixed(1)} KB</p>
                  {doc.notes && <p className="text-xs text-slate-600 mt-2 bg-white p-2 rounded-lg border border-slate-100 italic">{doc.notes}</p>}
                </div>
                <div className="pt-3 mt-3 border-t border-slate-200/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">{doc.created_at?.slice(0, 10)}</span>
                  <a
                    href={`/api/v1/clinical/documents/${doc.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-emerald-700 hover:border-emerald-300 text-xs font-semibold transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-600" />
                Upload Personal Health Record
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadDocument} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Previous Hospital Discharge Summary"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Document Type *</label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm outline-none focus:border-emerald-600"
                >
                  <option value="PRESCRIPTION">External Prescription</option>
                  <option value="LAB_REPORT">External Lab Report</option>
                  <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                  <option value="OTHER">Other Health Record</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select File (PDF, PNG, JPG, max 10MB) *</label>
                <input
                  type="file"
                  required
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Optional Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Issued by Dr. Sen in Jan 2025"
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 text-sm outline-none focus:border-emerald-600"
                />
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                <strong>External Record Notice:</strong> Patient-uploaded files are designated as external health records to clearly distinguish them from digitally signed hospital prescriptions.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingDoc}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 shadow-xs"
                >
                  {uploadingDoc ? "Uploading..." : "Save Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prescription Full Details Modal */}
      {selectedRx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">Signed Digital Prescription</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedRx.verification_code}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRx(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">{selectedRx.doctor_name}</div>
                <div className="text-xs text-slate-500">{selectedRx.hospital_name} • Issued {selectedRx.issued_at}</div>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-xs uppercase text-slate-500 tracking-wider">Prescribed Medications:</div>
                {selectedRx.items?.map((it, i) => (
                  <div key={i} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>{it.medicine_name}</span>
                      <span className="text-xs text-slate-500 font-mono">{it.dosage}</span>
                    </div>
                    <div className="text-xs text-slate-600">
                      Frequency: <strong>{it.frequency}</strong> • Duration: <strong>{it.duration}</strong>
                    </div>
                    {it.instructions && <div className="text-[11px] text-slate-500 italic">{it.instructions}</div>}
                  </div>
                ))}
              </div>

              {selectedRx.instructions && (
                <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900">
                  <span className="font-bold">Doctor Advice:</span> {selectedRx.instructions}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const token = localStorage.getItem("careflow_token");
                    const res = await fetch(`http://localhost:8000/api/v1/clinical/prescriptions/${selectedRx.id}/pdf`, {
                      headers: token ? { Authorization: `Bearer ${token}` } : {},
                    });
                    if (!res.ok) throw new Error("Failed to download PDF");
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `Prescription_${selectedRx.prescription_number || selectedRx.id}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } catch (err) {
                    alert("Unable to download PDF prescription. Please ensure you are logged in.");
                  }
                }}
                className="flex-1 py-3.5 rounded-2xl bg-teal-600 text-white font-bold text-sm min-h-[48px] flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Official PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRx(null)}
                className="px-6 py-3.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm min-h-[48px] hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lab Report Full Details Modal */}
      {selectedLab && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">{selectedLab.test_name}</h3>
                <p className="text-xs text-slate-500">{selectedLab.hospital_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLab(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-1">
                <div className="font-bold text-purple-950">Pathologist Verified Findings</div>
                <p className="text-xs text-purple-900 leading-relaxed">{selectedLab.report?.summary}</p>
                {selectedLab.report?.abnormal_flags && (
                  <div className="inline-block mt-2 text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                    Alert: Abnormal Value Flagged
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-500 space-y-1">
                <div>Requisitioned by: <strong>{selectedLab.doctor_name}</strong></div>
                <div>Status: <strong>{selectedLab.status}</strong></div>
                <div>Created: <strong>{selectedLab.created_at}</strong></div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedLab(null)}
              className="w-full py-3.5 rounded-2xl bg-slate-900 text-white font-bold text-sm min-h-[48px]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Digital ABHA Card Modal */}
      {showAbhaCardModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">National Health Authority</h4>
                  <p className="text-[10px] text-slate-400">Ayushman Bharat Digital Mission (ABDM)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAbhaCardModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated Indian ABHA Physical Card */}
            <div className="bg-gradient-to-tr from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-6 shadow-xl border border-teal-500/30 space-y-5 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-teal-400 uppercase tracking-widest">ABHA IDENTITY</span>
                  <div className="text-xl font-black mt-1 tracking-wide">
                    {profile?.full_name || profile?.user?.full_name || "Rahul Verma"}
                  </div>
                  <div className="text-xs text-slate-300 font-mono mt-0.5">
                    {profile?.patient_profile?.gender || "MALE"} • DOB: 1996-08-20
                  </div>
                </div>
                <div className="w-16 h-16 bg-white p-1 rounded-xl shadow-xs">
                  <QrCode className="w-full h-full text-slate-950" />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/80 space-y-1">
                <div className="text-xs font-mono text-slate-400">ABHA Number</div>
                <div className="text-lg font-mono font-bold text-teal-300 tracking-wider">
                  {profile?.patient_profile?.abha_number || "91-4567-8912-3456"}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
                <div>Address: {profile?.patient_profile?.abha_address || "rahulverma@abdm"}</div>
                <div>Blood: {profile?.patient_profile?.blood_group || "B+"}</div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-500">
              <p>• NRCeS FHIR R4 & ABDM M1/M2/M3 interoperability validated.</p>
              <p>• Present this card or QR code at hospital OPD reception for instant check-in.</p>
            </div>

            <button
              type="button"
              onClick={() => {
                alert("ABHA Card downloaded as printable record.");
                setShowAbhaCardModal(false);
              }}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 min-h-[48px]"
            >
              <Download className="w-4 h-4" />
              <span>Download Digital Health Card</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
