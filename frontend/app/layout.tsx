import type { Metadata } from "next";
import AppLayout from "../components/layout/AppLayout";
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
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
