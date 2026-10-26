"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Activity, AlertTriangle, Building2, Loader2, ShieldAlert } from "lucide-react";

export interface HospitalAdminScope {
  hospital: {
    id: string;
    name: string;
    slug: string;
    hfr_id?: string;
    city: string;
    state: string;
    address: string;
    is_verified: boolean;
    is_active: boolean;
    qr_checkin_token: string;
  };
  admin: {
    id: string;
    admin_display_id: string;
    full_name: string;
    email: string;
    phone: string;
    status: string;
    assigned_at: string;
  };
  metrics: {
    departments_count: number;
    total_doctors: number;
    active_doctors: number;
    todays_appointments: number;
    waiting_in_queue: number;
    in_consultation: number;
    completed_today: number;
    total_lab_orders: number;
  };
  emergency_status: string;
}

interface HospitalAdminContextValue {
  scope: HospitalAdminScope | null;
  loading: boolean;
  refreshScope: () => Promise<void>;
}

const HospitalAdminScopeContext = createContext<HospitalAdminContextValue>({
  scope: null,
  loading: true,
  refreshScope: async () => {},
});

export const useHospitalAdminScope = () => useContext(HospitalAdminScopeContext);

export const HospitalAdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [scope, setScope] = useState<HospitalAdminScope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScope = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<HospitalAdminScope>("/hospital-admin/scope");
      setScope(res);
    } catch (err: any) {
      console.error("Hospital Admin guard access denied:", err);
      if (err.status === 401 || err.status === 403) {
        setError(
          err.data?.detail || "Access restricted. You must be an authorized Hospital Administrator to view this console."
        );
        setTimeout(() => {
          router.replace("/login");
        }, 1800);
      } else {
        setError(err.message || "Failed to load facility scope.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScope();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-10 h-10 animate-spin text-teal-400 mb-4" />
        <h2 className="text-lg font-semibold tracking-wide">Validating Hospital Admin Privileges...</h2>
        <p className="text-xs text-slate-500 mt-1">Enforcing ground-level facility isolation</p>
      </div>
    );
  }

  if (error || !scope) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-rose-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Access Forbidden</h1>
        <p className="text-sm text-slate-400 max-w-md mb-6">{error || "Unauthorized role or invalid session."}</p>
        <button
          onClick={() => router.replace("/login")}
          className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-sm transition-colors"
        >
          Return to Unified Login
        </button>
      </div>
    );
  }

  return (
    <HospitalAdminScopeContext.Provider value={{ scope, loading, refreshScope: fetchScope }}>
      {children}
    </HospitalAdminScopeContext.Provider>
  );
};
