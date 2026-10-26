"use client";

import React, { useEffect, useState } from "react";
import { Calendar, Clock, Filter, Loader2, Search, User, Stethoscope } from "lucide-react";
import { api } from "@/lib/api";
import { useAccessibility } from "@/context/AccessibilityContext";

interface AppointmentItem {
  id: string;
  patient_name: string;
  patient_phone: string;
  doctor_name: string;
  department_name: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  appointment_type: string;
  token_number?: number;
  queue_state?: string;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const { simpleView } = useAccessibility();

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (dateFilter) params.appt_date = dateFilter;
      if (statusFilter) params.status_filter = statusFilter;

      const queryString = new URLSearchParams(params).toString();
      const res = await api.get<AppointmentItem[]>(
        `/hospital-admin/appointments${queryString ? `?${queryString}` : ""}`
      );
      setAppointments(res || []);
    } catch (err: any) {
      console.error("Failed to load appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [dateFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-400" />
            Facility Appointments
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Bookings, consultations, and queue ticket check-ins for this hospital.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-teal-500"
          />
          <select
            aria-label="Filter Appointments by Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-teal-500"
          >
            <option value="">All Statuses</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CHECKED_IN">CHECKED_IN</option>
            <option value="IN_QUEUE">IN_QUEUE</option>
            <option value="IN_CONSULTATION">IN_CONSULTATION</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
          {(dateFilter || statusFilter) && (
            <button
              onClick={() => {
                setDateFilter("");
                setStatusFilter("");
              }}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Appointments Found</h3>
          <p className="text-xs text-slate-500 mt-1">
            No bookings match the selected criteria for this facility.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-mono tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Token / Patient</th>
                  <th className="px-5 py-3.5">Doctor & Dept</th>
                  <th className="px-5 py-3.5">Date & Time</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Queue Status</th>
                  <th className="px-5 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center font-mono font-bold text-teal-400 text-xs">
                          {appt.token_number ? `#${appt.token_number}` : "--"}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{appt.patient_name}</div>
                          <div className="text-slate-500 text-[11px]">{appt.patient_phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-200">{appt.doctor_name}</div>
                      <div className="text-slate-500 text-[11px]">{appt.department_name}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      <div>{appt.scheduled_start ? new Date(appt.scheduled_start).toLocaleDateString() : ""}</div>
                      <div className="text-slate-500 text-[11px]">
                        {appt.scheduled_start ? new Date(appt.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-400">
                      {appt.appointment_type}
                    </td>
                    <td className="px-5 py-4">
                      {appt.queue_state ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            appt.queue_state === "WAITING"
                              ? "bg-amber-500/10 text-amber-400"
                              : appt.queue_state === "IN_CONSULTATION"
                              ? "bg-teal-500/10 text-teal-400"
                              : "bg-emerald-500/10 text-emerald-400"
                          }`}
                        >
                          {appt.queue_state}
                        </span>
                      ) : (
                        <span className="text-slate-600">Not queued</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          appt.status === "CONFIRMED"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : appt.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : appt.status === "CANCELLED"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {appt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
