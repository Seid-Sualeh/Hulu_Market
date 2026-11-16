"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import DashboardView from "./dashboard/DashboardView";
import AuthPage from "./auth/page";

export default function RootPage() {
  const router = useRouter();
  const { signedIn, mounted } = useAuth();

  useEffect(() => {
    if (mounted && !signedIn) {
      router.replace("/auth");
    }
  }, [mounted, signedIn, router]);

  if (!mounted) {
    return <div className="min-h-screen bg-[#0b0f17]" />;
  }

  // Without sign-in, the first page displayed MUST BE the Auth Page
  if (!signedIn) {
    return <AuthPage />;
  }

  // Only logged in users see the private dashboard
  return <DashboardView />;
}
