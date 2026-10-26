"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  ShieldCheck,
  Calendar,
  FileText,
  Activity,
  Phone,
  Mail,
  MapPin,
  Clock,
  Pill,
  TestTube,
  Loader2,
  AlertCircle,
  FileDown,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { api } from "@/lib/api";

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"timeline" | "appointments" | "prescriptions" | "labs" | "documents">("timeline");

  useEffect(() => {
    if (!patientId) return;

    setLoading(true);
    api.get<any>(`/hospital-admin/patients/${patientId}`)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(err.message || "Failed to load patient record.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [patientId]);

  if (loading) {
    return (
      <div className="py-24 flex justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link
          href="/hospital-admin/patients"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Patient Registry
        </Link>
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error || "Patient not found."}</span>
        </div>
      </div>
    );
  }

  const { profile, appointments, prescriptions, lab_orders, documents, timeline } = data;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/hospital-admin/patients"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Hospital Patient Registry
        </Link>
      </div>

      {/* Patient Profile Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-0.5 rounded-md">
                {profile.patient_identifier}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  profile.profile_completed
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                }`}
              >
                {profile.profile_completed ? "Verified Identity" : "Incomplete Profile"}
              </span>
              {profile.id_verified && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {profile.id_document_type || "Govt ID"} Verified
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">{profile.full_name}</h1>
            <p className="text-xs text-slate-400 mt-1">
              {profile.age !== null ? `${profile.age} years old` : "Age not specified"} • Gender: {profile.gender} • Blood Group: <strong className="text-slate-200">{profile.blood_group || "Unknown"}</strong>
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 text-xs space-y-1.5 md:min-w-[240px]">
            <div className="flex items-center gap-2 text-slate-300">
              <Phone className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>{profile.phone}</span>
            </div>
            {profile.email && (
              <div className="flex items-center gap-2 text-slate-400">
                <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </div>
            )}
            {profile.id_document_masked && (
              <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px] pt-1 border-t border-slate-800">
                <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                <span>Masked ID: {profile.id_document_masked}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 pt-4 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab("timeline")}
            className={`px-3.5 py-1.5 rounded-xl transition ${
              activeTab === "timeline"
                ? "bg-teal-500/15 text-teal-300 border border-teal-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Care Timeline ({timeline?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("appointments")}
            className={`px-3.5 py-1.5 rounded-xl transition ${
              activeTab === "appointments"
                ? "bg-teal-500/15 text-teal-300 border border-teal-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Appointments ({appointments?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("prescriptions")}
            className={`px-3.5 py-1.5 rounded-xl transition ${
              activeTab === "prescriptions"
                ? "bg-teal-500/15 text-teal-300 border border-teal-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Prescriptions ({prescriptions?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("labs")}
            className={`px-3.5 py-1.5 rounded-xl transition ${
              activeTab === "labs"
                ? "bg-teal-500/15 text-teal-300 border border-teal-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Diagnostics ({lab_orders?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`px-3.5 py-1.5 rounded-xl transition ${
              activeTab === "documents"
                ? "bg-teal-500/15 text-teal-300 border border-teal-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            External Documents ({documents?.length || 0})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "timeline" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-400" />
            Facility Longitudinal Care Journey
          </h2>
          {timeline.length === 0 ? (
            <p className="text-xs text-slate-500">No medical events recorded at this hospital yet.</p>
          ) : (
            <div className="space-y-4">
              {timeline.map((evt: any, idx: number) => (
                <div key={idx} className="flex gap-4 items-start pb-4 border-b border-slate-800/80 last:border-0">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-teal-400">
                    {evt.type === "PRESCRIPTION" ? (
                      <Pill className="w-4 h-4" />
                    ) : evt.type === "LAB_ORDER" ? (
                      <TestTube className="w-4 h-4" />
                    ) : (
                      <Calendar className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white">{evt.title}</h4>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {evt.date} {evt.time}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{evt.department}</p>
                    <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-teal-300">
                      {evt.badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "appointments" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-400" />
            Hospital Appointments & Queue Status
          </h2>
          {appointments.length === 0 ? (
            <p className="text-xs text-slate-500">No appointments recorded at this facility.</p>
          ) : (
            <div className="space-y-3">
              {appointments.map((a: any) => (
                <div key={a.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-400 font-bold">{a.booking_reference}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-teal-300">
                        {a.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white mt-1">{a.doctor_name} ({a.department_name})</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {a.appointment_date} at {a.start_time} {a.reason_for_visit && `• Reason: ${a.reason_for_visit}`}
                    </p>
                  </div>
                  {a.token_number && (
                    <div className="bg-teal-500/10 border border-teal-500/20 px-3 py-1.5 rounded-xl text-center">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Queue Token</span>
                      <span className="font-mono text-sm font-black text-teal-400">{a.token_number}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "prescriptions" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Pill className="w-4 h-4 text-teal-400" />
            Issued Digital Prescriptions
          </h2>
          {prescriptions.length === 0 ? (
            <p className="text-xs text-slate-500">No prescriptions issued by doctors at this hospital.</p>
          ) : (
            <div className="space-y-3">
              {prescriptions.map((rx: any) => (
                <div key={rx.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-teal-400">Rx #{rx.prescription_number}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Digitally Signed
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white mt-1">Prescribed by {rx.doctor_name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{rx.items_count} Medication item(s) • {rx.instructions || "Standard dosage instructions"}</p>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{rx.issued_at?.slice(0, 10)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "labs" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <TestTube className="w-4 h-4 text-teal-400" />
            Laboratory & Diagnostic Orders
          </h2>
          {lab_orders.length === 0 ? (
            <p className="text-xs text-slate-500">No laboratory tests recorded for this patient.</p>
          ) : (
            <div className="space-y-3">
              {lab_orders.map((lb: any) => (
                <div key={lb.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">{lb.test_name}</h4>
                      {lb.is_abnormal && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          Abnormal Values
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      Status: <strong className="text-slate-300">{lb.status}</strong> {lb.has_report && "• Official Report Verified"}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{lb.created_at?.slice(0, 10)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "documents" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-400" />
            Patient-Uploaded & External Records
          </h2>
          {documents.length === 0 ? (
            <p className="text-xs text-slate-500">No external documents uploaded for this patient.</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc: any) => (
                <div key={doc.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">{doc.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        External Record (Pending Review)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{doc.file_name} • {(doc.file_size / 1024).toFixed(1)} KB</p>
                  </div>
                  <a
                    href={`/api/v1/clinical/documents/${doc.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-medium flex items-center gap-1.5"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
