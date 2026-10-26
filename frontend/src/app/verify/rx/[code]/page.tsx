"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  Hospital,
  Lock,
  Printer,
  QrCode,
  ShieldCheck,
  Stethoscope,
  User,
} from "lucide-react";
import { api } from "@/lib/api";

interface RxVerificationData {
  is_valid: boolean;
  verification_code: string;
  prescription_number: string;
  doctor_name: string;
  doctor_qualification: string;
  doctor_registration: string;
  hospital_name: string;
  patient_name_masked: string;
  issued_at: string;
  follow_up_date?: string;
  instructions?: string;
  items: Array<{
    medicine_name: string;
    generic_name?: string;
    formulation: string;
    dosage: string;
    frequency: string;
    duration_days: number;
    special_instructions?: string;
  }>;
  cryptographic_seal: string;
  audit_status: string;
}

export default function VerifyPrescriptionPage() {
  const params = useParams();
  const code = params?.code as string;

  const [data, setData] = useState<RxVerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (code) {
      verifyPrescription(code);
    }
  }, [code]);

  const verifyPrescription = async (verificationCode: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<RxVerificationData>(
        `/clinical/prescriptions/verify/${verificationCode}`
      );
      setData(res);
    } catch (err: any) {
      setError(
        err.message ||
          "Could not verify prescription. Invalid or altered cryptographic seal."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation / Header */}
        <div className="flex items-center justify-between no-print">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>CareFlow Public Registry</span>
          </Link>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Clinical Record</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">
              Validating HMAC-SHA256 Cryptographic Seal...
            </p>
            <p className="text-xs text-slate-400 mt-1">Checking National Physician Registry (HPR)</p>
          </div>
        ) : error || !data || !data.is_valid ? (
          <div className="bg-white rounded-3xl border-2 border-rose-300 p-8 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Cryptographic Verification Failed</h2>
            <p className="text-xs text-rose-600 max-w-md mx-auto">
              {error || "The digital signature on this prescription does not match registered clinical records. Possible tampering or forgery detected."}
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl"
              >
                Return Home
              </Link>
            </div>
          </div>
        ) : (
          /* Validated Official Prescription Document */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-10 space-y-6 relative overflow-hidden">
            {/* Tamper-Proof Seal Watermark */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none" />

            {/* Verification Success Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Cryptographically Sealed & Verified
                  </h3>
                  <p className="text-xs text-emerald-800">
                    Authenticated by CareFlow Registry & Designed for National HPR.
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-800 bg-white px-3 py-1 rounded-lg border border-emerald-200 shrink-0">
                STATUS: VALID
              </span>
            </div>

            {/* Document Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Activity className="w-6 h-6 text-emerald-600" />
                  <span className="text-xl font-black text-slate-900 tracking-tight">CareFlow</span>
                </div>
                <h4 className="text-sm font-bold text-slate-800">{data.hospital_name}</h4>
                <p className="text-xs text-slate-500">Official Outpatient Electronic Prescription</p>
              </div>

              <div className="text-left sm:text-right space-y-1 font-mono text-xs text-slate-600">
                <div>
                  <span className="text-slate-400">Prescription No: </span>
                  <strong className="text-slate-900">{data.prescription_number}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Date Issued: </span>
                  <strong>{new Date(data.issued_at).toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Verification Code: </span>
                  <strong className="text-emerald-700">{data.verification_code}</strong>
                </div>
              </div>
            </div>

            {/* Doctor & Patient Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Prescribing Physician</span>
                <div className="font-bold text-slate-900 text-sm">{data.doctor_name}</div>
                <div className="text-slate-600">{data.doctor_qualification}</div>
                <div className="text-emerald-700 font-semibold font-mono text-[11px]">
                  HPR / Reg: {data.doctor_registration}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Patient Identifier</span>
                <div className="font-bold text-slate-900 text-sm">{data.patient_name_masked}</div>
                <div className="text-slate-500">Identity protected under DPDP Act 2023</div>
                {data.follow_up_date && (
                  <div className="text-amber-800 font-semibold pt-1">
                    Follow-Up Advised: {data.follow_up_date}
                  </div>
                )}
              </div>
            </div>

            {/* Prescribed Items Table */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                  Prescribed Medications ({data.items?.length ?? 0})
                </h4>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Medicine & Form</th>
                      <th className="py-2.5 px-3">Dosage</th>
                      <th className="py-2.5 px-3">Frequency</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {data.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {item.medicine_name}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {item.formulation}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold">{item.dosage}</td>
                        <td className="py-2.5 px-3">{item.frequency}</td>
                        <td className="py-2.5 px-3 font-medium">{item.duration_days} days</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {item.special_instructions || "As directed"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* General Advice */}
            {data.instructions && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
                <span className="font-bold text-slate-800">Physician Notes: </span>
                <span>{data.instructions}</span>
              </div>
            )}

            {/* Cryptographic Seal Footer */}
            <div className="pt-6 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  HMAC-SHA256 Digital Verification Signature
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  CareFlow Sovereign Cryptographic Seal
                </span>
              </div>
              <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] break-all select-all">
                {data.cryptographic_seal}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

