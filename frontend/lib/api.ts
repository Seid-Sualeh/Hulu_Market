/**
 * Helper to get the base API URL whether running on the server or in the browser.
 * On the server (Vercel Functions/SSR), it uses the bound internal BACKEND_URL.
 * In the browser, it routes through the public rewrite prefix '/api'.
 */
export function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";
  }
  return process.env.NEXT_PUBLIC_API_URL || "/api";
}

/**
 * Resolve an uploaded image URL (like /uploads/upload-xxx.png) to a fully accessible URL.
 * Supports relative Next.js proxying (/uploads/...) or direct backend URL.
 */
export function resolveImageUrl(path?: string | null): string {
  if (!path || typeof path !== "string") return "";
  const trimmed = path.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return cleanPath;
}

/**
 * Perform a fetch against the backend service.
 * Automatically injects auth headers (x-user-role, x-user-id, Authorization) from localStorage.
 */
export async function fetchBackend(path: string, init?: RequestInit): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  
  // If baseUrl already ends with /api or similar, handle smoothly
  const separator = baseUrl.endsWith("/") ? "" : "/";
  const url = `${baseUrl}${separator}${cleanPath}`;
  
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
