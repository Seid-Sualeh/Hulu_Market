"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileSidebar from "./MobileSidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const { signedIn, mounted } = useAuth();

  // Check if current route is an authentication or login flow route
  const isAuthPage =
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname === "/signin" ||
    pathname.startsWith("/signin/") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/") ||
    pathname === "/logout" ||
    (pathname === "/" && (!mounted || !signedIn));

  if (isAuthPage) {
    return (
      <main className="min-h-screen w-full bg-[#0b0f17]">
        {children}
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="min-w-0 flex-1 flex flex-col">
        <Header />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
      <MobileSidebar />
    </div>
  );
}
