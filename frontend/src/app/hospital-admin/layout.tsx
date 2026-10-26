"use client";

import React from "react";
import { LanguageProvider } from "@/context/LanguageContext";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { HospitalAdminGuard } from "@/components/hospital-admin/HospitalAdminGuard";
import { HospitalAdminHeader } from "@/components/hospital-admin/HospitalAdminHeader";
import { HospitalAdminSidebar } from "@/components/hospital-admin/HospitalAdminSidebar";

export default function HospitalAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AccessibilityProvider>
        <HospitalAdminGuard>
          <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
            <HospitalAdminHeader />
            <div className="flex-1 flex flex-col md:flex-row">
              <HospitalAdminSidebar />
              <main className="flex-1 p-4 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
                {children}
              </main>
            </div>
          </div>
        </HospitalAdminGuard>
      </AccessibilityProvider>
    </LanguageProvider>
  );
}
