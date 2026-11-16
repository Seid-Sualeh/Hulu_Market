import type { Metadata, Viewport } from "next";
import AppLayout from "../components/layout/AppLayout";
import PwaRegister from "../components/PwaRegister";
import PwaInstallBanner from "../components/pwa/PwaInstallBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hulu Market - Everything You Need. One Marketplace.",
  description: "Everything You Need. One Marketplace.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hulu Market",
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
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
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className="min-h-screen bg-[#0b0f14] text-slate-100 antialiased selection:bg-teal-500 selection:text-black">
        <PwaRegister />
        <AppLayout>{children}</AppLayout>
        <PwaInstallBanner />
      </body>
    </html>
  );
}
