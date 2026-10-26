"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Stethoscope,
  Users,
  ShieldAlert,
  History,
  Sparkles,
  Activity,
  Sliders,
  UserCheck,
  LogOut,
  X,
  ExternalLink,
} from "lucide-react";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavSection {
  title: string;
  items: {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Command Center", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    title: "PLATFORM",
    items: [
      { label: "Hospitals", href: "/admin/hospitals", icon: Building2 },
      { label: "Doctor Roster", href: "/admin/doctors", icon: Stethoscope },
      { label: "User Management", href: "/admin/users", icon: Users },
    ],
  },
  {
    title: "GOVERNANCE",
    items: [
      { label: "Security Center", href: "/admin/security", icon: ShieldAlert },
      { label: "Audit Explorer", href: "/admin/audit", icon: History },
    ],
  },
  {
    title: "INTELLIGENCE",
    items: [
      { label: "AI Governance", href: "/admin/ai-governance", icon: Sparkles },
      { label: "Platform Health", href: "/admin/health", icon: Activity },
    ],
  },
  {
    title: "CONFIGURATION",
    items: [
      { label: "Feature Control", href: "/admin/features", icon: Sliders },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
      { label: "Profile & Sessions", href: "/admin/profile", icon: UserCheck },
    ],
  },
];

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("careflow_token");
      localStorage.removeItem("careflow_session");
      localStorage.removeItem("careflow_active_persona");
      window.location.href = "/admin/login";
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-800/80 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
              <Activity className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black tracking-tight text-white">CareFlow</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-mono px-1.5 py-0.2 rounded border border-emerald-500/30 font-bold">
                  OPS
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Super Admin Mission Control</p>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                {section.title}
              </div>
              <div className="space-y-0.5 pt-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => onClose()}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                        isActive
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 transition-colors ${
                            isActive
                              ? "text-emerald-400"
                              : "text-slate-400 group-hover:text-slate-300"
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info & Logout */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5" />
              Patient & OPD Portal
            </span>
            <span className="text-[10px] text-slate-400">Live</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>
    </>
  );
}
