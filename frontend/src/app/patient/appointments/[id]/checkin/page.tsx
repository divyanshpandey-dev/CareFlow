"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock,
  DoorOpen,
  Hospital,
  MapPin,
  QrCode,
  ShieldCheck,
  Stethoscope,
  Users,
  Volume2,
} from "lucide-react";
import { api } from "@/lib/api";
import { wsClient } from "@/lib/ws";
import { useLanguage } from "@/context/LanguageContext";

interface TicketData {
  appointment_id: string;
  ticket_number: string;
  status: string;
  queue_position: number;
  estimated_wait_minutes: number;
  doctor_name: string;
  department_name: string;
  hospital_name: string;
  room_number?: string;
  doctor_id?: string;
}

export default function AppointmentCheckInPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const appointmentId = params?.id as string;

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calledAlert, setCalledAlert] = useState(false);

  useEffect(() => {
    if (appointmentId) {
      loadTicketStatus();
    }
  }, [appointmentId]);

  const loadTicketStatus = async () => {
    setLoading(true);
    try {
      const data = await api.get<TicketData>(`/queue/ticket/${appointmentId}`);
      setTicket(data);

      if (data.status === "CALLED" || data.status === "IN_CONSULTATION") {
        setCalledAlert(true);
      }

      // Connect WebSocket for real-time updates
      wsClient.connect();
      if (data.ticket_number) {
        wsClient.subscribe(`ticket:${data.ticket_number}`, (message) => {
          console.log("WebSocket ticket update:", message);
          if (message.type === "QUEUE_UPDATE" || message.type === "PATIENT_CALLED") {
            setTicket((prev) => (prev ? { ...prev, ...message.data } : null));
            if (message.data?.status === "CALLED" || message.data?.status === "IN_CONSULTATION") {
              setCalledAlert(true);
            }
          }
        });
      }
    } catch {
      // Not yet checked in
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePerformCheckIn = async () => {
    setCheckInLoading(true);
    setError(null);
    try {
      const res = await api.post<any>("/queue/checkin", {
        appointment_id: appointmentId,
        checkin_method: "QR_SELF",
      });
      await loadTicketStatus();
    } catch (err: any) {
      setError(err.message || "Check-in failed. Please verify with reception.");
    } finally {
      setCheckInLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
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
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Smart Contactless Check-In
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {t("patient.not_checked_in", "Eliminate reception waiting queues. Seamlessly verify your arrival and track your live queue position.")}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Checking queue status...</p>
        </div>
      ) : ticket ? (
        /* Checked In: Display Live Queue Ticket Card */
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Urgent Call Alert Banner */}
          {calledAlert && (
            <div className="p-4 rounded-2xl bg-amber-500 text-white shadow-lg animate-bounce flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-6 h-6 animate-spin" />
                <div>
                  <h4 className="font-extrabold text-base">You are being called!</h4>
                  <p className="text-xs text-amber-100">
                    Dr. {ticket.doctor_name} is waiting for you in Room {ticket.room_number || "204"}. Please enter immediately.
                  </p>
                </div>
              </div>
              <div className="hidden sm:block text-xs font-bold uppercase bg-white/20 px-3 py-1.5 rounded-lg">
                Now Serving
              </div>
            </div>
          )}

          {/* Ticket Card */}
          <div className="bg-white rounded-3xl border-2 border-emerald-500/40 p-6 sm:p-8 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-bl-full pointer-events-none" />

            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                  Live Queue Token
                </span>
                <div className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight mt-2">
                  {ticket.ticket_number}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-semibold text-slate-400">Status</div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-1 bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  {ticket.status}
                </div>
              </div>
            </div>

            {/* Queue Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-100">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Queue Position</span>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {ticket.queue_position === 0 ? "Next in Line" : `#${ticket.queue_position}`}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {ticket.queue_position === 0 ? "Prepare to enter" : `${ticket.queue_position} ahead of you`}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="w-4 h-4 text-teal-600" />
                  <span>Est. Wait (EWMA)</span>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  ~{ticket.estimated_wait_minutes}m
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Dynamically paced
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 col-span-2 sm:col-span-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <DoorOpen className="w-4 h-4 text-blue-600" />
                  <span>Consultation Room</span>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  Room {ticket.room_number || "204"}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  2nd Floor, OPD Wing
                </div>
              </div>
            </div>

            {/* Doctor & Hospital Details */}
            <div className="mt-6 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{ticket.doctor_name}</h4>
                  <p className="text-xs text-slate-600">{ticket.department_name} • {ticket.hospital_name}</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                Live Synced
              </span>
            </div>
          </div>

          {/* Real-time sync note */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Connected to CareFlow Real-Time Queue Gateway
            </span>
            <button
              onClick={loadTicketStatus}
              className="font-semibold text-emerald-700 hover:underline"
            >
              Refresh Status
            </button>
          </div>
        </div>
      ) : (
        /* Not Checked In: Display QR Scanner Simulator */
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs text-center space-y-6">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
              <QrCode className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Arrived at the Hospital?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Scan the reception QR code or press the button below to complete self check-in. You will be assigned a real-time token in the doctor&apos;s queue.
            </p>
          </div>

          {/* QR Code Illustration Frame */}
          <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl max-w-xs mx-auto space-y-2">
            <div className="w-40 h-40 bg-white p-3 rounded-xl border border-slate-200 mx-auto shadow-xs flex flex-col items-center justify-center">
              <QrCode className="w-32 h-32 text-slate-800" />
            </div>
            <p className="text-[11px] font-mono text-slate-400">CAREFLOW-KIOSK-GATE-01</p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium max-w-md mx-auto">
              {error}
            </div>
          )}

          <div className="max-w-md mx-auto pt-2">
            <button
              onClick={handlePerformCheckIn}
              disabled={checkInLoading}
              className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
            >
              <QrCode className="w-4 h-4" />
              {checkInLoading ? "Assigning Queue Token..." : "Check In Now (Simulate QR Scan)"}
            </button>
            <p className="text-[11px] text-slate-400 mt-2">
              Validates your appointment and enters you into Dr. Sharma&apos;s live EWMA queue roster.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

