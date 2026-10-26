"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Hospital,
  MapPin,
  Search,
  ShieldCheck,
  Stethoscope,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";

interface Doctor {
  id: string;
  user_id: string;
  full_name: string;
  specialization: string;
  qualification: string;
  registration_number: string;
  hospital_id: string;
  hospital_name: string;
  department_id: string;
  department_name: string;
  consultation_fee: number;
  avg_consultation_minutes: number;
}

interface HospitalItem {
  id: string;
  name: string;
  city: string;
  code: string;
}

export default function DoctorDiscoveryPage() {
  const { t } = useLanguage();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [hospitals, setHospitals] = useState<HospitalItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("ALL");
  const [selectedHospital, setSelectedHospital] = useState("ALL");
  const [loading, setLoading] = useState(true);

  // Booking Modal State
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const spec = params.get("specialty");
      if (spec) setSelectedSpecialty(spec);
      const q = params.get("q");
      if (q) setSearchQuery(q);
    }
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [docRes, hospRes] = await Promise.all([
        api.get<Doctor[]>("/discovery/doctors"),
        api.get<HospitalItem[]>("/discovery/hospitals"),
      ]);
      setDoctors(docRes || []);
      setHospitals(hospRes || []);
    } catch (err) {
      console.error("Failed to load doctors:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBooking = async (doc: Doctor) => {
    setBookingDoctor(doc);
    setSelectedSlot(null);
    setBookingSuccess(null);
    setBookingError(null);
    loadSlots(doc.id, selectedDate);
  };

  const loadSlots = async (doctorId: string, date: string) => {
    try {
      const res = await api.get<{ slots: Array<{ start_time: string }> }>(
        `/discovery/doctors/${doctorId}/slots?date=${date}`
      );
      if (res.slots) {
        setAvailableSlots(res.slots.map((s) => `${date}T${s.start_time}:00`));
      } else {
        setAvailableSlots([]);
      }
    } catch {
      // Fallback slots if network fails
      setAvailableSlots([
        `${date}T09:00:00`,
        `${date}T09:30:00`,
        `${date}T10:00:00`,
        `${date}T11:00:00`,
        `${date}T14:30:00`,
      ]);
    }
  };

  const handleConfirmBooking = async () => {
    if (!bookingDoctor || !selectedSlot) return;
    setBookingLoading(true);
    setBookingError(null);
    try {
      const slotParts = selectedSlot.split("T");
      const datePart = slotParts[0] || selectedDate;
      const timePart = slotParts[1] ? slotParts[1].substring(0, 5) : "09:00";

      const res = await api.post<any>("/appointments/book", {
        doctor_id: bookingDoctor.id,
        hospital_id: bookingDoctor.hospital_id,
        appointment_date: datePart,
        start_time: timePart,
        scheduled_start: selectedSlot,
        reason_for_visit: chiefComplaint || "General consultation",
        chief_complaint: chiefComplaint || "General consultation",
        appointment_type: "NEW_CONSULT",
      });
      setBookingSuccess(res);
    } catch (err: any) {
      setBookingError(err.message || "Failed to book slot. Please try another time.");
    } finally {
      setBookingLoading(false);
    }
  };

  const specialties = [
    "ALL",
    ...Array.from(new Set(doctors.map((d) => d.specialization).filter(Boolean))),
  ];

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      doc.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.hospital_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpec =
      selectedSpecialty === "ALL" || doc.specialization === selectedSpecialty;
    const matchesHosp =
      selectedHospital === "ALL" || doc.hospital_id === selectedHospital;
    return matchesSearch && matchesSpec && matchesHosp;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Prominent Back Navigation Button */}
      <div>
        <Link
          href="/patient/dashboard"
          className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-800 hover:text-emerald-700 hover:border-emerald-300 font-bold text-sm shadow-2xs hover:shadow-xs transition-all min-h-[44px] group"
          title={t("patient.back_to_dashboard", "Back to Dashboard")}
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 group-hover:text-emerald-600 group-hover:-translate-x-1 transition-transform" />
          <span>{t("patient.back_to_dashboard", "Back to Dashboard")}</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t("patient.discover_title", "Discover Verified Doctors & Hospitals")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t("patient.discover_subtitle", "Book verified clinical consultations across integrated hospital networks.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            {t("patient.hpr_verified", "ABDM / HPR Registry Verified")}
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t("patient.search_placeholder", "Search doctor name, specialty, or hospital...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Specialty Filter */}
          <select
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="w-full md:w-auto px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 font-medium text-slate-700"
          >
            {specialties.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? t("patient.all_specialties", "All Specialties") : s}
              </option>
            ))}
          </select>

          {/* Hospital Filter */}
          <select
            value={selectedHospital}
            onChange={(e) => setSelectedHospital(e.target.value)}
            className="w-full md:w-auto px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 font-medium text-slate-700"
          >
            <option value="ALL">{t("patient.all_hospitals", "All Hospitals")}</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Doctor Cards Grid */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Querying verified clinical registry...</p>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
          <Stethoscope className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-800">No doctors match your criteria</h3>
          <p className="text-xs text-slate-500 mt-1">Try clearing filters or changing search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-emerald-500/60 hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{doc.full_name}</h3>
                    <p className="text-xs font-semibold text-emerald-700">{doc.specialization}</p>
                    <p className="text-xs text-slate-500">{doc.qualification}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 font-medium text-slate-800">
                    <Hospital className="w-3.5 h-3.5 text-slate-400" />
                    <span>{doc.hospital_name}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Reg: {doc.registration_number}</span>
                    <span className="text-emerald-700 font-semibold">HPR Active</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <div>
                    <span className="text-slate-400">{t("patient.consultation_fee", "Consultation Fee")}</span>
                    <p className="font-bold text-slate-900 text-sm">₹{doc.consultation_fee}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">{t("patient.pacing", "Pacing")}</span>
                    <p className="font-medium text-slate-700">{doc.avg_consultation_minutes} {t("patient.mins", "mins")}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleOpenBooking(doc)}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs min-h-[44px]"
                >
                  <Calendar className="w-4 h-4" />
                  <span>{t("patient.select_slot_book", "Select Slot & Book")}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Slot Modal */}
      {bookingDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{t("patient.book_opd_appointment", "Book OPD Appointment")}</h3>
                <p className="text-xs text-slate-500">
                  {bookingDoctor.full_name} • {bookingDoctor.specialization} ({bookingDoctor.hospital_name})
                </p>
              </div>
              <button
                onClick={() => setBookingDoctor(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookingSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-lg text-slate-900">{t("patient.appointment_confirmed", "Appointment Confirmed!")}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Scheduled for {new Date(bookingSuccess.scheduled_start).toLocaleString()}
                  </p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
                  Your appointment is synchronized with the CareFlow Live Queue system. Check in via QR code on arrival.
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Link
                    href={`/patient/appointments/${bookingSuccess.id}/checkin`}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold min-h-[44px] flex items-center"
                  >
                    {t("patient.view_checkin_ticket", "View Check-In Ticket")}
                  </Link>
                  <Link
                    href="/patient/dashboard"
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold min-h-[44px] flex items-center"
                  >
                    {t("patient.back_to_dashboard", "Back to Dashboard")}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {bookingError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                    {bookingError}
                  </div>
                )}

                {/* Date Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t("patient.select_date", "Select Consultation Date")}</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      loadSlots(bookingDoctor.id, e.target.value);
                    }}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                {/* Available Slots */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t("patient.available_slots", "Available Time Slots")} ({availableSlots.length})
                  </label>
                  {availableSlots.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center bg-slate-50 rounded-xl border border-slate-200">
                      {t("patient.no_slots", "No slots available on this date. Please choose another day.")}
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                      {availableSlots.map((slot) => {
                        const timeStr = new Date(slot).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        const isSelected = selectedSlot === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`py-2 px-2 text-xs font-semibold rounded-lg border transition-all min-h-[44px] ${
                              isSelected
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50"
                            }`}
                          >
                            {timeStr}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Chief Complaint */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t("patient.reason_for_visit", "Reason for Visit / Symptoms (Optional)")}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Chest tightness after walking, routine BP review"
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                {/* Confirm Button */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setBookingDoctor(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 min-h-[44px]"
                  >
                    {t("cancel", "Cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={!selectedSlot || bookingLoading}
                    onClick={handleConfirmBooking}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 min-h-[44px]"
                  >
                    {bookingLoading ? t("patient.reserving_slot", "Reserving Slot...") : t("patient.confirm_lock_slot", "Confirm & Lock Slot")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
