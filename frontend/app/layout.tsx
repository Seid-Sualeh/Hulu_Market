import type { Metadata, Viewport } from "next";
import AppLayout from "../components/layout/AppLayout";
import PwaRegister from "../components/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hulu Market - Social Media Channels & Marketplace",
  description: "Hulu Market - Ethiopia's premier digital & physical marketplace",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hulu Market",
  },
  icons: {
    apple: "/auth-page.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0f14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/auth-page.png" />
      </head>
      <body className="min-h-screen bg-[#0b0f14] text-slate-100 antialiased selection:bg-teal-500 selection:text-black">
        <PwaRegister />
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
