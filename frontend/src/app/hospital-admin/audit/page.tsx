"use client";

import React, { useEffect, useState } from "react";
import { History, Shield, Clock, Loader2, Search, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";

interface AuditItem {
  id: string;
  action: string;
  actor_name: string;
  actor_email: string;
  resource_type: string;
  resource_id: string;
  status: string;
  details?: any;
  created_at: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get<AuditItem[]>("/hospital-admin/audit");
      setLogs(res || []);
    } catch (err: any) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.actor_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-teal-400" />
            Facility Audit Trail
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable log of operational and clinical actions performed within this hospital.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search action or resource..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Audit Events Logged</h3>
          <p className="text-xs text-slate-500 mt-1">
            Actions like department creation, room assignments, and alerts will be logged here.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-mono tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Action</th>
                  <th className="px-5 py-3.5">Resource</th>
                  <th className="px-5 py-3.5">Actor</th>
                  <th className="px-5 py-3.5">Details</th>
                  <th className="px-5 py-3.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-mono font-bold text-teal-400 text-xs">{log.action}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                        {log.resource_type}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-white">{log.actor_name}</div>
                      <div className="text-[11px] text-slate-500">{log.actor_email}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-400 max-w-xs truncate text-[11px]">
                      {log.details ? JSON.stringify(log.details) : "--"}
                    </td>
                    <td className="px-5 py-4 text-right text-slate-500 font-mono text-[11px]">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
