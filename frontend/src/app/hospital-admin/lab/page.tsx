"use client";

import React, { useEffect, useState } from "react";
import { FlaskConical, AlertTriangle, CheckCircle2, Clock, Loader2, Search } from "lucide-react";
import { api } from "@/lib/api";
import { useAccessibility } from "@/context/AccessibilityContext";

interface LabOrderItem {
  id: string;
  appointment_id: string;
  patient_name: string;
  test_name: string;
  priority: string;
  status: string;
  is_abnormal: boolean;
  reports_count: number;
  created_at: string;
}

export default function LabPage() {
  const [orders, setOrders] = useState<LabOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { simpleView } = useAccessibility();

  const fetchLabOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get<LabOrderItem[]>("/hospital-admin/lab");
      setOrders(res || []);
    } catch (err: any) {
      console.error("Failed to load lab orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabOrders();
  }, []);

  const filtered = orders.filter(
    (o) =>
      o.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.test_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-teal-400" />
            Facility Diagnostics & Lab
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pathology and diagnostic orders initiated for patients in this facility.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search test or patient..."
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
          <FlaskConical className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Diagnostic Orders</h3>
          <p className="text-xs text-slate-500 mt-1">
            Lab investigations ordered by doctors will appear here with abnormal flags.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-mono tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Investigation</th>
                  <th className="px-5 py-3.5">Patient</th>
                  <th className="px-5 py-3.5">Priority</th>
                  <th className="px-5 py-3.5">Clinical Flag</th>
                  <th className="px-5 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-white text-sm">{item.test_name}</div>
                      <div className="text-slate-500 text-[11px] font-mono">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-200">{item.patient_name}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.priority === "STAT"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : item.priority === "URGENT"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {item.is_abnormal ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          ABNORMAL VALUE
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">Normal / Pending</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          item.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                        }`}
                      >
                        {item.status}
                      </span>
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
