"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import DashboardView from "./dashboard/DashboardView";
import AuthPage from "./auth/page";

export default function RootPage() {
  const router = useRouter();
  const { user, signedIn, mounted } = useAuth();

  useEffect(() => {
    if (mounted) {
      if (!signedIn) {
        router.replace("/auth");
      } else if (user?.role === "admin") {
        // Admin root landing is the Admin Control page (/admin)
        router.replace("/admin");
      }
    }
  }, [mounted, signedIn, user?.role, router]);

  if (!mounted) {
    return <div className="min-h-screen bg-[#0b0f17]" />;
  }

  // Without sign-in, the first page displayed MUST BE the Auth Page
  if (!signedIn) {
    return <AuthPage />;
  }

  // Admin users are redirected to Admin Control (/admin)
  if (user?.role === "admin") {
    return null;
  }

  // Only logged in regular users see the private user dashboard
  return <DashboardView />;
}
