export type FrontendRuntimeMode = "live" | "demo";

const backendMode = process.env.NEXT_PUBLIC_OPERATIONS_MODE === "backend";
function baseUrl(value: string | undefined, localFallback: string) {
  const configured = value?.trim().replace(/\/$/, "");
  return configured || (backendMode ? "" : localFallback);
}

const apiBaseUrls: Record<FrontendRuntimeMode, string> = {
  live: baseUrl(process.env.NEXT_PUBLIC_LIVE_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL, "http://localhost:3001"),
  demo: baseUrl(process.env.NEXT_PUBLIC_DEMO_API_BASE_URL, "http://localhost:3002"),
};
let activeRuntime: FrontendRuntimeMode = "live";

export function setApiRuntime(mode: FrontendRuntimeMode) { activeRuntime = mode; }
export function getApiRuntime() { return activeRuntime; }
export function getApiBaseUrl(mode: FrontendRuntimeMode = activeRuntime) {
  const base = apiBaseUrls[mode];
  if (!base) throw new Error((mode === "demo" ? "Demo" : "Live") + " API URL is not configured for backend mode.");
  return base;
}

export function apiFetch(path: string, init?: RequestInit, mode: FrontendRuntimeMode = activeRuntime) {
  return fetch(`${getApiBaseUrl(mode)}${path}`, {
    ...init,
    credentials: "include",
    cache: init?.cache ?? "no-store",
  });
}
