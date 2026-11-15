"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import DashboardView from "./DashboardView";

export default function DashboardPage() {
  const router = useRouter();
  const { signedIn, mounted } = useAuth();

  useEffect(() => {
    if (mounted && !signedIn) {
      router.replace("/auth?redirect=/dashboard");
    }
  }, [mounted, signedIn, router]);

  // If not logged in, Dashboard MUST NOT DISPLAY
  if (!mounted || !signedIn) {
    return null;
  }

  return <DashboardView />;
}
