"use client";
import { useEffect, useRef } from "react";
import { AlertTriangle, Radio } from "lucide-react";
import { useOperations } from "@/contexts/OperationsContext";
import { apiFetch } from "@/lib/api-client";

export function RuntimeBanner() {
  const { runtime, backendError, realtimeConnected, refresh, currentUser, demoScenario } = useOperations();
  const busy = useRef(false);
  useEffect(() => {
    if (runtime !== "demo" || !currentUser) return;
    const tick = async () => { if (busy.current || document.visibilityState === "hidden") return; busy.current = true; try { const response = await apiFetch("/api/demo-control/trigger-telemetry", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenario: demoScenario, mode: "tick" }) }, "demo"); if (response.ok) await refresh(); } finally { busy.current = false; } };
    void tick(); const timer = window.setInterval(() => void tick(), 10_000); return () => window.clearInterval(timer);
  }, [currentUser, demoScenario, refresh, runtime]);
  return <>{runtime === "demo" ? <div className="sticky top-0 z-[65] flex min-h-9 items-center justify-center gap-2 bg-amber-300 px-4 text-center text-[11px] font-bold tracking-[0.12em] text-black"><Radio className="size-3.5" />DEMO SANDBOX · SEPARATE DATABASE · SIMULATION TICK: 10s · {realtimeConnected ? "REALTIME CONNECTED" : "REALTIME RECONNECTING"}</div> : null}{backendError ? <div role="alert" className="sticky top-0 z-[66] flex min-h-11 flex-wrap items-center justify-center gap-3 bg-red-700 px-4 py-2 text-center text-sm text-white"><AlertTriangle className="size-4" /><span>Backend data unavailable: {backendError}. No business fixtures were substituted.</span><button onClick={() => void refresh()} className="rounded-full border border-white/40 px-3 py-1 text-xs font-semibold">Retry</button></div> : null}</>;
}
