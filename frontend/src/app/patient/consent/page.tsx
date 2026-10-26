"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  History,
  Info,
  Lock,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";

interface ConsentItem {
  id: string;
  doctor_name: string;
  requester_hospital_name: string;
  purpose: string;
  record_types: string[];
  status: "REQUESTED" | "GRANTED" | "REVOKED" | "EXPIRED" | "DENIED";
  valid_to: string;
  created_at: string;
}

interface AuditLogItem {
  id: string;
  accessor_name: string;
  accessor_role: string;
  hospital_name: string;
  record_type: string;
  timestamp: string;
  ip_address: string;
}

export default function ConsentManagementPage() {
  const { t } = useLanguage();
  const [consents, setConsents] = useState<ConsentItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadConsentData();
  }, []);

  const loadConsentData = async () => {
    setLoading(true);
    try {
      const [consentRes, auditRes] = await Promise.all([
        api.get<ConsentItem[]>("/consent/my-consents").catch(() => []),
        api.get<AuditLogItem[]>("/consent/audit-log").catch(() => []),
      ]);
      setConsents(consentRes || []);
      setAuditLogs(auditRes || []);
    } catch (err) {
      console.error("Failed to load consent data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGrant = async (consentId: string) => {
    setActionLoading(consentId);
    try {
      await api.post(`/consent/grant/${consentId}`);
      await loadConsentData();
    } catch (err: any) {
      alert(err.message || "Failed to grant consent.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async (consentId: string) => {
    setActionLoading(consentId);
    try {
      await api.post(`/consent/deny/${consentId}`);
      await loadConsentData();
    } catch (err: any) {
      alert(err.message || "Failed to deny consent.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (consentId: string) => {
    if (!confirm("Are you sure you want to revoke this consent? The doctor will lose all access immediately.")) {
      return;
    }
    setActionLoading(consentId);
    try {
      await api.post(`/consent/revoke/${consentId}`);
      await loadConsentData();
    } catch (err: any) {
      alert(err.message || "Failed to revoke consent.");
    } finally {
      setActionLoading(null);
    }
  };

  const pendingRequests = consents.filter((c) => c.status === "REQUESTED");
  const activeConsents = consents.filter((c) => c.status === "GRANTED");
  const pastConsents = consents.filter(
    (c) => c.status === "REVOKED" || c.status === "EXPIRED" || c.status === "DENIED"
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Prominent Back to Dashboard Navigation Button */}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {t("patient.dpdp_consent", "DPDP Act 2023 Consent Manager")}
            </h1>
            <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Patient-First Sovereign Control
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Govern cross-hospital health record access. Grant, inspect, or revoke permissions at any moment.
          </p>
        </div>
      </div>

      {/* DPDP Legal Guarantee Card */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
          <Lock className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-sm text-slate-900">
            Digital Personal Data Protection (DPDP) Act Compliance
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Under Indian law, no healthcare provider can inspect your diagnostic records, consultations, or medications without your explicit, purpose-limited consent. Revoking consent severs access immediately with zero retention.
          </p>
        </div>
      </div>

      {/* 1. Pending Incoming Requests */}
      <div className="space-y-3">
        <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-500" />
          <span>Pending Data Access Requests ({pendingRequests.length})</span>
        </h3>

        {pendingRequests.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            No pending record access requests.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white p-6 rounded-2xl border-2 border-amber-200 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      External Doctor Request
                    </span>
                    <h4 className="text-lg font-bold text-slate-900 mt-1">{req.doctor_name}</h4>
                    <p className="text-xs text-slate-500">{req.requester_hospital_name}</p>
                  </div>
                  <div className="text-xs text-slate-400 sm:text-right">
                    <span>Requested on: </span>
                    <strong className="text-slate-700">
                      {new Date(req.created_at).toLocaleDateString()}
                    </strong>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs space-y-2">
                  <div>
                    <span className="text-slate-400 font-medium">Clinical Purpose: </span>
                    <strong className="text-slate-800">{req.purpose}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Requested Records: </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {req.record_types?.map((type) => (
                        <span
                          key={type}
                          className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-medium text-slate-700"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => handleDeny(req.id)}
                    disabled={actionLoading === req.id}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    Deny Access
                  </button>
                  <button
                    onClick={() => handleGrant(req.id)}
                    disabled={actionLoading === req.id}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {actionLoading === req.id ? "Granting..." : "Grant Consent (Time-Bound)"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Active Consents */}
      <div className="space-y-3">
        <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span>Active Granted Permissions ({activeConsents.length})</span>
        </h3>

        {activeConsents.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            No active third-party consents granted. Your medical data is strictly private.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeConsents.map((consent) => (
              <div
                key={consent.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-base text-slate-900">{consent.doctor_name}</h4>
                      <p className="text-xs text-slate-500">{consent.requester_hospital_name}</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    <span className="text-slate-400">Purpose: </span>
                    {consent.purpose}
                  </p>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {consent.record_types?.map((type) => (
                      <span
                        key={type}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-700"
                      >
                        {type}
                      </span>
                    ))}
                  </div>

                  <div className="text-[11px] text-slate-400 pt-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Expires: {new Date(consent.valid_to).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleRevoke(consent.id)}
                    disabled={actionLoading === consent.id}
                    className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {actionLoading === consent.id ? "Revoking..." : "1-Click Revoke Consent"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Immutable Access Audit Log */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-base text-slate-900">Access Audit Trail with Integrity Controls</h3>
          </div>
          <span className="text-xs text-slate-400">Tamper-Evident Security Log</span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            No record read accesses recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Accessor / Clinician</th>
                  <th className="py-2.5 px-3">Facility</th>
                  <th className="py-2.5 px-3">Record Inspected</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {log.accessor_name}
                      <span className="text-[10px] text-slate-400 ml-1">({log.accessor_role})</span>
                    </td>
                    <td className="py-2.5 px-3">{log.hospital_name}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium">
                        {log.record_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

