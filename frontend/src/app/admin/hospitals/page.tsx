"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Ban,
  RotateCcw,
  ExternalLink,
  MapPin,
  X,
  History,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import ConfirmationModal from "@/components/admin/ConfirmationModal";

interface Hospital {
  id: string;
  name: string;
  city: string;
  state: string;
  address?: string;
  departments: Array<{ id: string; name: string }>;
  doctors_count: number;
  is_active: boolean;
  is_verified?: boolean;
}

export default function HospitalManagementPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [hospitalToDelete, setHospitalToDelete] = useState<Hospital | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // New hospital form state
  const [newHospName, setNewHospName] = useState("");
  const [newHospCity, setNewHospCity] = useState("Mumbai");
  const [newHospState, setNewHospState] = useState("Maharashtra");
  const [newHospAddress, setNewHospAddress] = useState("");
  const [newHospDepts, setNewHospDepts] = useState("Cardiology OPD, General Medicine, Neurology");
  const [newHospNabh, setNewHospNabh] = useState(true);

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    setLoading(true);
    try {
      const res = await api.get<Hospital[]>("/admin/hospitals");
      if (Array.isArray(res)) {
        setHospitals(res);
      }
    } catch (err: any) {
      console.error("Failed to load hospitals:", err);
      setFeedback({ type: "error", message: err?.message || "Failed to load hospitals." });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSuspendModal = (hosp: Hospital) => {
    setSelectedHospital(hosp);
    setConfirmModalOpen(true);
  };

  const executeSuspension = async () => {
    if (!selectedHospital) return;
    try {
      await api.put(`/admin/hospitals/${selectedHospital.id}/suspend`, {});
      setFeedback({
        type: "success",
        message: `Hospital "${selectedHospital.name}" has been suspended from the CareFlow network.`,
      });
      setConfirmModalOpen(false);
      setSelectedHospital(null);
      fetchHospitals();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to suspend hospital." });
    }
  };

  const handleReactivate = async (hosp: Hospital) => {
    try {
      await api.put(`/admin/hospitals/${hosp.id}/reactivate`, {});
      setFeedback({
        type: "success",
        message: `Hospital "${hosp.name}" has been restored to active status.`,
      });
      fetchHospitals();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to reactivate hospital." });
    }
  };

  const handleOpenDeleteModal = (hosp: Hospital) => {
    setHospitalToDelete(hosp);
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!hospitalToDelete) return;
    try {
      await api.delete(`/admin/hospitals/${hospitalToDelete.id}`);
      setFeedback({
        type: "success",
        message: `Hospital "${hospitalToDelete.name}" has been permanently deleted from the CareFlow network.`,
      });
      setDeleteModalOpen(false);
      setHospitalToDelete(null);
      fetchHospitals();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to delete hospital." });
    }
  };

  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHospName.trim() || !newHospCity.trim()) return;

    try {
      const depts = newHospDepts.split(",").map((d) => d.trim()).filter(Boolean);
      await api.post("/admin/hospitals", {
        name: newHospName.trim(),
        city: newHospCity.trim(),
        state: newHospState.trim(),
        address: newHospAddress.trim() || `${newHospName}, ${newHospCity}`,
        departments: depts,
        is_nabh: newHospNabh,
      });

      setFeedback({
        type: "success",
        message: `Hospital "${newHospName}" successfully onboarded into CareFlow!`,
      });
      setShowAddModal(false);
      setNewHospName("");
      setNewHospAddress("");
      fetchHospitals();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to onboard hospital." });
    }
  };

  const filtered = hospitals.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.city.toLowerCase().includes(search.toLowerCase()) ||
      h.state.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              FACILITY GOVERNANCE
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Hospital Management Network
          </h1>
          <p className="text-xs text-slate-400">
            Audit registered medical facilities, OPD departments, and enforce network suspension policies.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Hospital</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter hospitals by facility name, city, or state..."
          className="w-full bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-xs text-slate-500 hover:text-slate-300">
            Clear
          </button>
        )}
      </div>

      {/* Hospitals Table */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Hospital Facility</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Departments</th>
                <th className="py-3 px-4">Doctors</th>
                <th className="py-3 px-4">Network Status</th>
                <th className="py-3 px-4 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    Loading registered hospitals from CareFlow database...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    No hospitals found matching &ldquo;{search}&rdquo;.
                  </td>
                </tr>
              ) : (
                filtered.map((hosp) => (
                  <tr key={hosp.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">{hosp.name}</span>
                            {hosp.is_verified && (
                              <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/30">
                                NABH
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{hosp.id}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-slate-300">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{hosp.city}, {hosp.state}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {hosp.departments?.map((d: any, idx: number) => (
                          <span
                            key={idx}
                            className="bg-slate-800/80 border border-slate-700/80 text-slate-300 text-[10px] px-1.5 py-0.5 rounded"
                          >
                            {typeof d === "string" ? d : d.name}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                      {hosp.doctors_count ?? 3}
                    </td>

                    <td className="py-3.5 px-4">
                      {hosp.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          <Ban className="w-3 h-3" /> SUSPENDED
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href="/hospital/operations"
                          target="_blank"
                          title="Open Hospital Ops View"
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/admin/audit?q=${encodeURIComponent(hosp.name)}`}
                          title="View Audit Logs"
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                          <History className="w-3.5 h-3.5" />
                        </Link>

                        {hosp.is_active ? (
                          <button
                            onClick={() => handleOpenSuspendModal(hosp)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(hosp)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reactivate</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenDeleteModal(hosp)}
                          title="Permanently remove / cut hospital"
                          className="p-1 rounded-lg text-rose-400 hover:text-white hover:bg-rose-600/30 border border-rose-500/30 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Suspension */}
      <ConfirmationModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={executeSuspension}
        title={`Suspend ${selectedHospital?.name || "Hospital"}?`}
        description="Suspending this hospital will temporarily pause patient appointment booking and doctor roster access for this facility until reactivated."
        requiredPhrase="SUSPEND"
        confirmButtonText="Confirm Suspension"
        isDanger={true}
      />

      {/* Confirmation Modal for Permanent Hospital Deletion */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={executeDelete}
        title={`Permanently Delete ${hospitalToDelete?.name || "Hospital"}?`}
        description="Permanently removing (cutting) this hospital will delete all associated departments, doctor listings, assignments, and OPD records for this facility. This action CANNOT be undone."
        requiredPhrase="DELETE"
        confirmButtonText="Permanently Delete Hospital"
        isDanger={true}
      />

      {/* Modal: Onboard New Hospital */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Onboard New Medical Facility</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHospital} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Facility Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AIIMS Trauma Center"
                  value={newHospName}
                  onChange={(e) => setNewHospName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={newHospCity}
                    onChange={(e) => setNewHospCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={newHospState}
                    onChange={(e) => setNewHospState(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  OPD Departments (comma-separated)
                </label>
                <input
                  type="text"
                  value={newHospDepts}
                  onChange={(e) => setNewHospDepts(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="nabh-check"
                  checked={newHospNabh}
                  onChange={(e) => setNewHospNabh(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                />
                <label htmlFor="nabh-check" className="text-xs text-slate-300 font-medium">
                  NABH Accredited & ABDM Health Facility Registry (HFR) Ready
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Onboard Hospital
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
