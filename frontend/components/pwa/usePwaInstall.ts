"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Global variable so it persists across navigation
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

export function usePwaInstall() {
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [canPrompt, setCanPrompt] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);
  const [showDesktopGuide, setShowDesktopGuide] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already in standalone (installed) mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes("android-app://");

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check local storage record
    if (localStorage.getItem("pwa_installed") === "true") {
      setIsInstalled(true);
      return;
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (globalDeferredPrompt) {
      setCanPrompt(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      globalDeferredPrompt = e as BeforeInstallPromptEvent;
      setCanPrompt(true);
      setIsInstalled(false);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanPrompt(false);
      globalDeferredPrompt = null;
      localStorage.setItem("pwa_installed", "true");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (globalDeferredPrompt) {
      try {
        await globalDeferredPrompt.prompt();
        const choice = await globalDeferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
          localStorage.setItem("pwa_installed", "true");
        }
        globalDeferredPrompt = null;
        setCanPrompt(false);
      } catch (err) {
        console.debug("Install prompt error:", err);
      }
      return;
    }

    if (isIOS) {
      setShowIosGuide(true);
    } else {
      setShowDesktopGuide(true);
    }
  };

  return {
    isInstalled,
    canPrompt,
    isIOS,
    showIosGuide,
    setShowIosGuide,
    showDesktopGuide,
    setShowDesktopGuide,
    installApp,
  };
}
