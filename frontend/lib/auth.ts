"use client";

import { useEffect, useState } from "react";

export interface AuthUser {
  name: string;
  email: string;
  phone?: string;
  signedIn: boolean;
}

const AUTH_STORAGE_KEY = "hulu_user";

export function isUserSignedIn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed && parsed.signedIn);
  } catch {
    return false;
  }
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function signInUser(email: string, name = "Seid Sualih", phone = "+251929075365"): void {
  if (typeof window === "undefined") return;
  const user: AuthUser = {
    email,
    name,
    phone,
    signedIn: true,
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("hulu_auth_state_changed"));
}

export function signOutUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new Event("hulu_auth_state_changed"));
}

export function useAuth() {
  const [signedIn, setSignedIn] = useState<boolean>(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const syncState = () => {
      const u = getAuthUser();
      setUser(u);
      setSignedIn(Boolean(u && u.signedIn));
    };

    syncState();

    window.addEventListener("hulu_auth_state_changed", syncState);
    window.addEventListener("storage", syncState);
    return () => {
      window.removeEventListener("hulu_auth_state_changed", syncState);
      window.removeEventListener("storage", syncState);
    };
  }, []);

  return { signedIn, user, mounted };
}
