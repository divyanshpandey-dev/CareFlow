"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { PatientHeader } from "@/components/patient/PatientHeader";
import { Heart, ShieldCheck, PhoneCall, Lock, AlertTriangle, MapPin, Mail } from "lucide-react";
import { api } from "@/lib/api";

function PatientAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    const verifyPatientSession = async () => {
      const token = api.getToken();
      if (!token) {
        if (isMounted) {
          router.replace("/patient/login?redirect=" + encodeURIComponent(window.location.pathname));
        }
        return;
      }

      try {
        const user = await api.get<any>("/auth/me");
        if (!user || user.role !== "PATIENT") {
          if (isMounted) {
            if (user?.role === "DOCTOR") {
              router.replace("/doctor/cockpit");
            } else if (user?.role === "SUPER_ADMIN") {
              router.replace("/admin");
            } else if (user?.role === "HOSPITAL_ADMIN") {
              router.replace("/hospital-admin");
            } else {
              api.clearToken();
              router.replace("/patient/login");
            }
          }
          return;
        }
        if (isMounted) {
          setAuthorized(true);
        }
      } catch {
        if (isMounted) {
          api.clearToken();
          router.replace("/patient/login");
        }
      }
    };

    verifyPatientSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-800">Verifying secure patient access...</p>
        <p className="text-xs text-slate-500 mt-1">Please sign in to access your personal healthcare journey.</p>
      </div>
    );
  }

  return <>{children}</>;
}

function PatientLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [profilePending, setProfilePending] = useState(false);

  const isAuthRoute =
    pathname === "/patient/login" ||
    pathname === "/patient/register" ||
    pathname === "/patient/verify";

  useEffect(() => {
    if (isAuthRoute) return;
    api.get<any>("/auth/me")
      .then((user) => {
        if (user && user.profile_completed === false) {
          setProfilePending(true);
        }
      })
      .catch(() => {});
  }, [isAuthRoute]);

  // Public Patient Authentication Pages render cleanly without the internal dashboard header/footer
  if (isAuthRoute) {
    return <main className="min-h-screen bg-[#e1f2f6]">{children}</main>;
  }

  return (
    <PatientAuthGuard>
      <div className="min-h-screen bg-slate-50/50 flex flex-col text-slate-900 transition-colors">
        {profilePending && (
          <div className="bg-amber-500 text-white px-4 py-2.5 text-xs sm:text-sm font-medium flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Your CareFlow profile is incomplete. Complete your details for auto-calculated age and verified doctor appointments.</span>
            </div>
            <Link
              href="/patient/profile/setup"
              className="bg-white text-amber-900 px-3.5 py-1 rounded-lg font-bold text-xs hover:bg-amber-50 transition shrink-0 ml-3 shadow-xs"
            >
              Complete Profile
            </Link>
          </div>
        )}
        <PatientHeader />
        <main className="flex-1 pb-16">{children}</main>

        {/* Calm, Accessible Patient Footer */}
        <footer className="bg-white border-t border-slate-200 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
              
              {/* Brand & Purpose */}
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <Heart className="w-4 h-4 fill-white/20" />
                  </div>
                  <span className="font-black text-lg text-slate-900">CareFlow Patient Care</span>
                </div>
                <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                  {t("patient.subtitle", "Connecting every stage of your healthcare journey: doctor discovery, appointments, smart check-in, real-time queues, digital prescriptions, diagnostic lab reports, and DPDP-compliant longitudinal records.")}
                </p>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-700 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Ayushman Bharat Digital Mission (ABDM) & DPDP Compliant</span>
                </div>
              </div>

              {/* Patient Navigation */}
              <div className="space-y-2 text-xs">
                <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  {t("patient.quick_actions", "My Healthcare")}
                </div>
                <ul className="space-y-1.5 text-slate-600 font-medium">
                  <li>
                    <Link href="/patient/dashboard" className="hover:text-emerald-700 transition-colors">
                      {t("nav.dashboard", "Patient Dashboard")}
                    </Link>
                  </li>
                  <li>
                    <Link href="/patient/appointments" className="hover:text-emerald-700 transition-colors">
                      {t("patient.my_appointments", "My Appointments & Booking")}
                    </Link>
                  </li>
                  <li>
                    <Link href="/patient/journey" className="hover:text-emerald-700 transition-colors">
                      {t("patient.my_care_journey", "My Longitudinal Care Journey")}
                    </Link>
                  </li>
                  <li>
                    <Link href="/patient/consent" className="hover:text-emerald-700 transition-colors">
                      {t("patient.consent_privacy", "DPDP Consent & Privacy Center")}
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Emergency & Reception Desk Info */}
              <div className="space-y-2 text-xs p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
                <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Hospital Assistance & Desk #1</span>
                </div>
                <p className="text-xs text-emerald-900 leading-tight">
                  For priority reception or queue guidance, visit <strong>Desk #1</strong> in the hospital lobby.
                </p>
                <div className="pt-1 flex items-center gap-1.5 text-[11px] text-rose-700 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Emergency: Call 112 immediately</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
              <p>&copy; {new Date().getFullYear()} CareFlow Health Systems. All rights reserved.</p>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  End-to-End Encrypted Health Records
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </PatientAuthGuard>
  );
}

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <AccessibilityProvider>
        <PatientLayoutContent>{children}</PatientLayoutContent>
      </AccessibilityProvider>
    </LanguageProvider>
  );
}
