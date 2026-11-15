"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOutUser } from "@/lib/auth";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    signOutUser();
    router.replace("/auth");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center text-slate-400 text-sm">
      Signing out...
    </div>
  );
}
