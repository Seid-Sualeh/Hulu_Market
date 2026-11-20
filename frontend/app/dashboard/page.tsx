"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import DashboardView from "./DashboardView";

export default function DashboardPage() {
  const router = useRouter();
  const { user, signedIn, mounted } = useAuth();

  useEffect(() => {
    if (mounted) {
      if (!signedIn) {
        router.replace("/auth?redirect=/dashboard");
      } else if (user?.role === "admin") {
        // Admin dashboard is the Admin Control page (/admin)
        router.replace("/admin");
      }
    }
  }, [mounted, signedIn, user?.role, router]);

  // If not logged in, or if user is admin, user Dashboard MUST NOT DISPLAY
  if (!mounted || !signedIn || user?.role === "admin") {
    return null;
  }

  return <DashboardView />;
}
