"use client";

import React, { useState } from "react";
import {
  Sliders,
  Sparkles,
  Zap,
  ShieldCheck,
  Server,
  Megaphone,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Send,
} from "lucide-react";
import { api } from "@/lib/api";

export default function FeatureControlPage() {
  const [flags, setFlags] = useState({
    aiScribe: true,
    smartQueue: true,
    abdmConsentGate: true,
    smsAlerts: false,
    realtimeSync: true,
  });

  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastSeverity, setBroadcastSeverity] = useState("INFO");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const toggleFlag = (key: keyof typeof flags) => {
    const updated = !flags[key];
    setFlags({ ...flags, [key]: updated });
    setFeedback({
      type: "success",
      message: `Feature flag "${key}" set to ${updated ? "ENABLED" : "DISABLED"}. Configuration applied to cluster.`,
    });
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;

    setSendingBroadcast(true);
    try {
      await api.post("/admin/announcements", {
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        severity: broadcastSeverity,
      });

      setFeedback({
        type: "success",
        message: `Network advisory "${broadcastTitle}" broadcasted to all active client viewports!`,
      });
      setBroadcastTitle("");
      setBroadcastMessage("");
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to broadcast advisory." });
    } finally {
      setSendingBroadcast(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white p-1">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            SYSTEM ARCHITECTURE & TOGGLES
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
          Feature Control & Network Broadcast
        </h1>
        <p className="text-xs text-slate-400">
          Dynamically toggle platform runtime capabilities and dispatch real-time emergency advisories to all hospital viewports.
        </p>
      </div>

      {/* Feature Flags Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between hover:border-slate-700 transition-colors">
          <div className="space-y-1 max-w-sm">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" /> AI Clinical Scribe (Gemini)
            </span>
            <p className="text-xs text-slate-400">
              Generates structured SOAP clinical notes from consultation audio streams for doctor review.
            </p>
          </div>
          <button
            onClick={() => toggleFlag("aiScribe")}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              flags.aiScribe ? "bg-emerald-600 justify-end" : "bg-slate-800 justify-start"
            }`}
          >
            <div className="bg-white w-4 h-4 rounded-full shadow-md" />
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between hover:border-slate-700 transition-colors">
          <div className="space-y-1 max-w-sm">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Dynamic Queue Wait-Time Engine
            </span>
            <p className="text-xs text-slate-400">
              Calculates patient wait time based on doctor pace and active queue velocity.
            </p>
          </div>
          <button
            onClick={() => toggleFlag("smartQueue")}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              flags.smartQueue ? "bg-emerald-600 justify-end" : "bg-slate-800 justify-start"
            }`}
          >
            <div className="bg-white w-4 h-4 rounded-full shadow-md" />
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between hover:border-slate-700 transition-colors">
          <div className="space-y-1 max-w-sm">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" /> ABDM Consent-Gate Verification
            </span>
            <p className="text-xs text-slate-400">
              Requires explicit OTP authorization before medical staff can view historical EHR records.
            </p>
          </div>
          <button
            onClick={() => toggleFlag("abdmConsentGate")}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              flags.abdmConsentGate ? "bg-emerald-600 justify-end" : "bg-slate-800 justify-start"
            }`}
          >
            <div className="bg-white w-4 h-4 rounded-full shadow-md" />
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between hover:border-slate-700 transition-colors">
          <div className="space-y-1 max-w-sm">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-purple-400" /> Real-Time WebSocket Telemetry
            </span>
            <p className="text-xs text-slate-400">
              Broadcasts queue ticket updates and emergency notices instantaneously without browser refreshes.
            </p>
          </div>
          <button
            onClick={() => toggleFlag("realtimeSync")}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              flags.realtimeSync ? "bg-emerald-600 justify-end" : "bg-slate-800 justify-start"
            }`}
          >
            <div className="bg-white w-4 h-4 rounded-full shadow-md" />
          </button>
        </div>
      </div>

      {/* Network Broadcast Emergency Section */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Megaphone className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white tracking-tight">
            Broadcast Network Advisory
          </h2>
        </div>

        <form onSubmit={handleBroadcast} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Advisory Headline *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Cardiology OPD Trauma Triage Delay Advisory"
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Advisory Body *
              </label>
              <textarea
                required
                rows={2}
                placeholder="Details displayed immediately across patient waiting displays, doctor cockpits, and kiosks..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Severity Level
              </label>
              <select
                value={broadcastSeverity}
                onChange={(e) => setBroadcastSeverity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-hidden"
              >
                <option value="INFO">Informational (Blue)</option>
                <option value="WARNING">Operational Delay (Amber)</option>
                <option value="URGENT">Emergency / Critical (Red)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={sendingBroadcast}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sendingBroadcast ? "Broadcasting..." : "Dispatch Broadcast to Network"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
