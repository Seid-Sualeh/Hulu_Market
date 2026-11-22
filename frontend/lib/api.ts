/**
 * Helper to get the base API URL whether running on the server or in the browser.
 * In browser production (Vercel / live domain), connects directly to Render backend with CORS.
 * In local development, routes through local proxy '/api' or localhost:4001.
 */
export function getApiBaseUrl(): string {
  // If explicitly configured via env var, prioritize it
  const explicit =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL;

  if (explicit) {
    const clean = explicit.replace(/\/api\/?$/, "").replace(/\/$/, "");
    return `${clean}/api`;
  }

  // In the browser:
  if (typeof window !== "undefined") {
    // If running on production domain (e.g. hulu-market.vercel.app or any non-localhost host)
    if (
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      return "https://hulu-market-backend.onrender.com/api";
    }
    return "/api";
  }

  // Server-side (SSR / API Route)
  if (process.env.NODE_ENV === "production") {
    return "https://hulu-market-backend.onrender.com/api";
  }
  return "http://localhost:4001/api";
}

/**
 * Resolve an uploaded image URL (like /uploads/upload-xxx.png) to a fully accessible URL.
 * Automatically points to the production Render backend in production.
 */
export function resolveImageUrl(path?: string | null): string {
  if (!path || typeof path !== "string") return "";
  const trimmed = path.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;

  const backendHost =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    (typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
      ? "https://hulu-market-backend.onrender.com"
      : process.env.NODE_ENV === "production"
      ? "https://hulu-market-backend.onrender.com"
      : "");

  return backendHost ? `${backendHost}/${cleanPath}` : `/${cleanPath}`;
}

/**
 * Perform a fetch against the backend service.
 * Automatically injects auth headers (x-user-role, x-user-id, Authorization) from localStorage.
 */
export async function fetchBackend(path: string, init?: RequestInit): Promise<Response> {
  const baseUrl = getApiBaseUrl().replace(/\/+$/, "");
  let cleanPath = path.startsWith("/") ? path.slice(1) : path;
  if (cleanPath.startsWith("api/")) {
    cleanPath = cleanPath.slice(4);
  }
  
  const url = `${baseUrl}/${cleanPath}`;
  
  const headers = new Headers(init?.headers);
  if (typeof window !== "undefined") {
    try {
      const rawUser = localStorage.getItem("hulu_user");
      if (rawUser) {
        const u = JSON.parse(rawUser);
        if (u?.role) {
          headers.set("x-user-role", u.role);
        }
        if (u?.id) {
          headers.set("x-user-id", String(u.id));
        }
      }
      const token = localStorage.getItem("hulu_token");
      if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    } catch {
      // Ignore parse errors
    }
  }

  return fetch(url, {
    ...init,
    headers,
  });
}
