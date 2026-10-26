"use client";

import React, { useEffect, useState } from "react";
import {
  Stethoscope,
  DoorOpen,
  Award,
  Clock,
  Loader2,
  CheckCircle2,
  IndianRupee,
  Plus,
  ShieldAlert,
  UserCheck,
  UserX,
  X,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAccessibility } from "@/context/AccessibilityContext";
import ConfirmationModal from "@/components/admin/ConfirmationModal";

interface DoctorItem {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  department_name: string;
  specialization: string;
  qualification: string;
  license_number?: string;
  room_number: string;
  consultation_fee: number;
  experience_years: number;
  listing_status?: string;
  is_verified: boolean;
  schedules_count: number;
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Room Modal State
  const [selectedDoc, setSelectedDoc] = useState<DoctorItem | null>(null);
  const [roomNumber, setRoomNumber] = useState("");
  const [consultFee, setConsultFee] = useState<number>(500);
  const [saving, setSaving] = useState(false);

  // Add Doctor Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingDoc, setAddingDoc] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocEmail, setNewDocEmail] = useState("");
  const [newDocPhone, setNewDocPhone] = useState("");
  const [newDocSpecialization, setNewDocSpecialization] = useState("General Medicine");
  const [newDocQualification, setNewDocQualification] = useState("MBBS, MD");
  const [newDocLicense, setNewDocLicense] = useState("");
  const [newDocRoom, setNewDocRoom] = useState("Room 101");
  const [newDocFee, setNewDocFee] = useState(500);
  const [newDocExp, setNewDocExp] = useState(5);
  const [newDocStatus, setNewDocStatus] = useState("APPROVED");

  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState<DoctorItem | null>(null);
  const { simpleView, speakText } = useAccessibility();

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const res = await api.get<DoctorItem[]>("/hospital-admin/doctors");
      setDoctors(res || []);
    } catch (err: any) {
      console.error("Failed to load doctors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const openEditModal = (doc: DoctorItem) => {
    setSelectedDoc(doc);
    setRoomNumber(doc.room_number || "Room 101");
    setConsultFee(doc.consultation_fee || 500);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !roomNumber) return;
    try {
      setSaving(true);
      setMessage(null);
      setErrorMessage(null);
      await api.put(`/hospital-admin/doctors/${selectedDoc.id}/room`, {
        room_number: roomNumber.trim(),
        consultation_fee: Number(consultFee),
      });
      setMessage(`Room updated to '${roomNumber}' for ${selectedDoc.full_name}`);
      speakText(`Room updated to ${roomNumber}`);
      setSelectedDoc(null);
      await fetchDoctors();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update doctor room.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName || !newDocEmail || !newDocPhone || !newDocLicense) {
      setErrorMessage("Please fill in all required doctor credentials.");
      return;
    }

    try {
      setAddingDoc(true);
      setMessage(null);
      setErrorMessage(null);
      await api.post("/hospital-admin/doctors", {
        full_name: newDocName.trim(),
        email: newDocEmail.trim(),
        phone: newDocPhone.trim(),
        password: "DoctorPass@123",
        specialization: newDocSpecialization.trim(),
        qualification: newDocQualification.trim(),
        license_number: newDocLicense.trim(),
        room_number: newDocRoom.trim(),
        consultation_fee: Number(newDocFee),
        experience_years: Number(newDocExp),
        listing_status: newDocStatus,
      });

      setMessage(`Dr. ${newDocName} onboarded and linked to hospital schedules.`);
      setShowAddModal(false);
      // Reset form
      setNewDocName("");
      setNewDocEmail("");
      setNewDocPhone("");
      setNewDocLicense("");
      await fetchDoctors();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to onboard doctor.");
    } finally {
      setAddingDoc(false);
    }
  };

  const handleStatusToggle = async (doc: DoctorItem, nextStatus: string) => {
    try {
      setMessage(null);
      setErrorMessage(null);
      await api.put(`/hospital-admin/doctors/${doc.id}/status`, {
        listing_status: nextStatus,
      });
      setMessage(`Status updated to '${nextStatus}' for ${doc.full_name}`);
      await fetchDoctors();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update status.");
    }
  };

  const handleOpenDeleteModal = (doc: DoctorItem) => {
    setDoctorToDelete(doc);
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!doctorToDelete) return;
    try {
      await api.delete(`/hospital-admin/doctors/${doctorToDelete.id}`);
      setMessage(`Dr. ${doctorToDelete.full_name} has been permanently removed from this hospital.`);
      setDeleteModalOpen(false);
      setDoctorToDelete(null);
      await fetchDoctors();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to remove doctor.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-400" />
            Hospital Doctor Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Assigned clinicians practicing at this hospital. Manage listing status, room allocations, and schedules.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          Add Doctor to Hospital
        </button>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs text-teal-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        </div>
      ) : doctors.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Stethoscope className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Doctors Attached</h3>
          <p className="text-xs text-slate-500 mt-1">
            Click "Add Doctor to Hospital" above to onboard your medical staff.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((doc) => {
            const status = doc.listing_status || "APPROVED";
            return (
              <div
                key={doc.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20">
                      {doc.department_name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
                          status === "APPROVED"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : status === "SUSPENDED"
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1">{doc.full_name}</h3>
                  <p className="text-xs text-teal-300 font-medium mb-3">{doc.specialization}</p>

                  <div className="space-y-1.5 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>
                        {doc.qualification} • {doc.experience_years} yrs exp
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DoorOpen className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span className="font-semibold text-white">{doc.room_number || "Room Unassigned"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>₹{doc.consultation_fee} Consultation Fee</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{doc.schedules_count} Active OPD time blocks</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-4 border-t border-slate-800 flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center gap-1">
                    {status === "APPROVED" ? (
                      <button
                        onClick={() => handleStatusToggle(doc, "SUSPENDED")}
                        title="Suspend OPD booking"
                        className="text-[11px] text-rose-400 hover:text-rose-300 font-medium px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusToggle(doc, "APPROVED")}
                        title="Approve doctor for patient booking"
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenDeleteModal(doc)}
                      title="Cut / Remove doctor permanently"
                      className="text-[11px] text-rose-400 hover:text-white font-medium p-1 rounded bg-rose-500/10 hover:bg-rose-600/30 border border-rose-500/20"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => openEditModal(doc)}
                    className={`rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold transition-colors ${
                      simpleView ? "px-4 py-2.5 text-sm" : "px-3 py-1.5 text-xs"
                    }`}
                  >
                    Assign Room
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Doctor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-teal-400" />
                Onboard Doctor to Facility
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDoctor} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Doctor Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Arvind Swaminathan"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="doctor@hospital.org"
                    value={newDocEmail}
                    onChange={(e) => setNewDocEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 00000"
                    value={newDocPhone}
                    onChange={(e) => setNewDocPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Specialization *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cardiology"
                    value={newDocSpecialization}
                    onChange={(e) => setNewDocSpecialization(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Medical Qualification *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MBBS, MD, DM"
                    value={newDocQualification}
                    onChange={(e) => setNewDocQualification(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Registration / License Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MCI-CAR-8492"
                    value={newDocLicense}
                    onChange={(e) => setNewDocLicense(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Assigned Room / Cabin</label>
                  <input
                    type="text"
                    value={newDocRoom}
                    onChange={(e) => setNewDocRoom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Fee (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={newDocFee}
                    onChange={(e) => setNewDocFee(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Exp (Years)</label>
                  <input
                    type="number"
                    min={0}
                    value={newDocExp}
                    onChange={(e) => setNewDocExp(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Listing Status</label>
                  <select
                    value={newDocStatus}
                    onChange={(e) => setNewDocStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                  >
                    <option value="APPROVED">APPROVED</option>
                    <option value="PENDING_REVIEW">PENDING</option>
                    <option value="DRAFT">DRAFT</option>
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                Default weekday OPD schedule slots (Mon-Fri 09:00 - 17:00, 15-min intervals) will be automatically generated upon creation.
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingDoc}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-md"
                >
                  {addingDoc ? "Creating Doctor..." : "Confirm & Onboard"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Room Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">Assign OPD Consultation Room</h2>
            <p className="text-xs text-slate-400">Updating facility room allocation for {selectedDoc.full_name}</p>
            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Room Number / Cabin *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Room 204 (OPD Block B)"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Consultation Fee (INR)</label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={consultFee}
                  onChange={(e) => setConsultFee(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-md"
                >
                  {saving ? "Saving..." : "Save Allocation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Permanent Doctor Removal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={executeDelete}
        title={`Permanently Remove Dr. ${doctorToDelete?.full_name}?`}
        description={`Permanently removing (cutting) this doctor from this hospital will delete their OPD schedule blocks, room assignments, and facility linkage. This action CANNOT be undone.`}
        requiredPhrase="DELETE"
        confirmButtonText="Permanently Delete Doctor"
        isDanger={true}
      />
    </div>
  );
}
