"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Hospital,
  MapPin,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowRight,
  QrCode,
  Search,
  User,
  X,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";
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

export default function PatientAppointmentsPage() {
  const { t } = useLanguage();
  const { simpleView, speakText } = useAccessibility();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed" | "cancelled">("upcoming");
  const [cancelModalAppointment, setCancelModalAppointment] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const data = await api.get<Appointment[]>("/appointments/my");
      setAppointments(data || []);
    } catch (err) {
      console.error("Failed to load patient appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelModalAppointment) return;
    setCancelling(true);
    try {
      await api.post(`/appointments/${cancelModalAppointment.id}/cancel`, {});
      setActionSuccess("Appointment cancelled successfully.");
      speakText("Appointment cancelled successfully.");
      setCancelModalAppointment(null);
      await loadAppointments();
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      alert(err?.message || "Failed to cancel appointment.");
    } finally {
      setCancelling(false);
    }
  };

  const upcomingAppointments = appointments.filter(
    (a) => a.status === "CONFIRMED" || a.status === "CHECKED_IN" || a.status === "IN_QUEUE" || a.status === "IN_CONSULTATION"
  );

  const completedAppointments = appointments.filter(
    (a) => a.status === "COMPLETED"
  );

  const cancelledAppointments = appointments.filter(
    (a) => a.status === "CANCELLED"
  );

  const displayList =
    activeTab === "upcoming"
      ? upcomingAppointments
      : activeTab === "completed"
      ? completedAppointments
      : cancelledAppointments;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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

      {/* Action Notification */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button type="button" onClick={() => setActionSuccess(null)} className="text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {t("patient.my_appointments", "My Appointments")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t("patient.subtitle", "View your consultation schedule, track waiting room tokens, and book new doctor appointments.")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadAppointments}
            className="p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
            title="Refresh appointments"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/patient/discover"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-colors min-h-[44px]"
          >
            <Search className="w-4 h-4" />
            <span>{t("patient.find_doctor", "Find a Doctor")}</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("upcoming")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm min-h-[44px] transition-colors ${
            activeTab === "upcoming"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <span>{t("patient.tab_upcoming", "Upcoming")}</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-white text-slate-700 border border-slate-200 font-bold">
            {upcomingAppointments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("completed")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm min-h-[44px] transition-colors ${
            activeTab === "completed"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <span>{t("patient.tab_completed", "Completed")}</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-white text-slate-700 border border-slate-200 font-bold">
            {completedAppointments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cancelled")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm min-h-[44px] transition-colors ${
            activeTab === "cancelled"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <span>{t("patient.tab_cancelled", "Cancelled")}</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-white text-slate-700 border border-slate-200 font-bold">
            {cancelledAppointments.length}
          </span>
        </button>
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-3" />
          <span>Loading your appointments...</span>
        </div>
      ) : displayList.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-slate-800">
              {activeTab === "upcoming"
                ? t("patient.no_upcoming", "No upcoming appointment")
                : activeTab === "completed"
                ? "No completed visits yet"
                : "No cancelled appointments"}
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              {activeTab === "upcoming"
                ? t("patient.no_upcoming_desc", "Find a doctor and book a time that works for you.")
                : "Your past consultation records and digital prescriptions will be recorded here."}
            </p>
          </div>
          {activeTab === "upcoming" && (
            <Link
              href="/patient/discover"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-colors min-h-[44px]"
            >
              <Search className="w-4 h-4" />
              <span>{t("patient.find_doctor", "Find a Doctor")}</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayList.map((appt) => {
            const isCheckedIn = appt.status === "CHECKED_IN" || appt.status === "IN_QUEUE";
            const isConsulting = appt.status === "IN_CONSULTATION";
            const dateStr = new Date(appt.scheduled_start).toLocaleDateString([], {
              weekday: "long",
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const timeStr = new Date(appt.scheduled_start).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={appt.id}
                className={`bg-white rounded-3xl border p-6 sm:p-7 shadow-xs space-y-5 transition-all ${
                  isCheckedIn
                    ? "border-amber-300 ring-2 ring-amber-100"
                    : isConsulting
                    ? "border-teal-300 ring-2 ring-teal-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-lg text-slate-900">{appt.doctor_name}</h3>
                      <p className="text-xs font-semibold text-slate-500">{appt.department_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${
                        isCheckedIn
                          ? "bg-amber-100 text-amber-900 border-amber-300 animate-pulse"
                          : isConsulting
                          ? "bg-teal-100 text-teal-900 border-teal-300"
                          : appt.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                          : appt.status === "CANCELLED"
                          ? "bg-rose-100 text-rose-900 border-rose-300"
                          : "bg-blue-50 text-blue-800 border-blue-200"
                      }`}
                    >
                      {isCheckedIn
                        ? "Checked-In (In Live Queue)"
                        : isConsulting
                        ? "In Doctor Consultation"
                        : appt.status === "COMPLETED"
                        ? "Consultation Completed"
                        : appt.status === "CANCELLED"
                        ? "Cancelled"
                        : "Confirmed"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{dateStr}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold">{timeStr}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Hospital className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{appt.hospital_name}</span>
                    {appt.room_number && (
                      <span className="font-bold text-slate-900">(Room {appt.room_number})</span>
                    )}
                  </div>
                </div>

                {/* Queue status banner if checked in */}
                {isCheckedIn && (
                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                        Live Token
                      </span>
                      <div className="text-2xl font-black text-amber-900">{appt.ticket_number || "#CARD-A01"}</div>
                      <p className="text-xs text-amber-800 mt-0.5">
                        {appt.queue_position ? `${appt.queue_position} patient(s) ahead` : "Next in turn"} • Estimated wait:{" "}
                        <strong>{appt.estimated_wait_minutes ?? 12} mins</strong>
                      </p>
                    </div>
                    <Link
                      href={`/patient/appointments/${appt.id}/checkin`}
                      className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs text-center min-h-[44px] flex items-center justify-center shrink-0"
                    >
                      Track Live Queue
                    </Link>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="text-xs text-slate-400 font-mono">
                    Reference ID: <span className="font-semibold text-slate-600">{appt.id.slice(0, 8)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {appt.status === "CONFIRMED" && (
                      <>
                        <Link
                          href={`/patient/appointments/${appt.id}/checkin`}
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs min-h-[44px] flex items-center gap-1.5 transition-colors"
                        >
                          <QrCode className="w-4 h-4" />
                          <span>{t("patient.check_in_now", "Check-In Now")}</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => setCancelModalAppointment(appt)}
                          className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs min-h-[44px] transition-colors"
                        >
                          {t("patient.cancel_appointment", "Cancel Appointment")}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancelModalAppointment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {t("patient.cancel_confirm_title", "Are you sure you want to cancel this appointment?")}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dr. {cancelModalAppointment.doctor_name} ({cancelModalAppointment.department_name})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Your booked OPD consultation slot will be freed up for other patients in need. You can always book a fresh slot anytime.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalAppointment(null)}
                className="flex-1 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm min-h-[44px] transition-colors"
              >
                {t("patient.keep_appointment", "Keep Appointment")}
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancel}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm min-h-[44px] transition-colors shadow-sm"
              >
                {cancelling ? "Cancelling..." : t("patient.cancel_appointment", "Cancel Appointment")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

