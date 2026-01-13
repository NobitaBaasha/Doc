import { queryClient } from "./queryClient";

// Helper to get token
export function getToken() {
  return localStorage.getItem("token");
}

// Wrapper for fetch that adds Auth header
export async function authFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Only set JSON content type if body is present and not FormData
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    // Clear token and redirect if unauthorized
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || res.statusText);
  }

  return res;
}
