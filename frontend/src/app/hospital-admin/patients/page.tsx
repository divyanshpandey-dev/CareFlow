"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  UserPlus,
  Calendar,
  Phone,
  Mail,
  ShieldCheck,
  ChevronRight,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAccessibility } from "@/context/AccessibilityContext";
import ConfirmationModal from "@/components/admin/ConfirmationModal";

interface PatientItem {
  id: string;
  patient_identifier: string;
  full_name: string;
  email: string;
  phone: string;
  age: number | null;
  date_of_birth: string | null;
  gender: string;
  blood_group: string | null;
  profile_completed: boolean;
  hospital_appointments_count: number;
  last_visit_date: string | null;
}

export default function HospitalPatientsPage() {
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Walk-in Registration Modal
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [walkinName, setWalkinName] = useState("");
  const [walkinPhone, setWalkinPhone] = useState("");
  const [walkinDob, setWalkinDob] = useState("");
  const [walkinGender, setWalkinGender] = useState("MALE");
  const [walkinBlood, setWalkinBlood] = useState("O+");
  const [walkinAddress, setWalkinAddress] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<PatientItem | null>(null);
  const { simpleView } = useAccessibility();

  const fetchPatients = async (query = "") => {
    try {
      setLoading(true);
      const url = query.trim()
        ? `/hospital-admin/patients?q=${encodeURIComponent(query.trim())}`
        : "/hospital-admin/patients";
      const res = await api.get<PatientItem[]>(url);
      setPatients(res || []);
    } catch (err: any) {
      console.error("Failed to load patients:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(searchQuery);
  };

  const handleRegisterWalkin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkinName || !walkinPhone) {
      setErrorMessage("Please enter patient name and contact phone number.");
      return;
    }

    try {
      setRegistering(true);
      setMessage(null);
      setErrorMessage(null);
      const res = await api.post<any>("/hospital-admin/patients/register-walkin", {
        full_name: walkinName.trim(),
        phone: walkinPhone.trim(),
        date_of_birth: walkinDob || undefined,
        gender: walkinGender,
        blood_group: walkinBlood,
        address: walkinAddress.trim() || undefined,
      });

      setMessage(
        `Patient ${res.full_name} registered successfully with CareFlow ID: ${res.patient_identifier}`
      );
      setShowWalkinModal(false);
      // Reset form
      setWalkinName("");
      setWalkinPhone("");
      setWalkinDob("");
      setWalkinAddress("");
      await fetchPatients();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to register walk-in patient.");
    } finally {
      setRegistering(false);
    }
  };

  const handleOpenDeleteModal = (pat: PatientItem) => {
    setPatientToDelete(pat);
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!patientToDelete) return;
    try {
      await api.delete(`/hospital-admin/patients/${patientToDelete.id}`);
      setMessage(`Patient '${patientToDelete.full_name}' has been removed from this facility.`);
      setDeleteModalOpen(false);
      setPatientToDelete(null);
      await fetchPatients();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to remove patient.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-400" />
            Hospital Patient Registry
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Registered patients affiliated with this facility. View clinical journeys, prescriptions, and lab orders.
          </p>
        </div>

        <button
          onClick={() => setShowWalkinModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition"
        >
          <UserPlus className="w-4 h-4" />
          Register Walk-In Patient
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

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative max-w-xl">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by CareFlow ID (CF-PAT-...), patient name, or phone..."
          className="w-full pl-10 pr-24 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-teal-500 transition"
        />
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        <button
          type="submit"
          className="absolute right-1.5 top-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-lg text-xs font-semibold"
        >
          Search
        </button>
      </form>

      {/* Patient Directory */}
      {loading ? (
        <div className="py-20 flex justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        </div>
      ) : patients.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Patients Found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery ? "No matching patients found. Try another search term." : "Register walk-in patients or wait for appointments to link."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((pat) => (
            <div
              key={pat.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-md">
                    {pat.patient_identifier}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      pat.profile_completed
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {pat.profile_completed ? "Verified Profile" : "Profile Pending"}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mt-1">{pat.full_name}</h3>
                <p className="text-xs text-slate-400 mb-3">
                  {pat.age !== null ? `${pat.age} yrs` : "Age not specified"} • {pat.gender} • {pat.blood_group || "Blood Group —"}
                </p>

                <div className="space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{pat.phone}</span>
                  </div>
                  {pat.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{pat.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                    <FileText className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span className="text-slate-300 font-medium">
                      {pat.hospital_appointments_count} visit(s) at this facility
                    </span>
                  </div>
                  {pat.last_visit_date && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Last consultation: {pat.last_visit_date}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 mt-4 border-t border-slate-800 flex items-center gap-2">
                <Link
                  href={`/hospital-admin/patients/${pat.id}`}
                  className="flex-1 inline-flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-semibold transition"
                >
                  <span>View Clinical Journey</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleOpenDeleteModal(pat)}
                  title="Cut / Remove patient records from this facility"
                  className="p-2 rounded-xl text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Walk-in Registration Modal */}
      {showWalkinModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-teal-400" />
                Register Walk-In Patient
              </h2>
              <button
                onClick={() => setShowWalkinModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterWalkin} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={walkinName}
                  onChange={(e) => setWalkinName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={walkinPhone}
                    onChange={(e) => setWalkinPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    max={new Date().toISOString().split("T")[0]}
                    value={walkinDob}
                    onChange={(e) => setWalkinDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Gender</label>
                  <select
                    value={walkinGender}
                    onChange={(e) => setWalkinGender(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Blood Group</label>
                  <select
                    value={walkinBlood}
                    onChange={(e) => setWalkinBlood(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Residential Address</label>
                <input
                  type="text"
                  placeholder="Street, City, PIN code"
                  value={walkinAddress}
                  onChange={(e) => setWalkinAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                />
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                A permanent CareFlow ID (CF-PAT-XXXXXX) will be created immediately. The patient can use this ID across hospital counters and the patient app.
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowWalkinModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-md"
                >
                  {registering ? "Registering..." : "Generate Patient ID"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Permanent Patient Removal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={executeDelete}
        title={`Remove Patient ${patientToDelete?.full_name}?`}
        description={`Removing (cutting) patient ${patientToDelete?.patient_identifier || ""} will unlink all visits and appointments for this patient at this facility.`}
        requiredPhrase="DELETE"
        confirmButtonText="Remove Patient Records"
        isDanger={true}
      />
    </div>
  );
}
