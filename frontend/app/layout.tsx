import type { Metadata } from "next";
import MobileSidebar from "../components/layout/MobileSidebar";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hulu Market - Social Media Channels & Marketplace",
  description: "Hulu Market - Ethiopia's premier digital & physical marketplace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0b0f14] text-slate-100 antialiased selection:bg-teal-500 selection:text-black">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="min-w-0 flex-1 flex flex-col">
            <Header />
            <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </div>
        <MobileSidebar />
      </body>
    </html>
  );
}
