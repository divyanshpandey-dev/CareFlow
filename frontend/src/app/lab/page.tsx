"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Barcode,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  FileText,
  Filter,
  FlaskConical,
  Hash,
  Hospital,
  Layers,
  Lock,
  Search,
  ShieldCheck,
  Stethoscope,
  TestTube2,
  UploadCloud,
  User,
  X,
} from "lucide-react";
import { api } from "@/lib/api";

interface LabOrder {
  id: string;
  encounter_id: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  doctor_name: string;
  hospital_name: string;
  test_name: string;
  test_code?: string;
  priority: "ROUTINE" | "STAT";
  status: "ORDERED" | "SAMPLE_COLLECTED" | "PROCESSING" | "VERIFIED" | "CANCELLED";
  clinical_notes?: string;
  created_at: string;
  report?: {
    id: string;
    report_number: string;
    summary: string;
    abnormal_flags: boolean;
    file_sha256?: string;
    verified_at?: string;
  };
}

export default function LabPortalPage() {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Verification Modal State
  const [verifyingOrder, setVerifyingOrder] = useState<LabOrder | null>(null);
  const [reportSummary, setReportSummary] = useState(
    "Serum Total Cholesterol: 220 mg/dL [ELEVATED], Serum Triglycerides: 185 mg/dL [BORDERLINE HIGH], HDL-C: 42 mg/dL [NORMAL], LDL-C: 148 mg/dL [HIGH - Optimal < 100 mg/dL]. Compatible with mixed dyslipidemia."
  );
  const [hasAbnormalFlags, setHasAbnormalFlags] = useState(true);
  const [viewingReport, setViewingReport] = useState<LabOrder | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get<LabOrder[]>("/lab/orders");
      setOrders(res || []);
    } catch (err) {
      console.error("Failed to load lab orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    setActionLoading(orderId);
    try {
      await api.post(`/lab/orders/${orderId}/status`, { status: nextStatus });
      await loadOrders();
    } catch (err: any) {
      alert(err.message || "Failed to update specimen status.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifySubmit = async () => {
    if (!verifyingOrder) return;
    setActionLoading(verifyingOrder.id);
    try {
      await api.post(`/lab/orders/${verifyingOrder.id}/verify`, {
        summary: reportSummary,
        abnormal_flags: hasAbnormalFlags,
        document_url: `/vault/reports/LAB-${verifyingOrder.id.slice(0, 8)}.pdf`,
      });
      setVerifyingOrder(null);
      await loadOrders();
    } catch (err: any) {
      alert(err.message || "Failed to verify lab report.");
    } finally {
      setActionLoading(null);
    }
  };

  const switchLabTechPersona = async () => {
    try {
      const res = await api.post<{ access_token: string }>("/auth/login", {
        identifier: "lab@citycare.com",
        password: "password123",
      });
      api.setToken(res.access_token);
      localStorage.setItem("careflow_active_persona", "Amit Desai (Lab Tech)");
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filterStatus === "ALL") return true;
    return o.status === filterStatus;
  });

  const orderedCount = orders.filter((o) => o.status === "ORDERED").length;
  const inProcessCount = orders.filter(
    (o) => o.status === "SAMPLE_COLLECTED" || o.status === "PROCESSING"
  ).length;
  const verifiedCount = orders.filter((o) => o.status === "VERIFIED").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
            <FlaskConical className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                Hospital Diagnostics Workbench
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full">
                NABL Accredited
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <span>Technologist: Amit Desai</span>
              <span>•</span>
              <span className="font-semibold text-slate-700">Central Pathology & Biochemistry Lab</span>
              <span>•</span>
              <span>CityCare Superspecialty Hospital</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={switchLabTechPersona}
            className="text-xs text-slate-400 hover:text-slate-700 underline"
            title="Log in directly as Lab Tech"
          >
            Force Lab Auth
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Awaiting Specimen
            </span>
            <div className="text-3xl font-black text-slate-900 mt-1">{orderedCount}</div>
            <span className="text-[11px] text-slate-500">Scheduled OPD requisitions</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <TestTube2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Specimen In-Processing
            </span>
            <div className="text-3xl font-black text-slate-900 mt-1">{inProcessCount}</div>
            <span className="text-[11px] text-slate-500">Under analyzer run</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Verified & Sealed
            </span>
            <div className="text-3xl font-black text-slate-900 mt-1">{verifiedCount}</div>
            <span className="text-[11px] text-slate-500">SHA-256 Hash Attached</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: "ALL", label: `All Orders (${orders.length})` },
          { id: "ORDERED", label: `Awaiting Sample (${orderedCount})` },
          { id: "SAMPLE_COLLECTED", label: `Sample Drawn` },
          { id: "PROCESSING", label: `Processing` },
          { id: "VERIFIED", label: `Verified (${verifiedCount})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterStatus === tab.id
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading laboratory requisitions...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            No diagnostic orders in this queue.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Patient / Contact</th>
                  <th className="py-3 px-4">Diagnostic Test</th>
                  <th className="py-3 px-4">Prescribing Physician</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Ordered At</th>
                  <th className="py-3 px-4 text-right">Laboratory Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {filteredOrders.map((order) => {
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <strong className="text-slate-900 block font-bold text-sm">
                          {order.patient_name}
                        </strong>
                        <span className="text-[11px] text-slate-400">Ph: {order.patient_phone}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 text-xs block">
                          {order.test_name}
                        </span>
                        {order.priority === "STAT" ? (
                          <span className="inline-block mt-0.5 text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded-sm">
                            STAT URGENT
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Routine OPD Panel</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {order.doctor_name}
                        <span className="block text-[10px] text-slate-400">{order.hospital_name}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            order.status === "VERIFIED"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : order.status === "PROCESSING"
                              ? "bg-blue-100 text-blue-800 border border-blue-200 animate-pulse"
                              : order.status === "SAMPLE_COLLECTED"
                              ? "bg-teal-100 text-teal-800 border border-teal-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                        {new Date(order.created_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {order.status === "ORDERED" && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, "SAMPLE_COLLECTED")}
                            disabled={actionLoading === order.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs"
                          >
                            <Barcode className="w-3.5 h-3.5" />
                            <span>Collect Specimen</span>
                          </button>
                        )}

                        {order.status === "SAMPLE_COLLECTED" && (
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateStatus(order.id, "PROCESSING")}
                              disabled={actionLoading === order.id}
                              className="px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs border border-blue-200"
                            >
                              Run Analyzer
                            </button>
                            <button
                              onClick={() => setVerifyingOrder(order)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
                            >
                              <FileCheck2 className="w-3.5 h-3.5" />
                              <span>Verify Report</span>
                            </button>
                          </div>
                        )}

                        {order.status === "PROCESSING" && (
                          <button
                            onClick={() => setVerifyingOrder(order)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>Enter & Verify Report</span>
                          </button>
                        )}

                        {order.status === "VERIFIED" && (
                          <button
                            onClick={() => setViewingReport(order)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>View Hash & Report</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Verify Lab Report Modal */}
      {verifyingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Verify & Cryptographically Seal Diagnostic Report
                </h3>
                <p className="text-xs text-slate-500">
                  Patient: {verifyingOrder.patient_name} • Test: {verifyingOrder.test_name}
                </p>
              </div>
              <button
                onClick={() => setVerifyingOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pathologist Diagnostic Synthesis / Value Parameters
                </label>
                <textarea
                  rows={4}
                  value={reportSummary}
                  onChange={(e) => setReportSummary(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 font-sans"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-amber-900 block">Abnormal Markers Detected?</span>
                  <span className="text-[11px] text-amber-700">
                    Will trigger clinical attention flag in Doctor Cockpit & AI Brief.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={hasAbnormalFlags}
                  onChange={(e) => setHasAbnormalFlags(e.target.checked)}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs font-mono text-slate-500 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">Automated SHA-256 seal generated on confirmation</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setVerifyingOrder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVerifySubmit}
                  disabled={actionLoading === verifyingOrder.id}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <FileCheck2 className="w-4 h-4" />
                  {actionLoading === verifyingOrder.id
                    ? "Calculating Hash..."
                    : "Publish & Seal Report"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Sealed Report Modal */}
      {viewingReport && viewingReport.report && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Cryptographically Verified
                </span>
                <h3 className="font-bold text-lg text-slate-900 mt-1">
                  {viewingReport.report.report_number}
                </h3>
                <p className="text-xs text-slate-500">
                  {viewingReport.test_name} • Patient: {viewingReport.patient_name}
                </p>
              </div>
              <button
                onClick={() => setViewingReport(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Pathologist Findings
                </span>
                <p className="text-xs text-slate-800 leading-relaxed font-sans">
                  {viewingReport.report.summary}
                </p>
                {viewingReport.report.abnormal_flags && (
                  <div className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Out of Reference Range Markers Noted</span>
                  </div>
                )}
              </div>

              {viewingReport.report.file_sha256 && (
                <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                    <Lock className="w-3.5 h-3.5" />
                    <span>SHA-256 Tamper-Proof Cryptographic Hash</span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-600 break-all select-all">
                    {viewingReport.report.file_sha256}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingReport(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

