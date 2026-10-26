"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  ShieldCheck,
  Phone,
  Mail,
  Heart,
  Droplet,
  Eye,
  Type,
  Sun,
  Moon,
  Globe,
  Lock,
  ArrowRight,
  Check,
  Copy,
  AlertCircle,
  HelpCircle,
  PhoneCall,
  Save,
} from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage, INDIAN_LANGUAGES } from "@/context/LanguageContext";
import { useAccessibility, FontSizeLevel } from "@/context/AccessibilityContext";

export default function PatientProfilePage() {
  const { currentLanguage, setLanguageCode, t } = useLanguage();
  const { simpleView, setSimpleView, highContrast, setHighContrast, fontSize, setFontSize, speakText } =
    useAccessibility();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    api.get<any>("/auth/me")
      .then((data) => {
        setProfile(data);
      })
      .catch((err) => {
        console.error("Failed to load profile:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
    speakText(`Copied ${label}`);
  };

  const patientName = profile?.full_name || profile?.user?.full_name || "Rahul Verma";
  const patientPhone = profile?.phone || profile?.user?.phone || "9876543210";
  const patientEmail = profile?.email || profile?.user?.email || "rahul@patient.com";
  const abhaNumber = profile?.patient_profile?.abha_number || "91-4567-8912-3456";
  const abhaAddress = profile?.patient_profile?.abha_address || "rahulverma@abdm";
  const bloodGroup = profile?.patient_profile?.blood_group || "B+";
  const gender = profile?.patient_profile?.gender || "MALE";
  const emergencyName = profile?.patient_profile?.emergency_contact_name || "Anita Verma (Spouse)";
  const emergencyPhone = profile?.patient_profile?.emergency_contact_phone || "9811223344";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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

      {/* Save / Feedback Message */}
      {saveMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between shadow-xs">
          <span>{saveMessage}</span>
          <button type="button" onClick={() => setSaveMessage(null)} className="text-emerald-700">
            &times;
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {t("patient.my_profile", "My Profile & Display Preferences")}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your verified Ayushman Bharat Digital Mission (ABDM) identity, display preferences, and language settings.
        </p>
      </div>

      {/* SECTION 1: Patient Identity Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-2xl shadow-sm">
              {patientName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">{patientName}</h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  ABDM Verified
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Role: <strong>Patient</strong> • NRCeS FHIR Interoperability Active
              </p>
            </div>
          </div>
        </div>

        {/* Identity Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Mobile Number</span>
            <div className="text-sm font-bold text-slate-900 font-mono">+91 {patientPhone}</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Email Address</span>
            <div className="text-sm font-bold text-slate-900 truncate">{patientEmail}</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Blood Group</span>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Droplet className="w-4 h-4 text-rose-500" />
              <span>{bloodGroup}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">ABHA Number</span>
              <button
                type="button"
                onClick={() => handleCopy(abhaNumber, "ABHA Number")}
                className="text-slate-400 hover:text-emerald-600 text-xs flex items-center gap-1"
              >
                {copiedField === "ABHA Number" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="text-sm font-bold text-slate-900 font-mono">{abhaNumber}</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">ABHA Address</span>
              <button
                type="button"
                onClick={() => handleCopy(abhaAddress, "ABHA Address")}
                className="text-slate-400 hover:text-emerald-600 text-xs flex items-center gap-1"
              >
                {copiedField === "ABHA Address" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="text-sm font-bold text-slate-900 font-mono">{abhaAddress}</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Gender</span>
            <div className="text-sm font-bold text-slate-900">{gender}</div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-rose-900 uppercase tracking-wider">
              Emergency Contact (Registered)
            </div>
            <div className="text-base font-bold text-slate-900 mt-1">{emergencyName}</div>
            <p className="text-xs text-rose-800">Directly contactable during hospital emergency admissions.</p>
          </div>
          <a
            href={`tel:${emergencyPhone}`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors shrink-0 min-h-[44px]"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Call +91 {emergencyPhone}</span>
          </a>
        </div>
      </div>

      {/* SECTION 2: Display & Accessibility Preferences */}
      <div id="display" className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-lg font-black text-slate-900">Display & Accessibility Preferences</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tailor the visual experience for high readability, especially for senior citizens.
          </p>
        </div>

        <div className="space-y-4">
          {/* Elder / Simple View */}
          <div className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4 bg-slate-50">
            <div>
              <div className="font-bold text-sm text-slate-900">{t("patient.simple_view", "Elder / Simple View")}</div>
              <p className="text-xs text-slate-500">
                Enlarges interface buttons, increases spacing, and highlights primary actions for comfort.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSimpleView(!simpleView);
                speakText(simpleView ? "Switched to standard view" : "Switched to elder simple view");
              }}
              className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm min-h-[44px] transition-colors border ${
                simpleView
                  ? "bg-amber-500 text-slate-950 border-amber-600 ring-2 ring-amber-300"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              }`}
            >
              {simpleView ? "Enabled" : "Disabled"}
            </button>
          </div>

          {/* Font Size Selection */}
          <div className="p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
            <div>
              <div className="font-bold text-sm text-slate-900">{t("patient.text_size", "Text Size")}</div>
              <p className="text-xs text-slate-500">
                Scales all labels across the patient dashboard and appointment cards.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(
                [
                  { level: "normal", label: "A (Normal)" },
                  { level: "large", label: "A+ (Large)" },
                  { level: "xlarge", label: "A++ (Extra)" },
                ] as { level: FontSizeLevel; label: string }[]
              ).map((item) => (
                <button
                  key={item.level}
                  type="button"
                  onClick={() => {
                    setFontSize(item.level);
                    speakText(`Font size set to ${item.level}`);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold min-h-[44px] transition-colors border ${
                    fontSize === item.level
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* High Contrast */}
          <div className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4 bg-slate-50">
            <div>
              <div className="font-bold text-sm text-slate-900">{t("patient.high_contrast", "High Contrast Mode")}</div>
              <p className="text-xs text-slate-500">
                Enhances visual contrast between text and backgrounds for low-light or vision impairment.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setHighContrast(!highContrast);
                speakText(highContrast ? "High contrast disabled" : "High contrast enabled");
              }}
              className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm min-h-[44px] transition-colors border ${
                highContrast
                  ? "bg-slate-900 text-yellow-300 border-slate-900 ring-2 ring-yellow-300"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              }`}
            >
              {highContrast ? "Enabled" : "Disabled"}
            </button>
          </div>

          {/* Preferred Language */}
          <div className="p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
            <div>
              <div className="font-bold text-sm text-slate-900">Preferred Language (22 Scheduled Languages)</div>
              <p className="text-xs text-slate-500">
                Currently displaying: <strong>{currentLanguage.nativeName} ({currentLanguage.name})</strong>
              </p>
            </div>
            <select
              value={currentLanguage.code}
              onChange={(e) => {
                setLanguageCode(e.target.value);
                const selected = INDIAN_LANGUAGES.find((l) => l.code === e.target.value);
                if (selected) speakText(`Language changed to ${selected.name}`);
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-bold text-xs sm:text-sm min-h-[44px] focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              {INDIAN_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName} — {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 3: DPDP Consent & Privacy Center Quick Link */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-300" />
            <h3 className="font-bold text-base sm:text-lg">Digital Personal Data Protection (DPDP) Center</h3>
          </div>
          <p className="text-xs text-blue-200 max-w-lg leading-relaxed">
            Review which hospitals have active access to your longitudinal medical journey, approve pending clinician requisitions, or revoke external hospital access anytime.
          </p>
        </div>
        <Link
          href="/patient/consent"
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-blue-50 text-slate-900 font-bold text-xs sm:text-sm shadow-sm transition-colors shrink-0 min-h-[44px]"
        >
          <span>Manage Consents</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

