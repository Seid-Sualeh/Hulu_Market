"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import DashboardView from "./dashboard/DashboardView";
import SocialMediaPage from "./social-media/page";

export default function RootPage() {
  const router = useRouter();
  const { signedIn, mounted } = useAuth();

  useEffect(() => {
    if (mounted && !signedIn) {
      router.replace("/social-media");
    }
  }, [mounted, signedIn, router]);

  if (!mounted) {
    return <div className="min-h-screen bg-[#0b0f17]" />;
  }

  // Without sign-in, Dashboard MUST NOT DISPLAY - render marketplace matching reference image
  if (!signedIn) {
    return <SocialMediaPage />;
  }

  // Only logged in users see the private dashboard
  return <DashboardView />;
}
