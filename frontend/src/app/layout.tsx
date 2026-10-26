import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "CareFlow — Unified Healthcare Operating & Journey Coordination Platform",
  description:
    "Unified, consent-driven healthcare journey platform coordinating discovery, appointments, smart check-in, live queue, clinical encounters, cryptographic prescriptions, and DPDP-compliant longitudinal records.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+Devanagari:wght@400;500;600;700;800;900&family=Noto+Sans+Bengali:wght@400;500;600;700;800&family=Noto+Sans+Tamil:wght@400;500;600;700;800&family=Noto+Sans+Telugu:wght@400;500;600;700;800&family=Noto+Sans+Gujarati:wght@400;500;600;700;800&family=Noto+Sans+Kannada:wght@400;500;600;700;800&family=Noto+Sans+Malayalam:wght@400;500;600;700;800&family=Noto+Sans+Gurmukhi:wght@400;500;600;700;800&family=Noto+Sans+Oriya:wght@400;500;600;700;800&family=Noto+Nastaliq+Urdu:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
