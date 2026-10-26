"use client";

import React, { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Clock, CheckCircle2, XCircle, Printer, Download, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAccessibility } from "@/context/AccessibilityContext";

interface OperationalReport {
  hospital_name: string;
  date: string;
  total_appointments_all_time: number;
  completed_appointments: number;
  cancelled_appointments: number;
  active_doctors: number;
  avg_consultation_time_mins: number;
  queue_dwell_average_mins: number;
  patient_satisfaction_rate: string;
}

export default function ReportsPage() {
  const [report, setReport] = useState<OperationalReport | null>(null);
  const [loading, setLoading] = useState(true);
  const { simpleView, speakText } = useAccessibility();

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const res = await api.get<OperationalReport>("/hospital-admin/reports");
        setReport(res);
      } catch (err: any) {
        console.error("Failed to load reports:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-400" />
            Facility Operational Reports
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Throughput analytics, OPD queue dwell metrics, and facility service level benchmarks.
          </p>
        </div>
        <button
          onClick={() => {
            window.print();
            speakText("Printing facility report");
          }}
          className={`rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-semibold transition-all flex items-center gap-2 justify-center ${
            simpleView ? "px-6 py-3.5 text-base min-h-[48px]" : "px-4 py-2 text-xs min-h-[38px]"
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Print / Export PDF</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        </div>
      ) : !report ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          Report unavailable.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400 font-medium">All-Time Bookings</span>
              <div className="text-2xl font-extrabold text-white mt-1">
                {report.total_appointments_all_time}
              </div>
              <p className="text-xs text-slate-500 mt-1">Hospital admissions & OPD</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400 font-medium">Completed Encounters</span>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                {report.completed_appointments}
              </div>
              <p className="text-xs text-emerald-500/80 mt-1">Consultations finalized</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400 font-medium">Avg Consultation Time</span>
              <div className="text-2xl font-extrabold text-teal-400 mt-1 flex items-center gap-1.5">
                <Clock className="w-5 h-5 text-teal-400" />
                {report.avg_consultation_time_mins}m
              </div>
              <p className="text-xs text-teal-500/80 mt-1">Per clinical encounter</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400 font-medium">Patient Satisfaction</span>
              <div className="text-2xl font-extrabold text-amber-400 mt-1 flex items-center gap-1.5">
                <TrendingUp className="w-5 h-5 text-amber-400" />
                {report.patient_satisfaction_rate}
              </div>
              <p className="text-xs text-amber-500/80 mt-1">Based on post-consultation pulse</p>
            </div>
          </div>

          {/* Dwell and Turnaround Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-base font-bold text-white mb-4">Turnaround & Efficiency Benchmarks</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-400">Waiting Room Dwell Time</div>
                <div className="text-xl font-bold text-white">{report.queue_dwell_average_mins} Minutes</div>
                <p className="text-xs text-slate-500">Benchmark target: &lt; 20 minutes</p>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-teal-500 h-full w-[70%]" />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-400">Practicing Doctor Utilization</div>
                <div className="text-xl font-bold text-white">{report.active_doctors} Active Clinicians</div>
                <p className="text-xs text-slate-500">Full OPD shift coverage</p>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-cyan-500 h-full w-[85%]" />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-400">Cancellation / No-Show Rate</div>
                <div className="text-xl font-bold text-white">{report.cancelled_appointments} Cancelled</div>
                <p className="text-xs text-slate-500">Well under network threshold</p>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[12%]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
