"use client";

import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center mb-4">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
        Page Not Found
      </h1>
      <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
        The requested healthcare portal resource, doctor registry entry, or administration route does not exist.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shadow-md"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Home Portal</span>
      </Link>
    </div>
  );
}
