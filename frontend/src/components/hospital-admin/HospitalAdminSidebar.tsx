"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertOctagon,
  BarChart3,
  Calendar,
  Clock,
  FileText,
  FlaskConical,
  HeartPulse,
  History,
  Layers,
  LayoutDashboard,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  Users,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAccessibility } from "@/context/AccessibilityContext";

interface NavItem {
  href: string;
  labelKey: string;
  fallbackLabel: string;
  icon: any;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/hospital-admin",
    labelKey: "ground_level_scope",
    fallbackLabel: "Scope Overview",
    icon: LayoutDashboard,
  },
  {
    href: "/hospital-admin/departments",
    labelKey: "departments",
    fallbackLabel: "Departments",
    icon: Layers,
  },
  {
    href: "/hospital-admin/staff",
    labelKey: "staff",
    fallbackLabel: "Hospital Staff",
    icon: Users,
  },
  {
    href: "/hospital-admin/doctors",
    labelKey: "doctors_roster",
    fallbackLabel: "Doctors Roster",
    icon: Stethoscope,
  },
  {
    href: "/hospital-admin/schedules",
    labelKey: "schedules",
    fallbackLabel: "OPD Schedules",
    icon: Clock,
  },
  {
    href: "/hospital-admin/appointments",
    labelKey: "appointments",
    fallbackLabel: "Appointments",
    icon: Calendar,
  },
  {
    href: "/hospital-admin/queue",
    labelKey: "queue_waiting",
    fallbackLabel: "Queue & Waiting Room",
    icon: Activity,
  },
  {
    href: "/hospital-admin/operations",
    labelKey: "operations",
    fallbackLabel: "Operations & Alerts",
    icon: Radio,
  },
  {
    href: "/hospital-admin/lab",
    labelKey: "lab_diagnostics",
    fallbackLabel: "Lab & Diagnostics",
    icon: FlaskConical,
  },
  {
    href: "/hospital-admin/reports",
    labelKey: "reports",
    fallbackLabel: "Operational Reports",
    icon: BarChart3,
  },
  {
    href: "/hospital-admin/security",
    labelKey: "security",
    fallbackLabel: "Security & Sessions",
    icon: ShieldCheck,
  },
  {
    href: "/hospital-admin/audit",
    labelKey: "audit_logs",
    fallbackLabel: "Hospital Audit",
    icon: History,
  },
  {
    href: "/hospital-admin/profile",
    labelKey: "profile",
    fallbackLabel: "Admin Profile",
    icon: UserCheck,
  },
];

export const HospitalAdminSidebar: React.FC = () => {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { simpleView } = useAccessibility();

  return (
    <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 shrink-0 flex flex-col justify-between p-4">
      <div className="space-y-6">
        {/* CareFlow Hospital Operations Brand */}
        <div className="flex items-center gap-2.5 px-2 py-1">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <HeartPulse className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">CareFlow Ops</h2>
            <p className="text-[10px] text-teal-400 font-mono font-medium">HOSPITAL ADMIN</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/hospital-admin"
                ? pathname === "/hospital-admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-xl font-medium transition-all ${
                  simpleView
                    ? "px-4 py-3.5 text-base min-h-[48px]"
                    : "px-3 py-2.5 text-xs min-h-[38px]"
                } ${
                  isActive
                    ? "bg-teal-500/15 text-teal-300 border border-teal-500/30 font-semibold shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`${simpleView ? "w-5 h-5" : "w-4 h-4"} ${
                      isActive ? "text-teal-400" : "text-slate-500"
                    }`}
                  />
                  <span>{t(item.labelKey, item.fallbackLabel)}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Notice */}
      <div className="pt-4 border-t border-slate-800/80 px-2 text-[11px] text-slate-500">
        <p className="font-semibold text-slate-400">Ground Facility Mode</p>
        <p className="text-[10px] mt-0.5 leading-relaxed">
          Isolated operational boundary. Platform-wide changes require Super Admin clearance.
        </p>
      </div>
    </aside>
  );
};
