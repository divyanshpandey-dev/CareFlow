"use client";

import React, { useEffect, useState } from "react";
import { Radio, AlertTriangle, Send, ShieldCheck, CheckCircle2, Loader2, Info } from "lucide-react";
import { api } from "@/lib/api";
import { useAccessibility } from "@/context/AccessibilityContext";

interface OperationsStatus {
  facility_status: string;
  emergency_level: string;
  active_waiting_patients: number;
  qr_checkin_ready: boolean;
  waiting_room_display_active: boolean;
}

export default function OperationsPage() {
  const [ops, setOps] = useState<OperationsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [severity, setSeverity] = useState("INFO");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { simpleView, speakText } = useAccessibility();

  const fetchOps = async () => {
    try {
      setLoading(true);
      const res = await api.get<OperationsStatus>("/hospital-admin/operations");
      setOps(res);
    } catch (err: any) {
      console.error("Failed to load operations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOps();
  }, []);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !alertMessage) return;
    try {
      setSending(true);
      setFeedback(null);
      await api.post("/hospital-admin/operations/broadcast", {
        title: title.trim(),
        message: alertMessage.trim(),
        severity: severity,
      });
      setFeedback(`Alert broadcasted: "${title}" sent to waiting screens!`);
      speakText(`Broadcast sent: ${title}`);
      setTitle("");
      setAlertMessage("");
    } catch (err: any) {
      setFeedback(err.message || "Failed to broadcast alert.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Radio className="w-5 h-5 text-teal-400" />
          Facility Operations & Operational Broadcasts
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Broadcast local alerts, OPD schedule delays, and emergency notices to patient and doctor screens.
        </p>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs text-teal-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Operations Telemetry Cards */}
      {ops && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs font-medium text-slate-400">Facility Health</span>
            <div className="text-xl font-bold text-white mt-1 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              {ops.facility_status}
            </div>
            <p className="text-xs text-slate-500 mt-1">All OPD corridors operational</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs font-medium text-slate-400">Emergency & Triage Level</span>
            <div className="text-xl font-bold text-amber-400 mt-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {ops.emergency_level}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active waiting load: {ops.active_waiting_patients} patients
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs font-medium text-slate-400">Digital Touchpoints</span>
            <div className="text-xl font-bold text-teal-400 mt-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              QR Check-in Synchronized
            </div>
            <p className="text-xs text-slate-500 mt-1">Waiting room displays connected</p>
          </div>
        </div>
      )}

      {/* Broadcast Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-2xl">
        <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
          <Send className="w-4 h-4 text-teal-400" />
          Send Facility Live Broadcast
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          This message will appear instantly as an alert banner across waiting rooms, receptionist desks, and doctor cockpits in this hospital.
        </p>

        <form onSubmit={handleBroadcast} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Alert Headline *</label>
            <input
              type="text"
              required
              placeholder="e.g. Cardiology OPD Delay or Blood Donation Camp Notice"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Alert Severity</label>
            <div className="grid grid-cols-3 gap-2">
              {["INFO", "WARNING", "EMERGENCY"].map((sev) => (
                <button
                  type="button"
                  key={sev}
                  onClick={() => setSeverity(sev)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    severity === sev
                      ? sev === "EMERGENCY"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-500/20"
                        : sev === "WARNING"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20"
                        : "bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-sm shadow-teal-500/20"
                      : "bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Detailed Operational Message *</label>
            <textarea
              rows={4}
              required
              placeholder="e.g. Dr. Sharma is attending an emergency consultation. Cardiology queue tokens are delayed by approximately 20 minutes."
              value={alertMessage}
              onChange={(e) => setAlertMessage(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className={`w-full rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold transition-all shadow-md flex items-center justify-center gap-2 ${
              simpleView ? "py-4 text-base min-h-[48px]" : "py-3 text-sm min-h-[40px]"
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>{sending ? "Broadcasting Live..." : "Publish Facility Broadcast"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
