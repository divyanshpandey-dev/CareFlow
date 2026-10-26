"use client";

import React, { useEffect, useState } from "react";
import { Clock, Plus, Calendar, Stethoscope, Loader2, CheckCircle2, User } from "lucide-react";
import { api } from "@/lib/api";
import { useAccessibility } from "@/context/AccessibilityContext";

interface ScheduleItem {
  id: string;
  doctor_id: string;
  doctor_name: string;
  department_name: string;
  day_of_week: number;
  day_name: string;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  max_patients: number;
  is_active: boolean;
}

interface DoctorSimple {
  id: string;
  full_name: string;
  specialization: string;
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [doctors, setDoctors] = useState<DoctorSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<number>(0);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("13:00");
  const [maxPatients, setMaxPatients] = useState(25);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { simpleView, speakText } = useAccessibility();

  const loadData = async () => {
    try {
      setLoading(true);
      const [schedRes, docRes] = await Promise.all([
        api.get<ScheduleItem[]>("/hospital-admin/schedules"),
        api.get<DoctorSimple[]>("/hospital-admin/doctors"),
      ]);
      setSchedules(schedRes || []);
      setDoctors(docRes || []);
      if (docRes && docRes.length > 0) {
        setSelectedDoctorId(docRes[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load schedules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) return;
    try {
      setSaving(true);
      setMessage(null);
      await api.post("/hospital-admin/schedules", {
        doctor_id: selectedDoctorId,
        day_of_week: Number(dayOfWeek),
        start_time: `${startTime}:00`,
        end_time: `${endTime}:00`,
        max_patients: Number(maxPatients),
      });
      setMessage("OPD schedule block created successfully!");
      speakText("Schedule block added");
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setMessage(err.message || "Failed to create schedule.");
    } finally {
      setSaving(false);
    }
  };

  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-400" />
            Doctor OPD Schedules
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Weekly consultation time blocks and token quotas for facility clinics.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className={`rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all shadow-md flex items-center gap-2 justify-center ${
            simpleView ? "px-6 py-3.5 text-base min-h-[48px]" : "px-4 py-2.5 text-xs min-h-[40px]"
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Add Schedule Block</span>
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
      ) : schedules.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No OPD Schedules Defined</h3>
          <p className="text-xs text-slate-500 mt-1">
            Create schedule blocks to open appointments and queue ticket generation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schedules.map((s) => (
            <div
              key={s.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-teal-400 px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">
                  {s.day_name}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Max {s.max_patients} Patients
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-0.5">{s.doctor_name}</h3>
              <p className="text-xs text-slate-400 mb-3">{s.department_name}</p>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-teal-400" />
                  {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                </span>
                <span className="text-[11px] text-emerald-400 font-semibold">Active Block</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">Add OPD Schedule Block</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Doctor *</label>
                <select
                  aria-label="Doctor Selection"
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name} ({d.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Day of Week *</label>
                <select
                  aria-label="Day of Week"
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                >
                  {DAYS.map((dayName, idx) => (
                    <option key={idx} value={idx}>
                      {dayName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Start Time (HH:MM)</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">End Time (HH:MM)</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Token Quota / Max Patients</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={maxPatients}
                  onChange={(e) => setMaxPatients(Number(e.target.value))}
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
                  {saving ? "Saving..." : "Save Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
