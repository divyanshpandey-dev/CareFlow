"use client";

import React, { useEffect, useState } from "react";
import { Activity, Clock, RefreshCw, Stethoscope, User, Volume2, CheckCircle2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAccessibility } from "@/context/AccessibilityContext";

interface QueueItem {
  id: string;
  ticket_number: number;
  state: string;
  patient_name: string;
  doctor_name: string;
  doctor_id: string;
  estimated_wait_time: number;
  called_at?: string;
  created_at: string;
}

export default function QueuePage() {
  const [tickets, setTickets] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stepping, setStepping] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { simpleView, speakText } = useAccessibility();

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await api.get<QueueItem[]>("/hospital-admin/queue");
      setTickets(res || []);
    } catch (err: any) {
      console.error("Failed to load queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleStep = async (doctorId: string, doctorName: string) => {
    try {
      setStepping(true);
      setMessage(null);
      const res = await api.post<any>("/hospital-admin/queue/step", { doctor_id: doctorId });
      setMessage(res.message || `Token ${res.ticket_number || "next"} called for ${doctorName}`);
      speakText(`Token ${res.ticket_number || "next"} called for Dr ${doctorName}`);
      await fetchQueue();
    } catch (err: any) {
      setMessage(err.message || "Failed to advance queue.");
    } finally {
      setStepping(false);
    }
  };

  const waiting = tickets.filter((t) => t.state === "WAITING");
  const inConsult = tickets.filter((t) => t.state === "IN_CONSULTATION" || t.state === "CALLED");
  const completed = tickets.filter((t) => t.state === "COMPLETED");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-400" />
            Live Queue & Waiting Room
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time OPD queue orchestration for this facility. Synchronized with public waiting room displays.
          </p>
        </div>
        <button
          onClick={fetchQueue}
          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs text-teal-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Primary 3-Column Waiting Room Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1: Currently In Consultation */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              Now In Consultation ({inConsult.length})
            </h2>
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping" />
          </div>

          {inConsult.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 text-center text-slate-500 text-xs">
              No patient currently in consultation room.
            </div>
          ) : (
            inConsult.map((t) => (
              <div
                key={t.id}
                className="bg-slate-900 border-2 border-teal-500/40 rounded-2xl p-5 shadow-lg shadow-teal-500/5 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl font-extrabold text-teal-300 font-mono">
                    Token #{t.ticket_number}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-500/20 text-teal-300 uppercase">
                    {t.state}
                  </span>
                </div>
                <div className="font-bold text-white text-base mb-1">{t.patient_name}</div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
                  {t.doctor_name}
                </div>
                {t.doctor_id && (
                  <button
                    onClick={() => handleStep(t.doctor_id, t.doctor_name)}
                    disabled={stepping}
                    className="mt-4 w-full py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs transition-colors shadow-sm"
                  >
                    Complete & Call Next
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Col 2: Waiting Queue */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Waiting in Hall ({waiting.length})
            </h2>
          </div>

          {waiting.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 text-center text-slate-500 text-xs">
              Waiting hall is empty. All patients served!
            </div>
          ) : (
            waiting.map((t, idx) => (
              <div
                key={t.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-mono font-bold text-amber-400 text-sm">
                    #{t.ticket_number}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">{t.patient_name}</div>
                    <div className="text-xs text-slate-400">{t.doctor_name}</div>
                  </div>
                </div>
                {idx === 0 && t.doctor_id && (
                  <button
                    onClick={() => handleStep(t.doctor_id, t.doctor_name)}
                    disabled={stepping}
                    className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm"
                  >
                    Call Next
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Col 3: Served / Completed Today */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Completed Today ({completed.length})
            </h2>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 space-y-2 max-h-[500px] overflow-y-auto">
            {completed.length === 0 ? (
              <div className="text-center text-slate-500 text-xs py-8">
                No consultations completed yet today.
              </div>
            ) : (
              completed.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-center justify-between text-xs text-slate-300"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-emerald-400 font-bold">#{t.ticket_number}</span>
                    <span className="font-medium text-slate-200">{t.patient_name}</span>
                  </div>
                  <span className="text-slate-500">{t.doctor_name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
