"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Building2,
  Stethoscope,
  Users,
  Shield,
  Sliders,
  Sparkles,
  Activity,
  ArrowRight,
  X,
  FileText,
  Lock,
} from "lucide-react";
import { api } from "@/lib/api";

interface SearchResultItem {
  id: string;
  type: "doctor" | "hospital" | "user" | "feature" | "nav";
  title: string;
  subtitle: string;
  url: string;
  status?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_COMMANDS: SearchResultItem[] = [
  { id: "nav-cmd", type: "nav", title: "Command Center", subtitle: "Platform operations & live health overview", url: "/admin" },
  { id: "nav-hosp", type: "nav", title: "Hospital Management", subtitle: "Inspect facilities, departments & suspension", url: "/admin/hospitals" },
  { id: "nav-doc", type: "nav", title: "Doctor Verification Center", subtitle: "Credentials, council registration & roster", url: "/admin/doctors" },
  { id: "nav-users", type: "nav", title: "User & Role Directory", subtitle: "Account elevation, roles & access controls", url: "/admin/users" },
  { id: "nav-sec", type: "nav", title: "Security Center", subtitle: "Failed logins, suspicious signals & session revocation", url: "/admin/security" },
  { id: "nav-audit", type: "nav", title: "Audit Explorer", subtitle: "Tamper-evident logs & payload hash inspection", url: "/admin/audit" },
  { id: "nav-feat", type: "nav", title: "Feature Control", subtitle: "AI Scribe, Smart Queue & ABDM toggles", url: "/admin/features" },
  { id: "nav-ai", type: "nav", title: "AI Governance", subtitle: "Gemini token usage, error rate & human review policy", url: "/admin/ai-governance" },
  { id: "nav-health", type: "nav", title: "Platform Health", subtitle: "Database, WebSockets, Redis, real-time metrics", url: "/admin/health" },
  { id: "nav-prof", type: "nav", title: "Admin Profile & Sessions", subtitle: "Session token inspection & danger zone", url: "/admin/profile" },
];

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults(DEFAULT_COMMANDS);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or toggle
        }
      } else if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search query to backend
  useEffect(() => {
    if (!query.trim()) {
      setResults(DEFAULT_COMMANDS);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get<{
          doctors: any[];
          hospitals: any[];
          users: any[];
          features: any[];
        }>(`/admin/global-search?q=${encodeURIComponent(query.trim())}`);

        const combined: SearchResultItem[] = [];

        // Hospitals
        (data.hospitals || []).forEach((h) => {
          combined.push({
            id: `hosp-${h.id}`,
            type: "hospital",
            title: h.name,
            subtitle: `${h.city}, ${h.state} • ${h.is_active ? "Active" : "Suspended"}`,
            url: "/admin/hospitals",
            status: h.is_active ? "ACTIVE" : "SUSPENDED",
          });
        });

        // Doctors
        (data.doctors || []).forEach((d) => {
          combined.push({
            id: `doc-${d.id}`,
            type: "doctor",
            title: `Dr. ${d.full_name}`,
            subtitle: `${d.specialization || "Doctor"} • Reg: ${d.registration_number || "Verified"}`,
            url: "/admin/doctors",
            status: d.is_active ? "ACTIVE" : "SUSPENDED",
          });
        });

        // Users
        (data.users || []).forEach((u) => {
          combined.push({
            id: `user-${u.id}`,
            type: "user",
            title: u.full_name || u.phone,
            subtitle: `Role: ${u.role} • ${u.phone}`,
            url: "/admin/users",
            status: u.is_active ? "ACTIVE" : "SUSPENDED",
          });
        });

        // Features
        (data.features || []).forEach((f) => {
          combined.push({
            id: `feat-${f.key}`,
            type: "feature",
            title: f.label,
            subtitle: f.description,
            url: "/admin/features",
            status: f.enabled ? "ENABLED" : "DISABLED",
          });
        });

        // Add matching local nav items
        const matchingNav = DEFAULT_COMMANDS.filter(
          (c) =>
            c.title.toLowerCase().includes(query.toLowerCase()) ||
            c.subtitle.toLowerCase().includes(query.toLowerCase())
        );

        setResults([...combined, ...matchingNav]);
        setSelectedIndex(0);
      } catch (err) {
        console.error("Command palette search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle arrow navigation and enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  const handleSelect = (item: SearchResultItem) => {
    onClose();
    router.push(item.url);
  };

  if (!isOpen) return null;

  const renderIcon = (type: SearchResultItem["type"]) => {
    switch (type) {
      case "hospital":
        return <Building2 className="w-4 h-4 text-emerald-400" />;
      case "doctor":
        return <Stethoscope className="w-4 h-4 text-blue-400" />;
      case "user":
        return <Users className="w-4 h-4 text-purple-400" />;
      case "feature":
        return <Sliders className="w-4 h-4 text-amber-400" />;
      default:
        return <ArrowRight className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-100">
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800/80 gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search hospitals, doctors, users, features, or jump to page..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-slate-500 hover:text-slate-300 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-400 rounded border border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-800/40">
          {loading && (
            <div className="p-4 text-center text-xs text-slate-400">
              Searching platform records...
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-xs">
              No matching records or commands found for &ldquo;{query}&rdquo;.
            </div>
          )}

          {!loading &&
            results.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                  idx === selectedIndex
                    ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30"
                    : "text-slate-300 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center shrink-0">
                    {renderIcon(item.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-100">{item.title}</span>
                      {item.status && (
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                            item.status === "ACTIVE" || item.status === "ENABLED"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {item.status}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{item.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="hidden sm:inline font-mono capitalize">{item.type}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono text-slate-300">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono text-slate-300">↵</kbd> Select
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono text-slate-300">esc</kbd> Dismiss
            </span>
          </div>
          <span className="text-[10px] text-slate-400">CareFlow Command Palette</span>
        </div>
      </div>
    </div>
  );
}
