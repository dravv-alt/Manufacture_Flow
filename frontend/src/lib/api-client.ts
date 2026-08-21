export type FrontendRuntimeMode = "live" | "demo";
const apiBaseUrls: Record<FrontendRuntimeMode, string> = {
  live: (process.env.NEXT_PUBLIC_LIVE_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001").replace(/\/$/, ""),
  demo: (process.env.NEXT_PUBLIC_DEMO_API_BASE_URL ?? "http://localhost:3002").replace(/\/$/, ""),
};
let activeRuntime: FrontendRuntimeMode = "live";

export function setApiRuntime(mode: FrontendRuntimeMode) { activeRuntime = mode; }
export function getApiRuntime() { return activeRuntime; }
export function getApiBaseUrl(mode: FrontendRuntimeMode = activeRuntime) { return apiBaseUrls[mode]; }

export function apiFetch(path: string, init?: RequestInit, mode: FrontendRuntimeMode = activeRuntime) {
  return fetch(`${getApiBaseUrl(mode)}${path}`, {
    ...init,
    credentials: "include",
    cache: init?.cache ?? "no-store",
  });
}
