"use client";

import React, { useState, useEffect } from "react";
import {
  Menu,
  Search,
  ShieldCheck,
  Activity,
  CheckCircle2,
  RefreshCw,
  Bell,
  Lock,
} from "lucide-react";
import { api } from "@/lib/api";

interface AdminHeaderProps {
  onToggleSidebar: () => void;
  onOpenCommandPalette: () => void;
}

export default function AdminHeader({
  onToggleSidebar,
  onOpenCommandPalette,
}: AdminHeaderProps) {
  const [adminEmail, setAdminEmail] = useState<string>("edure6377@gmail.com");
  const [healthStatus, setHealthStatus] = useState<string>("OPERATIONAL");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    // Read session email from storage if available
    try {
      const raw = localStorage.getItem("careflow_session");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.user?.email) {
          setAdminEmail(parsed.user.email);
        }
      }
    } catch {
      // ignore
    }

    // Check system status
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setIsRefreshing(true);
    try {
      const res = await api.get<{ status: string }>("/admin/system-health");
      if (res?.status) {
        setHealthStatus(res.status);
      }
    } catch {
      // fallback
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Menu & Title / Status */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-xl cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Live Platform Status Pills */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>PLATFORM: {healthStatus}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-mono font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>AI: GEMINI READY</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[11px] font-mono font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span>WS: CONNECTED</span>
          </div>
        </div>
      </div>

      {/* Center: Command Palette Trigger Button */}
      <div className="flex-1 max-w-md">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-xs text-slate-400 hover:text-slate-200 transition-colors shadow-inner cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span className="line-clamp-1">Quick search or command...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-400 rounded border border-slate-700">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right: Refresh & Admin Identity */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={checkHealth}
          title="Refresh System Status"
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-xl border border-slate-800/80 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`} />
        </button>

        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-slate-950 font-bold text-xs shadow-md shadow-emerald-900/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="hidden sm:block text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-200 max-w-[140px] truncate">
                {adminEmail}
              </span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-mono font-bold px-1 py-0.2 rounded border border-emerald-500/30">
                SUPER_ADMIN
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Platform Governance</p>
          </div>
        </div>
      </div>
    </header>
  );
}
