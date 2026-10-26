"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/patient/register");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#e1f2f6] flex flex-col items-center justify-center p-4 text-center">
      <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-sm font-bold text-slate-800">Redirecting to Dedicated Patient Registration...</p>
      <Link href="/patient/register" className="text-xs text-teal-700 font-bold hover:underline mt-2">
        Click here if not redirected automatically &rarr;
      </Link>
    </div>
  );
}
