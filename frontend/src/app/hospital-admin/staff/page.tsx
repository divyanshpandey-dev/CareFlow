"use client";

import React, { useEffect, useState } from "react";
import { Users, UserPlus, Shield, Mail, Phone, Loader2, CheckCircle2, Trash2, Ban, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { useAccessibility } from "@/context/AccessibilityContext";
import ConfirmationModal from "@/components/admin/ConfirmationModal";

interface StaffItem {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function StaffPage() {
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("password123");
  const [role, setRole] = useState("RECEPTIONIST");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffItem | null>(null);
  const { simpleView, speakText } = useAccessibility();

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await api.get<StaffItem[]>("/hospital-admin/staff");
      setStaffList(res || []);
    } catch (err: any) {
      console.error("Failed to load staff:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !phone) return;
    try {
      setSaving(true);
      setMessage(null);
      await api.post("/hospital-admin/staff", {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password: password.trim() || "password123",
        role: role,
      });
      setMessage(`Staff member '${fullName}' registered successfully!`);
      speakText(`Staff member ${fullName} added`);
      setFullName("");
      setEmail("");
      setPhone("");
      setShowModal(false);
      await fetchStaff();
    } catch (err: any) {
      setMessage(err.message || "Failed to register staff.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (staff: StaffItem) => {
    try {
      const action = staff.is_active ? "suspend" : "reactivate";
      await api.put(`/hospital-admin/staff/${staff.id}/${action}`, {});
      setMessage(`Staff member ${staff.full_name} is now ${staff.is_active ? "suspended" : "reactivated"}.`);
      await fetchStaff();
    } catch (err: any) {
      setMessage(err.message || "Failed to update staff status.");
    }
  };

  const handleOpenDeleteModal = (staff: StaffItem) => {
    setStaffToDelete(staff);
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!staffToDelete) return;
    try {
      await api.delete(`/hospital-admin/staff/${staffToDelete.id}`);
      setMessage(`Staff member '${staffToDelete.full_name}' permanently deleted.`);
      setDeleteModalOpen(false);
      setStaffToDelete(null);
      await fetchStaff();
    } catch (err: any) {
      setMessage(err.message || "Failed to delete staff member.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-400" />
            Hospital Support Staff
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage front-desk receptionists, triage coordinators, and laboratory technicians for this facility.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className={`rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all shadow-md flex items-center gap-2 justify-center ${
            simpleView ? "px-6 py-3.5 text-base min-h-[48px]" : "px-4 py-2.5 text-xs min-h-[40px]"
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs text-teal-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        </div>
      ) : staffList.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Support Staff Registered</h3>
          <p className="text-xs text-slate-500 mt-1">
            Click Add Staff Member above to onboard front-desk reception or lab teams.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.map((staff) => (
            <div
              key={staff.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md font-mono ${
                      staff.role === "RECEPTIONIST"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                    }`}
                  >
                    {staff.role}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">
                    {staff.is_active ? "Active" : "Disabled"}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">{staff.full_name}</h3>
                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{staff.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{staff.phone}</span>
                  </div>
                </div>
              </div>
              <div className="pt-3 mt-4 border-t border-slate-800 flex justify-between items-center text-[11px]">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleStatus(staff)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 ${
                      staff.is_active
                        ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                        : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                    }`}
                  >
                    {staff.is_active ? "Suspend" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleOpenDeleteModal(staff)}
                    title="Cut / Delete Permanently"
                    className="p-1 rounded text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/20"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-slate-500">Joined {staff.created_at ? new Date(staff.created_at).toLocaleDateString() : "Recent"}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">Add Hospital Staff</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meera Nair"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Role *</label>
                <select
                  aria-label="Staff Role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                >
                  <option value="RECEPTIONIST">Receptionist / Front Desk</option>
                  <option value="LAB_TECH">Lab Technician / Diagnostics</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="staff@hospital.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Temporary Password</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-md"
                >
                  {saving ? "Saving..." : "Add Staff Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Permanent Staff Deletion */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={executeDelete}
        title={`Permanently Delete Staff Member ${staffToDelete?.full_name}?`}
        description={`Permanently removing (cutting) this staff member (${staffToDelete?.role}) will revoke their account, active sessions, and access to this hospital. This action CANNOT be undone.`}
        requiredPhrase="DELETE"
        confirmButtonText="Permanently Delete Staff"
        isDanger={true}
      />
    </div>
  );
}
