"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  Calendar,
  Compass,
  FileText,
  FlaskConical,
  HelpCircle,
  Globe,
  Eye,
  Type,
  Sun,
  Moon,
  User,
  LogOut,
  Menu,
  X,
  PhoneCall,
  ShieldCheck,
  ChevronDown,
  Check,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Send,
  MessageSquare,
} from "lucide-react";
import { useLanguage, INDIAN_LANGUAGES } from "@/context/LanguageContext";
import { useAccessibility, FontSizeLevel } from "@/context/AccessibilityContext";
import { api } from "@/lib/api";

interface SupportConfigData {
  support_email: string;
  support_phone?: string | null;
  is_phone_active: boolean;
  operating_hours: string;
  physical_desk_location: string;
  emergency_guidance: string;
  senior_citizen_guidance: string;
}

interface SupportTicketItem {
  id: string;
  ticket_reference: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  admin_response?: string | null;
  created_at: string;
}

export function PatientHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentLanguage, setLanguageCode, t } = useLanguage();
  const { simpleView, setSimpleView, highContrast, setHighContrast, fontSize, setFontSize, speakText } =
    useAccessibility();

  const [patientName, setPatientName] = useState<string>("Patient");
  const [patientPhone, setPatientPhone] = useState<string>("");
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [fontSizeDropdownOpen, setFontSizeDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [langSearch, setLangSearch] = useState("");

  // Support modal state
  const [supportConfig, setSupportConfig] = useState<SupportConfigData | null>(null);
  const [supportTickets, setSupportTickets] = useState<SupportTicketItem[]>([]);
  const [supportTab, setSupportTab] = useState<"info" | "new" | "tickets">("info");
  const [ticketCategory, setTicketCategory] = useState("APPOINTMENT");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState<string | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const profileRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const fontSizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load patient profile name
    api.get<any>("/auth/me")
      .then((data) => {
        const name = data?.full_name || data?.user?.full_name || "Patient";
        setPatientName(name);
        setPatientPhone(data?.phone || data?.user?.phone || "");
      })
      .catch(() => {
        setPatientName("Patient");
      });
  }, []);

  useEffect(() => {
    if (showHelpModal) {
      api.get<SupportConfigData>("/support/config")
        .then((cfg) => setSupportConfig(cfg))
        .catch(() => {});
      api.get<SupportTicketItem[]>("/support/tickets/my")
        .then((tkts) => setSupportTickets(tkts || []))
        .catch(() => {});
    }
  }, [showHelpModal]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
      if (fontSizeRef.current && !fontSizeRef.current.contains(event.target as Node)) {
        setFontSizeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    api.clearToken();
    if (typeof window !== "undefined") {
      localStorage.removeItem("careflow_user");
      localStorage.removeItem("careflow_role");
    }
    router.push("/patient/login");
  };

  const navLinks = [
    {
      name: t("nav.dashboard", "Dashboard"),
      href: "/patient/dashboard",
      icon: Heart,
      active: pathname === "/patient/dashboard",
    },
    {
      name: t("patient.my_appointments", "My Appointments"),
      href: "/patient/appointments",
      icon: Calendar,
      active: pathname?.startsWith("/patient/appointments"),
    },
    {
      name: t("patient.my_care_journey", "My Care Journey"),
      href: "/patient/journey",
      icon: Compass,
      active: pathname?.startsWith("/patient/journey"),
    },
    {
      name: t("patient.prescriptions_nav", "Prescriptions"),
      href: "/patient/dashboard#prescriptions",
      icon: FileText,
      active: false,
    },
    {
      name: t("patient.lab_reports_nav", "Lab Reports"),
      href: "/patient/dashboard#lab-reports",
      icon: FlaskConical,
      active: false,
    },
  ];

  const filteredLanguages = INDIAN_LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(langSearch.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(langSearch.toLowerCase())
  );

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-2 sm:gap-4">
            
            {/* Logo / Wordmark & Subpage Back Arrow */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {pathname !== "/patient/dashboard" && (
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined" && window.history.length > 1) {
                      router.back();
                    } else {
                      router.push("/patient/dashboard");
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 font-bold text-xs sm:text-sm min-h-[44px] shadow-2xs transition-all group"
                  title={t("patient.back", "Go Back")}
                  aria-label={t("patient.back", "Go Back")}
                >
                  <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-emerald-700 group-hover:-translate-x-0.5 transition-transform" />
                  <span className="hidden sm:inline">{t("patient.back", "Back")}</span>
                </button>
              )}

              <Link
                href="/patient/dashboard"
                className="flex items-center gap-2.5 group focus:outline-hidden focus:ring-2 focus:ring-emerald-500 rounded-xl p-1"
                aria-label="CareFlow Patient Dashboard Home"
              >
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                  <Heart className="w-6 h-6 fill-white/20 stroke-[2.2]" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-xl tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
                      CareFlow
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                      Patient
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">
                    {t("patient.subtitle", "Your healthcare journey, in one place")}
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all min-h-[44px] ${
                      link.active
                        ? "bg-emerald-50 text-emerald-800 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${link.active ? "text-emerald-700" : "text-slate-400"}`} />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all min-h-[44px]"
              >
                <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{t("patient.help", "Help")}</span>
              </button>
            </nav>

            {/* Controls Bar: Accessibility & Simple View & Languages & Profile */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              
              {/* Prominent Simple View / Elder Mode Toggle */}
              <button
                type="button"
                onClick={() => {
                  setSimpleView(!simpleView);
                  speakText(simpleView ? "Switched to standard view" : "Switched to elder simple view");
                }}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold min-h-[44px] border transition-all shadow-xs ${
                  simpleView
                    ? "bg-amber-500 text-slate-950 border-amber-600 ring-2 ring-amber-300"
                    : "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                }`}
                aria-pressed={simpleView}
                title="Toggle larger fonts, higher spacing and simpler layout"
              >
                <Eye className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">
                  {simpleView ? t("patient.standard_view", "Standard View") : t("patient.simple_view", "Elder / Simple View")}
                </span>
                <span className="sm:hidden font-extrabold">{simpleView ? "Standard" : "Elder"}</span>
              </button>

              {/* Text Size (A, A+, A++) */}
              <div className="relative" ref={fontSizeRef}>
                <button
                  type="button"
                  onClick={() => setFontSizeDropdownOpen(!fontSizeDropdownOpen)}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm flex items-center gap-1.5 min-h-[44px] min-w-[44px] justify-center transition-colors"
                  title="Adjust font size"
                  aria-label="Adjust font size"
                >
                  <Type className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="hidden md:inline font-bold">
                    {fontSize === "xlarge" ? "A++" : fontSize === "large" ? "A+" : "A"}
                  </span>
                </button>

                {fontSizeDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="text-[11px] font-bold text-slate-400 px-3 py-1 uppercase tracking-wider">
                      {t("patient.text_size", "Text Size")}
                    </div>
                    {(
                      [
                        { level: "normal", label: "Normal (A)" },
                        { level: "large", label: "Large (A+)" },
                        { level: "xlarge", label: "Extra Large (A++)" },
                      ] as { level: FontSizeLevel; label: string }[]
                    ).map((item) => (
                      <button
                        key={item.level}
                        type="button"
                        onClick={() => {
                          setFontSize(item.level);
                          setFontSizeDropdownOpen(false);
                          speakText(`Font size set to ${item.level}`);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between min-h-[44px] transition-colors ${
                          fontSize === item.level
                            ? "bg-emerald-50 text-emerald-800 font-bold"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span>{item.label}</span>
                        {fontSize === item.level && <Check className="w-4 h-4 text-emerald-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* High Contrast Toggle */}
              <button
                type="button"
                onClick={() => {
                  setHighContrast(!highContrast);
                  speakText(highContrast ? "High contrast disabled" : "High contrast enabled");
                }}
                className={`p-2.5 rounded-xl border min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors ${
                  highContrast
                    ? "bg-slate-900 text-yellow-300 border-slate-900 shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
                title={highContrast ? "Disable High Contrast" : "Enable High Contrast"}
                aria-pressed={highContrast}
                aria-label="High contrast mode"
              >
                {highContrast ? <Sun className="w-4 h-4 fill-yellow-300" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* 22 Scheduled Indian Languages Dropdown */}
              <div className="relative" ref={langRef}>
                <button
                  type="button"
                  onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs sm:text-sm min-h-[44px] transition-colors"
                  title="Select Language"
                  aria-label="Select Language"
                >
                  <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">{currentLanguage.nativeName}</span>
                  {currentLanguage.code !== "en" && (
                    <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
                      ({currentLanguage.name})
                    </span>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {langDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="p-2 border-b border-slate-100 mb-1">
                      <input
                        type="text"
                        placeholder="Search language / भाषा खोजें..."
                        value={langSearch}
                        onChange={(e) => setLangSearch(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {filteredLanguages.map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            setLanguageCode(lang.code);
                            setLangDropdownOpen(false);
                            setLangSearch("");
                            speakText(`Language changed to ${lang.name}`);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm flex items-center justify-between min-h-[44px] transition-colors ${
                            currentLanguage.code === lang.code
                              ? "bg-emerald-50 text-emerald-800 font-bold"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold">{lang.nativeName}</span>
                            <span className="text-[11px] text-slate-400">{lang.name}</span>
                          </div>
                          {currentLanguage.code === lang.code && (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Patient Profile Menu */}
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 min-h-[44px] transition-colors"
                  aria-label="Open profile menu"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm">
                    {patientName.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden md:flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[110px]">
                      {patientName}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                      <ShieldCheck className="w-2.5 h-2.5" /> Verified
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="p-3 border-b border-slate-100">
                      <div className="font-bold text-sm text-slate-900">{patientName}</div>
                      {patientPhone && (
                        <div className="text-xs text-slate-500 font-mono mt-0.5">+91 {patientPhone}</div>
                      )}
                      <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        ABDM Verified Patient
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/patient/profile"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 min-h-[44px] transition-colors"
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        <span>{t("patient.my_profile", "My Profile & Display")}</span>
                      </Link>

                      <Link
                        href="/patient/consent"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 min-h-[44px] transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-slate-400" />
                        <span>{t("patient.consent_privacy", "My Consent & Privacy")}</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          setShowHelpModal(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 min-h-[44px] transition-colors text-left"
                      >
                        <HelpCircle className="w-4 h-4 text-slate-400" />
                        <span>{t("patient.help", "Help & Support")}</span>
                      </button>
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 min-h-[44px] transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>{t("patient.logout", "Log Out")}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Drawer Toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-2 animate-in slide-in-from-top-4">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-base transition-colors min-h-[48px] ${
                    link.active
                      ? "bg-emerald-50 text-emerald-800"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${link.active ? "text-emerald-700" : "text-slate-400"}`} />
                  <span>{link.name}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setShowHelpModal(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-base text-slate-700 hover:bg-slate-100 min-h-[48px] transition-colors text-left"
            >
              <HelpCircle className="w-5 h-5 text-slate-400" />
              <span>{t("patient.help", "Help & Support")}</span>
            </button>
          </div>
        )}
      </header>

      {/* Patient Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <PhoneCall className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{t("patient.help", "Help & Support Desk")}</h3>
                  <p className="text-xs text-slate-500">Verified Hospital Guidance & Assistance</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowHelpModal(false);
                  setTicketSuccess(null);
                  setTicketError(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setSupportTab("info")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  supportTab === "info"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Hospital Guidance
              </button>
              <button
                type="button"
                onClick={() => setSupportTab("new")}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  supportTab === "new"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Request</span>
              </button>
              <button
                type="button"
                onClick={() => setSupportTab("tickets")}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  supportTab === "tickets"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>My Requests ({supportTickets.length})</span>
              </button>
            </div>

            {/* Tab 1: Hospital Guidance & Contacts */}
            {supportTab === "info" && (
              <div className="space-y-3.5 overflow-y-auto pr-1">
                {/* Emergency Guidance */}
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-xs text-rose-950 uppercase tracking-wider">
                      Medical Emergency Notice
                    </div>
                    <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                      {supportConfig?.emergency_guidance ||
                        "For acute medical emergencies, call national emergency response at 112 immediately or proceed to the nearest emergency trauma center."}
                    </p>
                  </div>
                </div>

                {/* Desk #1 Physical Assistance */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>In-Person Assistance Counter</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {supportConfig?.physical_desk_location ||
                      "Desk #1 (CareFlow Digital Assistance) in Main Hospital Lobby"}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Hours: {supportConfig?.operating_hours || "Monday to Saturday: 8:00 AM - 8:00 PM IST"}
                  </p>
                </div>

                {/* Support Email */}
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-emerald-700" />
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        Official Patient Support Email
                      </div>
                      <a
                        href={`mailto:${supportConfig?.support_email || "support@careflow.health"}`}
                        className="text-xs font-bold text-emerald-950 hover:underline"
                      >
                        {supportConfig?.support_email || "support@careflow.health"}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Phone Hotline if active, or notice */}
                <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                    Direct Telephone Assistance
                  </div>
                  {supportConfig?.is_phone_active && supportConfig?.support_phone ? (
                    <a
                      href={`tel:${supportConfig.support_phone}`}
                      className="text-lg font-black text-teal-950 font-mono block mt-1 hover:underline"
                    >
                      {supportConfig.support_phone}
                    </a>
                  ) : (
                    <p className="text-xs text-teal-900 mt-1">
                      Direct voice line is currently offline. Please submit an online support request or visit Desk #1.
                    </p>
                  )}
                </div>

                {/* Senior Citizen Priority */}
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                  <div className="font-bold text-xs text-amber-950">Senior Citizen / Elder Priority</div>
                  <p className="text-xs text-amber-900 mt-0.5">
                    {supportConfig?.senior_citizen_guidance ||
                      "Elderly patients (60+) receive designated seating priority and wheelchair assistance at Desk #1."}
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: New Ticket Form */}
            {supportTab === "new" && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!ticketSubject.trim() || !ticketDesc.trim()) return;
                  setTicketSubmitting(true);
                  setTicketError(null);
                  setTicketSuccess(null);
                  try {
                    const created = await api.post<SupportTicketItem>("/support/tickets", {
                      subject: ticketSubject.trim(),
                      category: ticketCategory,
                      description: ticketDesc.trim(),
                      priority: "NORMAL",
                    });
                    setTicketSuccess(`Request #${created.ticket_reference} submitted successfully! Our care coordination desk is reviewing it.`);
                    setTicketSubject("");
                    setTicketDesc("");
                    const refreshed = await api.get<SupportTicketItem[]>("/support/tickets/my");
                    setSupportTickets(refreshed || []);
                  } catch (err: any) {
                    setTicketError(err.message || "Failed to submit request. Please try again.");
                  } finally {
                    setTicketSubmitting(false);
                  }
                }}
                className="space-y-3.5 overflow-y-auto pr-1"
              >
                {ticketSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{ticketSuccess}</span>
                  </div>
                )}
                {ticketError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{ticketError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assistance Category</label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 font-medium"
                  >
                    <option value="APPOINTMENT">Appointment & Rescheduling</option>
                    <option value="QUEUE">Queue Token & Smart Check-in</option>
                    <option value="PRESCRIPTION">Prescription & Medications</option>
                    <option value="LAB">Diagnostic Lab Reports</option>
                    <option value="GENERAL">General Hospital Support</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Need assistance rescheduling OPD consult"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Details / Description</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe your inquiry or assistance needed..."
                    value={ticketDesc}
                    onChange={(e) => setTicketDesc(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                <button
                  type="submit"
                  disabled={ticketSubmitting}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
                >
                  {ticketSubmitting ? (
                    <span>Submitting Request...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Support Ticket</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Tab 3: My Tickets */}
            {supportTab === "tickets" && (
              <div className="space-y-3 overflow-y-auto pr-1">
                {supportTickets.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No support requests submitted yet.</p>
                  </div>
                ) : (
                  supportTickets.map((tkt) => (
                    <div key={tkt.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-800 text-[11px]">{tkt.ticket_reference}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tkt.status === "RESOLVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : tkt.status === "IN_PROGRESS"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {tkt.status}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900">{tkt.subject}</div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{tkt.description}</p>
                      {tkt.admin_response && (
                        <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px]">
                          <span className="font-bold">Desk Response:</span> {tkt.admin_response}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowHelpModal(false);
                setTicketSuccess(null);
                setTicketError(null);
              }}
              className="w-full py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors min-h-[44px] shrink-0"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

