"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, Lock, Smartphone, Globe, Key, Clock, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface SessionItem {
  id: string;
  ip_address: string;
  user_agent: string;
  last_active: string;
  created_at: string;
}

interface SecurityData {
  admin_user_id: string;
  role: string;
  assigned_hospital_name: string;
  active_sessions: SessionItem[];
}

export default function SecurityPage() {
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSec = async () => {
      try {
        setLoading(true);
        const res = await api.get<SecurityData>("/hospital-admin/security");
        setData(res);
      } catch (err: any) {
        console.error("Failed to load security info:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSec();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-teal-400" />
          Facility Security & Active Sessions
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review authenticated browser sessions and ground isolation boundaries for this facility.
        </p>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        </div>
      ) : !data ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          Security data unavailable.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Security Perimeter Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-teal-400" />
              Operational Security Perimeter
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs mt-3">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block mb-1">Operational Role</span>
                <span className="font-mono font-bold text-teal-400 text-sm">{data.role}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block mb-1">Assigned Facility</span>
                <span className="font-semibold text-white text-sm">{data.assigned_hospital_name}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block mb-1">Privilege Boundary</span>
                <span className="font-semibold text-emerald-400 text-sm">Ground-Level Isolated</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4 leading-relaxed">
              Hospital Administrator sessions cannot modify platform configuration, environment secrets, allowlists, or cross-facility entities. Privileged global mutations require Super Admin authentication.
            </p>
          </div>

          {/* Active Sessions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-teal-400" />
              Active Login Sessions ({data.active_sessions.length})
            </h2>

            {data.active_sessions.length === 0 ? (
              <p className="text-xs text-slate-500">Current session active.</p>
            ) : (
              <div className="space-y-3">
                {data.active_sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-teal-400" />
                        <span>IP: {sess.ip_address}</span>
                      </div>
                      <div className="text-slate-500 text-[11px] truncate max-w-md">
                        {sess.user_agent}
                      </div>
                    </div>
                    <div className="text-right text-slate-400">
                      <div className="text-emerald-400 font-semibold text-[11px]">ACTIVE NOW</div>
                      <div className="text-[10px] text-slate-500">
                        {sess.created_at ? new Date(sess.created_at).toLocaleString() : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
