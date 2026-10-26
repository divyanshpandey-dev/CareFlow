"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Calendar,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  MonitorCheck,
  ShieldCheck,
  Stethoscope,
  User,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";

const DEMO_PERSONAS = [
  { label: "Rahul Verma (Patient)", id: "rahul@patient.com", role: "PATIENT", badge: "Patient" },
  { label: "Dr. Ananya Sharma (Cardiology)", id: "dr.ananya@citycare.com", role: "DOCTOR", badge: "Clinician" },
  { label: "Amit Desai (Lab Tech)", id: "lab@citycare.com", role: "LAB_TECH", badge: "Diagnostics" },
  { label: "Suresh Menon (Hospital Admin)", id: "admin@citycare.com", role: "HOSPITAL_ADMIN", badge: "Hospital Ops" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<string>("Rahul Verma (Patient)");
  const [apiConnected, setApiConnected] = useState<boolean>(true);

  useEffect(() => {
    // Check API health on mount
    api.get<{ status: string }>("/status")
      .then(() => setApiConnected(true))
      .catch(() => setApiConnected(false));

    // Check for stored persona if any
    const stored = localStorage.getItem("careflow_active_persona");
    if (stored) {
      setCurrentUser(stored);
    }
  }, []);

  if (
    pathname?.startsWith("/patient") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/hospital-admin") ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/unauthorized")
  ) {
    return null;
  }

  const switchPersona = async (persona: typeof DEMO_PERSONAS[0]) => {
    try {
      const res = await api.post<{ access_token: string; user: any }>("/auth/login", {
        identifier: persona.id,
        password: "password123",
      });
      api.setToken(res.access_token);
      localStorage.setItem("careflow_active_persona", persona.label);
      setCurrentUser(persona.label);
    } catch (e) {
      console.error("Failed to switch demo persona:", e);
    }
  };

  const navLinks = [
    { href: "/patient/dashboard", label: "Patient Journey", icon: User, match: "/patient" },
    { href: "/doctor/cockpit", label: "Doctor Cockpit", icon: Stethoscope, match: "/doctor" },
    { href: "/lab", label: "Diagnostic Lab", icon: FlaskConical, match: "/lab" },
    { href: "/hospital/operations", label: "Hospital Ops", icon: LayoutDashboard, match: "/hospital" },
    { href: "/demo", label: "3-Screen Live Demo", icon: MonitorCheck, match: "/demo", highlight: true },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Activity className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <span className="font-bold text-xl text-slate-900 tracking-tight">CareFlow</span>
                <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Operating Layer
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname.startsWith(link.match);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    link.highlight
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                      : isActive
                      ? "bg-slate-100 text-slate-900 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Persona Switcher & API Status */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  apiConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                }`}
              />
              <span className="text-slate-600 font-mono text-[11px]">
                {apiConnected ? "API Live" : "API Offline"}
              </span>
            </div>

            {/* Super Admin Portal Link */}
            <Link
              href="/admin/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all border border-slate-700 shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
              <span>Admin Portal</span>
            </Link>

            <div className="relative group">
              <select
                aria-label="Demo Persona Switcher"
                value={currentUser}
                onChange={(e) => {
                  const target = DEMO_PERSONAS.find((p) => p.label === e.target.value);
                  if (target) switchPersona(target);
                }}
                className="text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg py-1.5 px-2.5 text-slate-800 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              >
                {DEMO_PERSONAS.map((p) => (
                  <option key={p.id} value={p.label}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
