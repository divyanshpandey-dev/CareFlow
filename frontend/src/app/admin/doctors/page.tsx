"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Stethoscope,
  Search,
  CheckCircle2,
  AlertTriangle,
  Ban,
  RotateCcw,
  UserPlus,
  ShieldCheck,
  Building2,
  ExternalLink,
  X,
  FileCheck,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import ConfirmationModal from "@/components/admin/ConfirmationModal";

interface DoctorUser {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  role: string;
  is_active: boolean;
  specialization?: string;
  qualification?: string;
  registration_number?: string;
  hospital_id?: string;
  hospital_name?: string;
  room_number?: string;
  consultation_fee?: number;
}

export default function DoctorVerificationCenter() {
  const [doctors, setDoctors] = useState<DoctorUser[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorUser | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState<DoctorUser | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form states for doctor onboarding
  const [newDocName, setNewDocName] = useState("");
  const [newDocPhone, setNewDocPhone] = useState("");
  const [newDocEmail, setNewDocEmail] = useState("");
  const [newDocSpec, setNewDocSpec] = useState("Cardiology");
  const [newDocQual, setNewDocQual] = useState("MBBS, MD");
  const [newDocReg, setNewDocReg] = useState("NMC-2024-88412");
  const [newDocFee, setNewDocFee] = useState("700");
  const [newDocRoom, setNewDocRoom] = useState("OPD Cabin 104");
  const [newDocHospitalId, setNewDocHospitalId] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, hospRes] = await Promise.all([
        api.get<any[]>("/admin/users"),
        api.get<any[]>("/admin/hospitals").catch(() => []),
      ]);

      if (Array.isArray(usersRes)) {
        const docList = usersRes.filter((u) => u.role === "DOCTOR");
        setDoctors(docList);
      }
      if (Array.isArray(hospRes)) {
        setHospitals(hospRes);
        if (hospRes.length > 0) {
          setNewDocHospitalId(hospRes[0].id);
        }
      }
    } catch (err: any) {
      console.error("Failed to load doctor roster:", err);
      setFeedback({ type: "error", message: err?.message || "Failed to load doctor roster." });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSuspendModal = (doc: DoctorUser) => {
    setSelectedDoctor(doc);
    setConfirmModalOpen(true);
  };

  const executeSuspension = async () => {
    if (!selectedDoctor) return;
    try {
      await api.put(`/admin/doctors/${selectedDoctor.id}/suspend`, {});
      setFeedback({
        type: "success",
        message: `Dr. ${selectedDoctor.full_name} has been suspended from OPD practice.`,
      });
      setConfirmModalOpen(false);
      setSelectedDoctor(null);
      loadData();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to suspend doctor." });
    }
  };

  const handleReactivate = async (doc: DoctorUser) => {
    try {
      await api.put(`/admin/doctors/${doc.id}/reactivate`, {});
      setFeedback({
        type: "success",
        message: `Dr. ${doc.full_name} has been restored to active OPD status.`,
      });
      loadData();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to reactivate doctor." });
    }
  };

  const handleOpenDeleteModal = (doc: DoctorUser) => {
    setDoctorToDelete(doc);
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!doctorToDelete) return;
    try {
      await api.delete(`/admin/doctors/${doctorToDelete.id}`);
      setFeedback({
        type: "success",
        message: `Dr. ${doctorToDelete.full_name} has been permanently deleted from the platform.`,
      });
      setDeleteModalOpen(false);
      setDoctorToDelete(null);
      loadData();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to delete doctor." });
    }
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim() || !newDocPhone.trim()) return;

    try {
      await api.post("/admin/doctors", {
        full_name: newDocName.trim(),
        phone: newDocPhone.trim(),
        email: newDocEmail.trim() || undefined,
        hospital_id: newDocHospitalId || hospitals[0]?.id,
        department_name: newDocSpec,
        specialization: newDocSpec,
        qualification: newDocQual,
        registration_number: newDocReg,
        consultation_fee: parseFloat(newDocFee) || 500.0,
        room_number: newDocRoom,
      });

      setFeedback({
        type: "success",
        message: `Dr. ${newDocName} successfully onboarded and added to OPD Roster!`,
      });
      setShowAddModal(false);
      setNewDocName("");
      setNewDocPhone("");
      setNewDocEmail("");
      loadData();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to onboard doctor." });
    }
  };

  const filtered = doctors.filter((d) => {
    const matchesSearch =
      d.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.specialization?.toLowerCase().includes(search.toLowerCase()) ||
      d.registration_number?.toLowerCase().includes(search.toLowerCase()) ||
      d.phone?.includes(search);

    if (!matchesSearch) return false;
    if (filterStatus === "ACTIVE") return d.is_active;
    if (filterStatus === "SUSPENDED") return !d.is_active;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
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
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white p-1">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              CLINICIAN CREDENTIALING
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Doctor Verification Center
          </h1>
          <p className="text-xs text-slate-400">
            Verify council registration numbers, credentials, consultation fee caps, and enforce clinical practice status.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-950/40 flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Onboard Clinician</span>
        </button>
      </div>

      {/* Verification Notice Banner */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3 text-xs text-slate-300">
        <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          <strong>Profile verification state:</strong> Verification badges indicate that doctor credentials, council registration records, and OPD room assignments have been audited internally against hospital onboarding records.
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
        <div className="flex-1 flex items-center gap-2.5 px-2">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by doctor name, specialization, registration number..."
            className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-3">
          <span className="text-[11px] text-slate-500">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 px-2.5 py-1"
          >
            <option value="ALL">All Practitioners</option>
            <option value="ACTIVE">Active Practice Only</option>
            <option value="SUSPENDED">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Doctor Roster Table */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Doctor / Clinician</th>
                <th className="py-3 px-4">Specialization & Degrees</th>
                <th className="py-3 px-4">Council Registration</th>
                <th className="py-3 px-4">Hospital & Cabin</th>
                <th className="py-3 px-4">Verification State</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    Loading clinician directory...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    No doctor records match query.
                  </td>
                </tr>
              ) : (
                filtered.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                          {doc.full_name?.charAt(0) || "D"}
                        </div>
                        <div>
                          <div className="font-bold text-white">Dr. {doc.full_name}</div>
                          <span className="text-[10px] text-slate-400 font-mono">{doc.phone}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{doc.specialization || "General Medicine"}</div>
                      <div className="text-[10px] text-slate-400">{doc.qualification || "MBBS"}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[10px]">
                        {doc.registration_number || "MCI-STATE-REG"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-slate-300">{doc.hospital_name || "CityCare OPD"}</div>
                      <div className="text-[10px] text-slate-400">{doc.room_number || "OPD Cabin 1"}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      {doc.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> VERIFIED & ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          <Ban className="w-3 h-3" /> PRACTICE SUSPENDED
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href="/doctor/cockpit"
                          target="_blank"
                          title="Open Doctor Cockpit"
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>

                        {doc.is_active ? (
                          <button
                            onClick={() => handleOpenSuspendModal(doc)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(doc)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reactivate</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenDeleteModal(doc)}
                          title="Permanently remove / cut doctor"
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

      {/* Confirmation Modal for Doctor Suspension */}
      <ConfirmationModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={executeSuspension}
        title={`Suspend Dr. ${selectedDoctor?.full_name}?`}
        description="Suspending this clinician will immediately close their active OPD queue and prevent any new patient appointment bookings."
        requiredPhrase="SUSPEND"
        confirmButtonText="Confirm Suspension"
        isDanger={true}
      />

      {/* Confirmation Modal for Permanent Doctor Deletion */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={executeDelete}
        title={`Permanently Delete Dr. ${doctorToDelete?.full_name}?`}
        description="Permanently removing (cutting) this clinician will delete their doctor credentials, roster, assigned consultation room, and appointments. This action CANNOT be undone."
        requiredPhrase="DELETE"
        confirmButtonText="Permanently Delete Doctor"
        isDanger={true}
      />

      {/* Modal: Onboard New Doctor */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">Onboard Verified Clinician</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDoctor} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assigned Medical Facility *
                </label>
                <select
                  value={newDocHospitalId}
                  onChange={(e) => setNewDocHospitalId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name (with Dr. prefix) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Rajesh Kulkarni"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91..."
                    value={newDocPhone}
                    onChange={(e) => setNewDocPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="doctor@hospital.com"
                    value={newDocEmail}
                    onChange={(e) => setNewDocEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Specialization</label>
                  <select
                    value={newDocSpec}
                    onChange={(e) => setNewDocSpec(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="General Medicine">General Medicine</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Neurology">Neurology</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Council Reg Number *</label>
                  <input
                    type="text"
                    required
                    value={newDocReg}
                    onChange={(e) => setNewDocReg(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Consultation Fee (₹)</label>
                  <input
                    type="number"
                    value={newDocFee}
                    onChange={(e) => setNewDocFee(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">OPD Room</label>
                  <input
                    type="text"
                    value={newDocRoom}
                    onChange={(e) => setNewDocRoom(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                  />
                </div>
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
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Register Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
