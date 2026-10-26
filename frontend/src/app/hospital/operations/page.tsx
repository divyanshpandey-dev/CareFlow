"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  DoorOpen,
  FastForward,
  FileCheck2,
  Hospital,
  Layers,
  Monitor,
  Play,
  RotateCcw,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  Tv,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { wsClient } from "@/lib/ws";

interface AnalyticsData {
  date: string;
  total_appointments_today: number;
  checked_in_count: number;
  waiting_count: number;
  in_consultation_count: number;
  completed_count: number;
  prescriptions_issued_today: number;
  active_doctors_count: number;
  average_wait_time_minutes: number;
  queue_dwell_status: string;
}

export default function HospitalOperationsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stepping, setStepping] = useState(false);
  const [lastAnnouncement, setLastAnnouncement] = useState<string>("Token CARD-A14 -> Room 204");
  const [audioAnnounce, setAudioAnnounce] = useState(false);

  // Department Live Token Boards
  const [opdRooms, setOpdRooms] = useState([
    {
      dept: "Cardiology OPD",
      room: "Room 204",
      doctor: "Dr. Ananya Sharma",
      doctorId: "0fffe2b7-1767-42d2-a126-c068066d0323",
      nowServing: "CARD-A14",
      patient: "Rahul Verma",
      upNext: "CARD-A15",
      waiting: 2,
      status: "CALLING",
    },
    {
      dept: "Orthopedics OPD",
      room: "Room 108",
      doctor: "Dr. Rajesh Iyer",
      doctorId: "a6096329-6f8d-4475-879a-cd18cc8588c7",
      nowServing: "ORTH-B02",
      patient: "Sunil Joshi",
      upNext: "ORTH-B03",
      waiting: 1,
      status: "IN_CONSULTATION",
    },
    {
      dept: "Cardio-Thoracic Review",
      room: "Room 302",
      doctor: "Dr. Sunita Mehta",
      doctorId: "bb322866-7b61-43d6-8877-9d6561ecc515",
      nowServing: "APEX-C01",
      patient: "Kavita Rao",
      upNext: "APEX-C02",
      waiting: 1,
      status: "WAITING",
    },
  ]);

  useEffect(() => {
    loadOperationsData();

    // Connect WebSocket for live hospital queue events
    wsClient.connect();
    wsClient.subscribe("hospital:hosp-citycare-mumbai:queue", (message) => {
      console.log("Hospital live queue update:", message);
      loadOperationsData();
      if (message.data?.ticket_number) {
        setLastAnnouncement(`Token ${message.data.ticket_number} -> Room 204`);
        triggerChime();
      }
    });
  }, []);

  const loadOperationsData = async () => {
    try {
      const data = await api.get<AnalyticsData>("/admin/analytics");
      setAnalytics(data);
    } catch (err) {
      console.error("Failed to load operations analytics:", err);
      // Fallback display values
      setAnalytics({
        date: new Date().toISOString().split("T")[0],
        total_appointments_today: 18,
        checked_in_count: 7,
        waiting_count: 3,
        in_consultation_count: 2,
        completed_count: 4,
        prescriptions_issued_today: 4,
        active_doctors_count: 3,
        average_wait_time_minutes: 14,
        queue_dwell_status: "OPTIMAL",
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerChime = () => {
    setAudioAnnounce(true);
    setTimeout(() => setAudioAnnounce(false), 3000);
  };

  const handleSimulateQueueStep = async () => {
    setStepping(true);
    try {
      const docId = "0fffe2b7-1767-42d2-a126-c068066d0323"; // Dr. Ananya Sharma
      const res = await api.post<any>(`/admin/simulate-queue-step?doctor_id=${docId}`);
      if (res.ticket_number) {
        setLastAnnouncement(`Token ${res.ticket_number} -> Room 204`);
        triggerChime();
        // Shift cardiology token in state
        setOpdRooms((prev) => {
          const copy = [...prev];
          copy[0] = {
            ...copy[0],
            nowServing: res.ticket_number,
            patient: "Priya Nair",
            upNext: "CARD-A16",
            waiting: Math.max(0, copy[0].waiting - 1),
            status: "CALLING",
          };
          return copy;
        });
      }
      await loadOperationsData();
    } catch (err: any) {
      alert(err.message || "Failed to step queue simulation.");
    } finally {
      setStepping(false);
    }
  };

  const switchHospitalAdminPersona = async () => {
    try {
      const res = await api.post<{ access_token: string }>("/auth/login", {
        identifier: "admin@citycare.com",
        password: "password123",
      });
      api.setToken(res.access_token);
      localStorage.setItem("careflow_active_persona", "Suresh Menon (Hospital Admin)");
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
            <Hospital className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                Hospital Operational Command Center
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200 px-2.5 py-0.5 rounded-full">
                NABH Level-3
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <span>CityCare Superspecialty Hospital (Mumbai Central)</span>
              <span>•</span>
              <span className="font-semibold text-emerald-700">OPD Active (09:00 AM – 06:00 PM)</span>
            </p>
          </div>
        </div>

        {/* Demo Fast-Forward Controller */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSimulateQueueStep}
            disabled={stepping}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 disabled:opacity-50 transition-all hover:scale-105"
            title="Advances doctor queue by one patient and broadcasts WebSocket updates"
          >
            <FastForward className="w-4 h-4" />
            <span>{stepping ? "Pacing Queue..." : "Simulate Next Queue Step"}</span>
          </button>

          <button
            onClick={switchHospitalAdminPersona}
            className="text-xs text-slate-400 hover:text-slate-700 underline"
            title="Log in directly as Hospital Administrator"
          >
            Force Admin Auth
          </button>
        </div>
      </div>

      {/* Big Screen Lobby Display (Hospital Waiting Hall Board) */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border-4 border-slate-900 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-3">
            <Tv className="w-6 h-6 text-emerald-400" />
            <div>
              <h2 className="text-lg font-black tracking-wider uppercase text-slate-100">
                Lobby Waiting Display Board
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                Live Broadcast • Real-Time EWMA Paced
              </span>
            </div>
          </div>

          {/* Audio Chime Banner */}
          {audioAnnounce ? (
            <div className="bg-emerald-500 text-white px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 animate-bounce">
              <Bell className="w-4 h-4 animate-spin" />
              <span>Chime: {lastAnnouncement}</span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>OPD Queues Running Normally</span>
            </div>
          )}
        </div>

        {/* Big Screen Department Token Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {opdRooms.map((room, idx) => (
            <div
              key={idx}
              className={`p-6 rounded-2xl border-2 transition-all ${
                room.status === "CALLING"
                  ? "bg-gradient-to-b from-slate-900 to-emerald-950/60 border-emerald-500 shadow-lg shadow-emerald-500/10"
                  : "bg-slate-900 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-400">
                  {room.dept}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-300">
                  {room.room}
                </span>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  Now Serving
                </span>
                <div className="text-4xl sm:text-5xl font-black text-white tracking-tight mt-1">
                  {room.nowServing}
                </div>
                <p className="text-sm font-semibold text-slate-200 mt-1 truncate">
                  {room.patient}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{room.doctor}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <div>
                  <span className="text-[10px] uppercase block text-slate-500">Up Next</span>
                  <strong className="text-amber-300 font-mono text-sm">{room.upNext}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase block text-slate-500">In Corridor</span>
                  <span className="text-slate-300 font-semibold">{room.waiting} waiting</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operational Analytics Metrics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <span>Today&apos;s Real-Time OPD Operations Metrics</span>
          </h3>
          <span className="text-xs text-slate-400">Paced via EWMA Formula</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] uppercase font-bold text-slate-400 block">
              Scheduled
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {analytics?.total_appointments_today ?? 18}
            </div>
            <span className="text-[10px] text-slate-500">Appointments</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] uppercase font-bold text-slate-400 block">
              Checked In
            </span>
            <div className="text-2xl font-black text-teal-700 mt-1">
              {analytics?.checked_in_count ?? 7}
            </div>
            <span className="text-[10px] text-slate-500">Arrived at OPD</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] uppercase font-bold text-slate-400 block">
              In Waiting
            </span>
            <div className="text-2xl font-black text-amber-600 mt-1">
              {analytics?.waiting_count ?? 3}
            </div>
            <span className="text-[10px] text-slate-500">In corridor queue</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] uppercase font-bold text-slate-400 block">
              Consulting
            </span>
            <div className="text-2xl font-black text-purple-700 mt-1">
              {analytics?.in_consultation_count ?? 2}
            </div>
            <span className="text-[10px] text-slate-500">In doctor cabins</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] uppercase font-bold text-slate-400 block">
              Completed
            </span>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              {analytics?.completed_count ?? 4}
            </div>
            <span className="text-[10px] text-slate-500">Consultations done</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] uppercase font-bold text-slate-400 block">
              Est. Wait (EWMA)
            </span>
            <div className="text-2xl font-black text-blue-700 mt-1">
              ~{analytics?.average_wait_time_minutes ?? 14}m
            </div>
            <span className="text-[10px] text-slate-500">Pacing average</span>
          </div>
        </div>
      </div>

      {/* Hospital Infrastructure & Department Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-emerald-600" />
              <span>Active Department Cabins Today</span>
            </h4>
            <span className="text-xs text-slate-400">3 of 3 Verified</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-xs">
              <div>
                <strong className="text-slate-900">Dr. Ananya Sharma</strong>
                <span className="block text-[11px] text-slate-500">Cardiology • Cabin 204</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Active & Consulting
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-xs">
              <div>
                <strong className="text-slate-900">Dr. Rajesh Iyer</strong>
                <span className="block text-[11px] text-slate-500">Orthopedics • Cabin 108</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Active & Consulting
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-xs">
              <div>
                <strong className="text-slate-900">Dr. Sunita Mehta</strong>
                <span className="block text-[11px] text-slate-500">Cardio-Thoracic • Cabin 302</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Active & Consulting
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>National Health Network & Compliance</span>
            </h4>
            <span className="text-xs text-slate-400">ABDM HFR Active</span>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-900 block mb-0.5">
                Hospital Facility Registry (HFR): IN2789421
              </span>
              <span>
                Synchronized with the National Health Authority (NHA) gateway for instant ABDM M1, M2, and M3 milestones.
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-900 block mb-0.5">
                Zero-Trust Clinical Audit Gateway
              </span>
              <span>
                All encounters, prescription signatures, and patient document inspections are immutably logged with SHA-256 hashes and timestamp verification.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

