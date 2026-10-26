"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  Globe,
  LogOut,
  MapPin,
  Shield,
  Sparkles,
  User,
  Volume2,
} from "lucide-react";
import { useHospitalAdminScope } from "./HospitalAdminGuard";
import { INDIAN_LANGUAGES, useLanguage } from "@/context/LanguageContext";
import { useAccessibility } from "@/context/AccessibilityContext";
import { api } from "@/lib/api";

export const HospitalAdminHeader: React.FC = () => {
  const router = useRouter();
  const { scope } = useHospitalAdminScope();
  const { currentLanguage, setLanguageCode, t } = useLanguage();
  const { simpleView, setSimpleView, speakText } = useAccessibility();

  const handleLogout = () => {
    api.clearToken();
    router.replace("/login");
  };

  if (!scope) return null;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3.5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: Ground-Level Operational Scope Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-white tracking-tight">{scope.hospital.name}</h1>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/30 text-teal-400">
                {scope.admin.admin_display_id}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                OPERATIONAL
              </span>
              {scope.emergency_status !== "NORMAL" && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse">
                  {scope.emergency_status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500" />
                {scope.hospital.city}, {scope.hospital.state}
              </span>
              <span>•</span>
              <span className="text-slate-500">
                HFR ID: <span className="font-mono text-slate-400">{scope.hospital.hfr_id || "ABDM-HFR-READY"}</span>
              </span>
              <span>•</span>
              <span className="text-slate-400 font-medium">{scope.admin.full_name}</span>
            </div>
          </div>
        </div>

        {/* Right: Language Selector, Simple View, Voice Help & User Actions */}
        <div className="flex items-center gap-2.5 self-end md:self-auto flex-wrap">
          {/* Simple View Toggle */}
          <button
            onClick={() => {
              setSimpleView((prev) => !prev);
              speakText(simpleView ? "Switching to standard layout" : "Simple view enabled with large controls");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              simpleView
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
            title="Toggle Elder / High Legibility View"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span suppressHydrationWarning>{simpleView ? t("normal_view", "Standard View") : t("simple_view", "Simple View")}</span>
          </button>

          {/* 22 Language Selector */}
          <div className="relative flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200">
            <Globe className="w-3.5 h-3.5 text-teal-400 mr-1.5 shrink-0" />
            <select
              aria-label="Select Interface Language"
              value={currentLanguage.code}
              onChange={(e) => setLanguageCode(e.target.value)}
              className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer pr-1"
            >
              {INDIAN_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-200">
                  {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
          </div>

          {/* Voice Prompt Button */}
          <button
            onClick={() =>
              speakText(
                `${scope.hospital.name}. Logged in as ${scope.admin.full_name}. Active waiting queue is ${scope.metrics.waiting_in_queue} patients.`
              )
            }
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-teal-400 transition-colors"
            title="Read out facility status"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
