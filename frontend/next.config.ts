import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  // Enable PWA support
  pwa: {
    dest: "public",
    register: true,
    skipWaiting: true,
    // Disable PWA in development for faster builds
    disable: process.env.NODE_ENV === "development",
  },
  // Add other Next.js config options as needed
};

export default withPWA(nextConfig);
