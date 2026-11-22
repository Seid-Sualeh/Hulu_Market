"use client";

import { useEffect, useState } from "react";
import { fetchBackend } from "@/lib/api";

export interface AuthUser {
  id?: number | string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  balance?: number;
  token?: string;
  role?: string;
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

export function isUserAdmin(): boolean {
  const user = getAuthUser();
  return Boolean(user && user.signedIn && user.role === "admin");
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

export function signInUser(
  email: string,
  name?: string,
  phone?: string,
  token?: string,
  id?: number | string,
  balance?: number,
  role = "user"
): void {
  if (typeof window === "undefined") return;
  const user: AuthUser = {
    id,
    email,
    name: name || email.split("@")[0] || "User",
    phone: phone || "",
    token,
    balance: balance ?? 0,
    role,
    signedIn: true,
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  if (token) {
    localStorage.setItem("hulu_token", token);
  }
  window.dispatchEvent(new Event("hulu_auth_state_changed"));
}

export function signOutUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem("hulu_token");
  window.dispatchEvent(new Event("hulu_auth_state_changed"));
}

export async function refreshUser(): Promise<AuthUser | null> {
  if (typeof window === "undefined") return null;
  const current = getAuthUser();
  if (!current || !current.id) return current;
  try {
    const res = await fetchBackend(`user/profile?userId=${current.id}`);
    const data = await res.json();
    if (data.success && data.user) {
      const updated: AuthUser = {
        ...current,
        balance: Number(data.user.balance) || 0,
        role: data.user.role || current.role,
        name: `${data.user.first_name} ${data.user.last_name}`.trim() || current.name,
        phone: data.user.phone || current.phone,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("hulu_auth_state_changed"));
      return updated;
    }
  } catch {
    // Ignore network error in background refresh
  }
  return current;
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

    // Check remote balance on load if signed in
    refreshUser();

    window.addEventListener("hulu_auth_state_changed", syncState);
    window.addEventListener("storage", syncState);
    return () => {
      window.removeEventListener("hulu_auth_state_changed", syncState);
      window.removeEventListener("storage", syncState);
    };
  }, []);

  return { signedIn, user, mounted, refreshUser };
}
