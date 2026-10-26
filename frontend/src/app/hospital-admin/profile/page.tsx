"use client";

import React, { useEffect, useState } from "react";
import { UserCheck, Building2, Shield, Mail, Phone, MapPin, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface AdminProfileData {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  admin_display_id: string;
  status: string;
  hospital_id: string;
  hospital_name: string;
  hospital_city: string;
  hospital_state: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<AdminProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProf = async () => {
      try {
        setLoading(true);
        const res = await api.get<AdminProfileData>("/hospital-admin/profile");
        setProfile(res);
      } catch (err: any) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProf();
  }, []);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-teal-400" />
          Hospital Administrator Profile
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Operational credential details and assigned facility binding.
        </p>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        </div>
      ) : !profile ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          Profile information unavailable.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Identity Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold text-xl">
                {profile.full_name ? profile.full_name.charAt(0) : "A"}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{profile.full_name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs font-bold text-teal-400 px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/30">
                    {profile.admin_display_id}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                    {profile.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block mb-1">Email Address</span>
                <span className="font-medium text-white flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  {profile.email}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block mb-1">Phone Number</span>
                <span className="font-medium text-white flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  {profile.phone}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block mb-1">Assigned Facility</span>
                <span className="font-medium text-white flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  {profile.hospital_name}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block mb-1">Location</span>
                <span className="font-medium text-white flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {profile.hospital_city}, {profile.hospital_state}
                </span>
              </div>
            </div>
          </div>

          {/* Scope Perimeter Notice */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-xs text-slate-400 space-y-2">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-teal-400" />
              Administrative Delegation Rule
            </h3>
            <p className="leading-relaxed">
              Hospital Administrator accounts are assigned directly by the Super Admin to oversee operations at a single facility. Administrative profile transfers, status revocations, and allowlist configurations must be authorized at the platform governance level.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
