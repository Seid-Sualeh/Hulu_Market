import type { Metadata } from "next";
import MobileSidebar from "../components/layout/MobileSidebar";
import Sidebar from "../components/layout/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hulu Market",
  description: "Hulu Market application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0b0f14] text-slate-100 antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="min-w-0 flex-1 px-5 pb-10 pt-20 lg:px-10 lg:py-10">
            {children}
          </div>
        </div>
        <MobileSidebar />
      </body>
    </html>
  );
}
