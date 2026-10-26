"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import CommandPalette from "@/components/admin/CommandPalette";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // If this is the dedicated admin login page, render cleanly without the admin shell
  if (pathname === "/admin/login" || pathname?.startsWith("/admin/login")) {
    return <>{children}</>;
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
        <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0 md:pl-64">
          <AdminHeader
            onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
            onOpenCommandPalette={() => setPaletteOpen(true)}
          />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            {children}
          </main>
        </div>
        <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </AdminGuard>
  );
}
