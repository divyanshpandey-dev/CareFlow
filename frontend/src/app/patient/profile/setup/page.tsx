"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  ShieldCheck,
  Calendar,
  Heart,
  Droplet,
  MapPin,
  Phone,
  Globe,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage, INDIAN_LANGUAGES } from "@/context/LanguageContext";

export default function PatientProfileSetupPage() {
  const router = useRouter();
  const { currentLanguage, setLanguageCode, t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [gender, setGender] = useState("MALE");
  const [bloodGroup, setBloodGroup] = useState("B+");
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [address, setAddress] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [idDocType, setIdDocType] = useState("AADHAAR");
  const [idDocNumber, setIdDocNumber] = useState("");
  const [patientIdDisplay, setPatientIdDisplay] = useState("CF-PAT-000101");

  useEffect(() => {
    // Fetch current user details
    api.get<any>("/auth/me")
      .then((data) => {
        if (data) {
          if (data.full_name) setFullName(data.full_name);
          if (data.patient_identifier) setPatientIdDisplay(data.patient_identifier);
          if (data.dob) {
            setDob(data.dob);
            calculateAge(data.dob);
          }
          if (data.gender) setGender(data.gender);
          if (data.blood_group) setBloodGroup(data.blood_group);
          if (data.preferred_language) setPreferredLanguage(data.preferred_language);
          if (data.address) setAddress(data.address);
          if (data.emergency_contact_name) setEmergencyName(data.emergency_contact_name);
          if (data.emergency_contact_phone) setEmergencyPhone(data.emergency_contact_phone);

          // If already completed, user can still edit or proceed
          if (data.profile_completed) {
            // Already complete
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load profile:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const calculateAge = (birthDateStr: string) => {
    if (!birthDateStr) {
      setAge(null);
      return;
    }
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    setAge(calculatedAge >= 0 ? calculatedAge : 0);
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDob(val);
    calculateAge(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!dob) {
      setError("Please select your date of birth to complete onboarding.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/profile/setup", {
        full_name: fullName,
        dob: dob,
        gender: gender,
        blood_group: bloodGroup,
        preferred_language: preferredLanguage,
        address: address,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
        id_document_type: idDocType,
        id_document_number: idDocNumber,
      });

      // Update language context if changed
      if (preferredLanguage !== currentLanguage.code) {
        setLanguageCode(preferredLanguage as any);
      }

      // Route smoothly to patient dashboard
      router.push("/patient/dashboard");
    } catch (err: any) {
      setError(err?.message || "Failed to save profile. Please check your inputs.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center space-x-3 text-slate-600">
          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="font-medium text-sm">Loading your healthcare workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-full mb-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Patient Onboarding
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Complete Your Healthcare Profile
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Your medical journey, queue tokens, and digital prescriptions are securely linked to this verified profile.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:text-right">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">CareFlow ID</span>
              <span className="font-mono text-base font-bold text-emerald-700">{patientIdDisplay}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              Personal & Demographics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Date of Birth
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={dob}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={handleDobChange}
                    className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                {age !== null && (
                  <p className="mt-1.5 text-xs text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Calculated Age: <strong className="font-semibold">{age} years</strong>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other / Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Blood Group
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Preferred Healthcare Language
                </label>
                <select
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                >
                  {INDIAN_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.nativeName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Residential Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House number, Street, Locality, City, State, PIN"
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-600" />
              Emergency Contact Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Contact Person Name
                </label>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="e.g. Suman Sharma (Spouse)"
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Emergency Phone Number
                </label>
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Secure Identity Verification */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Safe Identity Verification
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              CareFlow safeguards patient privacy. National ID numbers are encrypted and masked; only the last 4 digits are recorded.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Document Type
                </label>
                <select
                  value={idDocType}
                  onChange={(e) => setIdDocType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                >
                  <option value="AADHAAR">Aadhaar Card (UIDAI)</option>
                  <option value="PASSPORT">Passport</option>
                  <option value="VOTER_ID">Voter ID Card</option>
                  <option value="DRIVING_LICENSE">Driving License</option>
                  <option value="PAN_CARD">PAN Card</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Document ID Number
                </label>
                <input
                  type="text"
                  value={idDocNumber}
                  onChange={(e) => setIdDocNumber(e.target.value)}
                  placeholder={idDocType === "AADHAAR" ? "12-digit number" : "Document identifier"}
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
                {idDocNumber && idDocNumber.length >= 4 && (
                  <p className="mt-1.5 text-xs text-slate-500 font-mono">
                    Masked preview: {idDocType === "AADHAAR" && idDocNumber.length === 12 ? `XXXX-XXXX-${idDocNumber.slice(-4)}` : `•••• ${idDocNumber.slice(-4)}`}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-800 leading-relaxed">
                <strong>ABDM-Aligned Healthcare Architecture:</strong> In accordance with national digital health standards, your sensitive identification documents are shielded from public or unauthorized exposure.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => router.push("/patient/dashboard")}
              className="text-sm font-medium text-slate-500 hover:text-slate-800 transition"
            >
              Skip for now
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving Profile...
                </>
              ) : (
                <>
                  Complete Setup & Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
