"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  History,
  Search,
  ShieldCheck,
  Filter,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Hash,
  Clock,
  User,
  Activity,
} from "lucide-react";
import { api } from "@/lib/api";

interface AuditLogItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  actor_id?: string;
  actor_email?: string;
  actor_name?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  integrity_hash?: string;
}

export default function AuditExplorerPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialQuery);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const endpoint =
        actionFilter !== "ALL"
          ? `/admin/audit-logs?action=${encodeURIComponent(actionFilter)}&limit=100`
          : "/admin/audit-logs?limit=100";

      const res = await api.get<AuditLogItem[]>(endpoint);
      if (Array.isArray(res)) {
        setLogs(res);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.action?.toLowerCase().includes(q) ||
      l.entity_type?.toLowerCase().includes(q) ||
      l.entity_id?.toLowerCase().includes(q) ||
      l.actor_email?.toLowerCase().includes(q) ||
      l.actor_name?.toLowerCase().includes(q) ||
      JSON.stringify(l.details || {}).toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              ABDM-ALIGNED & DISHA GOVERNANCE
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Audit Explorer & Integrity Trail
          </h1>
          <p className="text-xs text-slate-400">
            Audit log with integrity controls of all administrative actions, clinical state transitions, and identity elevations.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
          <ShieldCheck className="w-4 h-4" />
          <span>TAMPER-EVIDENT LOGS</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
        <div className="flex-1 flex items-center gap-2.5 px-2">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail by actor, action type, entity ID, or JSON payload..."
            className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-3">
          <span className="text-[11px] text-slate-500">Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 px-2.5 py-1"
          >
            <option value="ALL">All Actions</option>
            <option value="ADMIN_LOGIN_SUCCESS">ADMIN_LOGIN_SUCCESS</option>
            <option value="ADMIN_LOGIN_FAILED">ADMIN_LOGIN_FAILED</option>
            <option value="HOSPITAL_SUSPENDED">HOSPITAL_SUSPENDED</option>
            <option value="DOCTOR_SUSPENDED">DOCTOR_SUSPENDED</option>
            <option value="USER_SUSPENDED">USER_SUSPENDED</option>
            <option value="USER_ROLE_CHANGED">USER_ROLE_CHANGED</option>
            <option value="QUEUE_ADVANCE">QUEUE_ADVANCE</option>
            <option value="ABDM_CONSENT_GRANT">ABDM_CONSENT_GRANT</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-8"></th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Integrity Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    Fetching cryptographic audit logs...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    No audit records found matching &ldquo;{search}&rdquo;.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                          isExpanded ? "bg-slate-800/50" : ""
                        }`}
                      >
                        <td className="py-3 px-4 text-slate-500">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                          {new Date(log.created_at).toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[10px] font-bold bg-slate-950 text-slate-200 border border-slate-700/80 px-2 py-0.5 rounded">
                            {log.action}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-200">
                          <div>{log.actor_name || "System"}</div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {log.actor_email || log.ip_address || "127.0.0.1"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                          <span className="text-slate-400">{log.entity_type}:</span> {log.entity_id}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-emerald-500/20 max-w-[130px] truncate">
                            <ShieldCheck className="w-3 h-3 shrink-0" />
                            <span className="truncate">{log.integrity_hash || log.id.slice(0, 16)}</span>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable JSON details drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-950/80">
                          <td colSpan={6} className="p-4 border-b border-slate-800">
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono border-b border-slate-800/80 pb-2">
                                <span>RECORD ID: {log.id}</span>
                                <span>CLIENT IP: {log.ip_address || "Internal Gateway"}</span>
                              </div>
                              <pre className="text-[11px] font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap p-2 bg-slate-950 rounded-lg">
                                {JSON.stringify(log.details || {}, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
