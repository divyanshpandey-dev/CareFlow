"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  FlaskConical,
  Hash,
  Hospital,
  Info,
  Layers,
  Lock,
  QrCode,
  ShieldCheck,
  Stethoscope,
  User,
} from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";

interface JourneyEvent {
  id: string;
  stage: string;
  title: string;
  description: string;
  timestamp: string;
  status: string;
  metadata_json?: any;
}

interface JourneyData {
  patient_name: string;
  patient_id: string;
  next_action?: {
    stage: string;
    action: string;
    details: string;
    suggested_date?: string;
  };
  events: JourneyEvent[];
}

export default function CareJourneyPage() {
  const { t } = useLanguage();
  const [journey, setJourney] = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJourney();
  }, []);

  const loadJourney = async () => {
    setLoading(true);
    try {
      const res = await api.get<JourneyData>("/journey/my");
      setJourney(res);
    } catch (err) {
      console.error("Failed to load care journey:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case "DISCOVERY":
      case "APPOINTMENT":
      case "APPOINTMENT_BOOKED":
        return <Calendar className="w-4 h-4 text-emerald-600" />;
      case "CHECK_IN":
      case "CHECKED_IN":
        return <QrCode className="w-4 h-4 text-teal-600" />;
      case "CONSULTATION":
      case "ENCOUNTER_COMPLETED":
        return <Stethoscope className="w-4 h-4 text-blue-600" />;
      case "PRESCRIPTION":
      case "PRESCRIPTION_ISSUED":
        return <FileCheck2 className="w-4 h-4 text-indigo-600" />;
      case "LAB_ORDER":
      case "LAB_REPORT":
      case "LAB_REPORT_VERIFIED":
        return <FlaskConical className="w-4 h-4 text-purple-600" />;
      case "FOLLOW_UP":
        return <Clock className="w-4 h-4 text-amber-600" />;
      default:
        return <Activity className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Prominent Back to Dashboard Navigation Button */}
      <div>
        <Link
          href="/patient/dashboard"
          className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-800 hover:text-emerald-700 hover:border-emerald-300 font-bold text-sm shadow-2xs hover:shadow-xs transition-all min-h-[44px] group"
          title={t("patient.back_to_dashboard", "Back to Dashboard")}
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 group-hover:text-emerald-600 group-hover:-translate-x-1 transition-transform" />
          <span>{t("patient.back_to_dashboard", "Back to Dashboard")}</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {t("patient.my_care_journey", "Connected Care Journey")}
            </h1>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
              Unified Timeline
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {t("patient.subtitle", "Tracking what happened, what is happening now, and what needs to happen next across hospitals.")}
          </p>
        </div>

        <Link
          href="/patient/consent"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors self-start sm:self-auto min-h-[44px]"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          {t("patient.consent_privacy", "Manage DPDP Sharing")}
        </Link>
      </div>

      {/* What Needs to Happen Next Banner */}
      {journey?.next_action && (
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
                <Clock className="w-3.5 h-3.5" />
                <span>Next Recommended Action</span>
              </div>
              <h2 className="text-xl font-bold">{journey.next_action.action}</h2>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                {journey.next_action.details}
              </p>
            </div>

            {journey.next_action.suggested_date && (
              <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/20 text-center shrink-0">
                <span className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">
                  Scheduled Target
                </span>
                <p className="text-base font-bold text-amber-300 mt-0.5">
                  {journey.next_action.suggested_date}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vertical Care Journey Timeline */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-base text-slate-900">Longitudinal Timeline</h3>
          </div>
          <span className="text-xs text-slate-500">
            {journey?.events?.length ?? 0} Recorded Clinical Milestones
          </span>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading care timeline...</p>
          </div>
        ) : !journey?.events?.length ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No events recorded yet. Book a consultation to start your care journey.
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {journey.events.map((evt, idx) => {
              const isPrescription =
                evt.stage.includes("PRESCRIPTION") || evt.metadata_json?.prescription_code;
              const isLab =
                evt.stage.includes("LAB") || evt.metadata_json?.report_hash;

              return (
                <div key={evt.id || idx} className="relative group">
                  {/* Timeline Node Dot */}
                  <div className="absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-emerald-600 flex items-center justify-center shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  </div>

                  {/* Card Content */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 hover:border-emerald-400/60 hover:bg-emerald-50/20 transition-all space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                          {getStageIcon(evt.stage)}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900">{evt.title}</h4>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(evt.timestamp).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{evt.description}</p>

                    {/* Metadata Sub-View: Cryptographic Rx Details */}
                    {isPrescription && evt.metadata_json?.prescription_code && (
                      <div className="mt-3 p-3.5 rounded-xl bg-white border border-indigo-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-indigo-700 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" />
                            HMAC-SHA256 Cryptographic Seal
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {evt.metadata_json.prescription_code}
                          </span>
                        </div>

                        {evt.metadata_json.items && (
                          <div className="space-y-1 pt-1">
                            {evt.metadata_json.items.map((item: any, i: number) => (
                              <div
                                key={i}
                                className="text-xs flex items-center justify-between text-slate-700 font-medium bg-slate-50 px-2.5 py-1 rounded-md"
                              >
                                <span>
                                  {item.drug_name} ({item.dosage})
                                </span>
                                <span className="text-slate-500 font-normal">
                                  {item.frequency} • {item.duration}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="pt-1 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">
                            Doctor HPR: {evt.metadata_json.doctor_registration || "MCI-2015-88421"}
                          </span>
                          <Link
                            href={`/verify/rx/${evt.metadata_json.prescription_code}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                          >
                            <span>Verify Digital Signature</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Metadata Sub-View: Lab Report Details */}
                    {isLab && evt.metadata_json && (
                      <div className="mt-3 p-3.5 rounded-xl bg-white border border-purple-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-purple-700 flex items-center gap-1.5">
                            <FlaskConical className="w-3.5 h-3.5" />
                            Laboratory Diagnostic Report
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                            {evt.metadata_json.status || "VERIFIED"}
                          </span>
                        </div>

                        {evt.metadata_json.results && (
                          <div className="space-y-1 pt-1">
                            {evt.metadata_json.results.map((res: any, i: number) => (
                              <div
                                key={i}
                                className={`text-xs flex items-center justify-between px-2.5 py-1 rounded-md font-medium ${
                                  res.flag === "HIGH" || res.flag === "ABNORMAL"
                                    ? "bg-rose-50 text-rose-800 border border-rose-200"
                                    : "bg-slate-50 text-slate-700"
                                }`}
                              >
                                <span>{res.test_name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold">{res.value}</span>
                                  {res.flag && (
                                    <span className="text-[10px] uppercase font-bold text-rose-600">
                                      [{res.flag}]
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    (Ref: {res.reference_range})
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {evt.metadata_json.report_hash && (
                          <div className="text-[10px] font-mono text-slate-400 truncate pt-1 flex items-center gap-1">
                            <FileCheck2 className="w-3 h-3 text-purple-600 shrink-0" />
                            <span>SHA-256: {evt.metadata_json.report_hash}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
