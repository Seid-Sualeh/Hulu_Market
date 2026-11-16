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
 * Perform a fetch against the backend service.
 */
export async function fetchBackend(path: string, init?: RequestInit): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  
  // If baseUrl already ends with /api or similar, handle smoothly
  const separator = baseUrl.endsWith("/") ? "" : "/";
  const url = `${baseUrl}${separator}${cleanPath}`;
  
  return fetch(url, init);
}
