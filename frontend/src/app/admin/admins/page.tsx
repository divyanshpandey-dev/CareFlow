"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  Filter,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import ConfirmationModal from "@/components/admin/ConfirmationModal";

interface HospitalAdminItem {
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
  role: string;
  status: string; // ACTIVE, SUSPENDED, REVOKED
  assigned_by_name: string;
  assigned_at: string;
  created_at: string;
}

interface HospitalOption {
  id: string;
  name: string;
  city: string;
}

export default function AdminRegistryPage() {
  const [admins, setAdmins] = useState<HospitalAdminItem[]>([]);
  const [hospitals, setHospitals] = useState<HospitalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [selectedHospId, setSelectedHospId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("Password123!");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Status modal
  const [statusTarget, setStatusTarget] = useState<HospitalAdminItem | null>(null);
  const [nextStatus, setNextStatus] = useState<string>("SUSPENDED");

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<HospitalAdminItem | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [adminRes, hospRes] = await Promise.all([
        api.get<HospitalAdminItem[]>("/admin/hospital-admins"),
        api.get<HospitalOption[]>("/admin/hospitals"),
      ]);
      setAdmins(adminRes || []);
      setHospitals(hospRes || []);
      if (hospRes && hospRes.length > 0) {
        setSelectedHospId(hospRes[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load admin registry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHospId || !fullName || !email || !phone) return;
    try {
      setCreating(true);
      setToastMessage(null);
      const res = await api.post<any>("/admin/hospital-admins", {
        hospital_id: selectedHospId,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password: password.trim() || "Password123!",
        notes: notes.trim() || undefined,
      });
      setToastMessage(`Hospital Admin '${res.admin_display_id}' assigned successfully!`);
      setShowCreateModal(false);
      setFullName("");
      setEmail("");
      setPhone("");
      setNotes("");
      await loadData();
    } catch (err: any) {
      setToastMessage(err.message || "Failed to create hospital admin.");
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!statusTarget) return;
    try {
      await api.put(`/admin/hospital-admins/${statusTarget.id}/status`, {
        status: nextStatus,
        reason: `Super Admin status transition to ${nextStatus}`,
      });
      setToastMessage(
        `Hospital Admin ${statusTarget.admin_display_id} is now ${nextStatus}`
      );
      setStatusTarget(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update status.");
    }
  };

  const handleOpenDeleteModal = (adm: HospitalAdminItem) => {
    setAdminToDelete(adm);
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!adminToDelete) return;
    try {
      await api.delete(`/admin/hospital-admins/${adminToDelete.id}`);
      setToastMessage(`Hospital Admin "${adminToDelete.admin_display_id}" has been permanently removed.`);
      setDeleteModalOpen(false);
      setAdminToDelete(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete hospital admin.");
    }
  };

  const filteredAdmins = admins.filter((a) => {
    const matchesSearch =
      a.full_name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.hospital_name.toLowerCase().includes(search.toLowerCase()) ||
      a.admin_display_id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 font-mono text-[10px] font-bold uppercase tracking-wider">
              Platform Governance
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 mt-1">
            <Users className="w-6 h-6 text-teal-400" />
            Hospital Admin Registry
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global directory of designated Hospital Administrators bound strictly to single health facilities.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/20 flex items-center gap-2 self-start sm:self-auto transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Assign Hospital Admin</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs text-teal-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, ID, email, or hospital..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <select
            aria-label="Filter Admins by Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 outline-none focus:border-teal-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="REVOKED">REVOKED</option>
          </select>
          {(search || statusFilter) && (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("");
              }}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-24 flex justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        </div>
      ) : filteredAdmins.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Hospital Admins Found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Click Assign Hospital Admin above to create a ground-level facility administrator.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-mono tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Admin ID & Name</th>
                  <th className="px-5 py-3.5">Assigned Facility</th>
                  <th className="px-5 py-3.5">Contact</th>
                  <th className="px-5 py-3.5">Assigned By</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredAdmins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/admins/${adm.id}`}
                        className="group flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center font-bold text-teal-400 text-xs">
                          {adm.full_name ? adm.full_name.charAt(0) : "A"}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm group-hover:text-teal-400 transition-colors">
                            {adm.full_name}
                          </div>
                          <div className="font-mono text-[11px] text-teal-300">
                            {adm.admin_display_id}
                          </div>
                        </div>
                      </Link>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-200 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        {adm.hospital_name}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        {adm.hospital_city}, {adm.hospital_state}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Mail className="w-3 h-3 text-slate-500" />
                        {adm.email}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {adm.phone}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-400">
                      <div>{adm.assigned_by_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {adm.assigned_at ? new Date(adm.assigned_at).toLocaleDateString() : ""}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          adm.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : adm.status === "SUSPENDED"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {adm.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/admins/${adm.id}`}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                        >
                          View
                        </Link>
                        {adm.status === "ACTIVE" ? (
                          <button
                            onClick={() => {
                              setStatusTarget(adm);
                              setNextStatus("SUSPENDED");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setStatusTarget(adm);
                              setNextStatus("ACTIVE");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold"
                          >
                            Reactivate
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenDeleteModal(adm)}
                          title="Permanently remove / cut hospital admin"
                          className="p-1 rounded-lg text-rose-400 hover:text-white hover:bg-rose-600/30 border border-rose-500/30 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-teal-400" />
              Assign Hospital Administrator
            </h2>
            <p className="text-xs text-slate-400">
              This account will receive ground-level operational control strictly restricted to the selected hospital.
            </p>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Target Hospital Facility *</label>
                <select
                  aria-label="Target Hospital"
                  value={selectedHospId}
                  onChange={(e) => setSelectedHospId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Menon"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@hospital.org"
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
                    placeholder="+91 98111 22233"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Initial Password</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Assignment Notes</label>
                <textarea
                  rows={2}
                  placeholder="Operations lead for Phase 1 rollout..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-md"
                >
                  {creating ? "Assigning..." : "Assign Hospital Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {statusTarget && (
        <ConfirmationModal
          isOpen={Boolean(statusTarget)}
          onClose={() => setStatusTarget(null)}
          onConfirm={handleConfirmStatusChange}
          title={`Confirm Status Transition: ${nextStatus}`}
          description={`Are you sure you want to transition Hospital Admin ${statusTarget.admin_display_id} (${statusTarget.full_name}) at ${statusTarget.hospital_name} to ${nextStatus}?`}
          confirmButtonText={`Confirm ${nextStatus}`}
          isDanger={nextStatus !== "ACTIVE"}
        />
      )}

      {/* Confirmation Modal for Permanent Hospital Admin Deletion */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={executeDelete}
        title={`Permanently Delete Hospital Admin ${adminToDelete?.admin_display_id}?`}
        description={`Permanently removing (cutting) this administrator (${adminToDelete?.full_name}) will revoke all operational control over ${adminToDelete?.hospital_name} and delete their platform admin account. This action CANNOT be undone.`}
        requiredPhrase="DELETE"
        confirmButtonText="Permanently Delete Admin"
        isDanger={true}
      />
    </div>
  );
}
