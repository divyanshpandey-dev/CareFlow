"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
} from "lucide-react";
import { api } from "@/lib/api";
import ConfirmationModal from "@/components/admin/ConfirmationModal";

interface AdminDetail {
  id: string;
  admin_display_id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  hospital_id: string;
  hospital_name: string;
  hospital_city: string;
  hospital_state: string;
  department_name?: string;
  status: string;
  notes?: string;
  assigned_by_name: string;
  assigned_at: string;
  revoked_at?: string;
  revocation_reason?: string;
}

export default function AdminDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [admin, setAdmin] = useState<AdminDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get<AdminDetail>(`/admin/hospital-admins/${id}`);
      setAdmin(res);
    } catch (err: any) {
      console.error("Failed to load admin detail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  const handleStatusChange = async () => {
    if (!confirmStatus || !admin) return;
    try {
      await api.put(`/admin/hospital-admins/${admin.id}/status`, {
        status: confirmStatus,
        reason: reason.trim() || `Administrative transition to ${confirmStatus}`,
      });
      setToastMessage(`Status updated to ${confirmStatus}`);
      setConfirmStatus(null);
      setReason("");
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || "Failed to update status.");
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-4">
        <h2 className="text-lg font-bold text-white">Hospital Admin Not Found</h2>
        <Link
          href="/admin/admins"
          className="text-teal-400 hover:text-teal-300 text-xs font-semibold"
        >
          Return to Admin Registry
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back button */}
      <div>
        <Link
          href="/admin/admins"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Hospital Admin Registry</span>
        </Link>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs text-teal-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center font-bold text-teal-400 text-2xl">
            {admin.full_name ? admin.full_name.charAt(0) : "A"}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white tracking-tight">{admin.full_name}</h1>
              <span className="font-mono text-xs font-bold text-teal-400 px-2.5 py-0.5 rounded bg-teal-500/10 border border-teal-500/30">
                {admin.admin_display_id}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  admin.status === "ACTIVE"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : admin.status === "SUSPENDED"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                }`}
              >
                {admin.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-teal-400" />
              {admin.hospital_name} • {admin.hospital_city}, {admin.hospital_state}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {admin.status === "ACTIVE" ? (
            <button
              onClick={() => setConfirmStatus("SUSPENDED")}
              className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold"
            >
              Suspend Admin
            </button>
          ) : (
            <button
              onClick={() => setConfirmStatus("ACTIVE")}
              className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold"
            >
              Reactivate Admin
            </button>
          )}
          {admin.status !== "REVOKED" && (
            <button
              onClick={() => setConfirmStatus("REVOKED")}
              className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold"
            >
              Revoke Access
            </button>
          )}
        </div>
      </div>

      {/* Grid of Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact & Assignment info */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">
            Account & Contact
          </h2>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 block mb-0.5">Email Address</span>
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                {admin.email}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 block mb-0.5">Phone Number</span>
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                {admin.phone}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 block mb-0.5">Designated By</span>
              <span className="font-semibold text-white">{admin.assigned_by_name}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 block mb-0.5">Assigned Date</span>
              <span className="font-semibold text-white">
                {admin.assigned_at ? new Date(admin.assigned_at).toLocaleString() : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Assigned Facility Perimeter */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">
            Assigned Facility Perimeter
          </h2>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 block mb-0.5">Facility Name</span>
              <span className="font-semibold text-white">{admin.hospital_name}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 block mb-0.5">Facility Location</span>
              <span className="font-semibold text-white">
                {admin.hospital_city}, {admin.hospital_state}
              </span>
            </div>
            {admin.notes && (
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block mb-0.5">Super Admin Notes</span>
                <span className="text-slate-300 leading-relaxed">{admin.notes}</span>
              </div>
            )}
            {admin.revoked_at && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <span className="text-rose-400 font-bold block mb-0.5">Revocation Record</span>
                <span className="text-slate-300">
                  {new Date(admin.revoked_at).toLocaleString()} - Reason: {admin.revocation_reason || "None given"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmStatus && (
        <ConfirmationModal
          isOpen={Boolean(confirmStatus)}
          onClose={() => setConfirmStatus(null)}
          onConfirm={handleStatusChange}
          title={`Confirm Administrative Action: ${confirmStatus}`}
          description={`Are you sure you want to change the status of ${admin.full_name} (${admin.admin_display_id}) to ${confirmStatus}?`}
          confirmButtonText={`Confirm ${confirmStatus}`}
          isDanger={confirmStatus !== "ACTIVE"}
        />
      )}
    </div>
  );
}
