"use client";

import { Bell, Check, CloudSun, Clock3, Layers3, LocateFixed, MapPin, MailWarning, RefreshCw, Route, Search, Send, Truck, ZoomIn, ZoomOut } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOperations } from "@/contexts/OperationsContext";
import { demoShipmentRoute, demoShipmentStates, demoShipmentSchedules, type ShipmentState } from "@/demo-data/ws102-scenario";
import { cn } from "@/lib/utils";

export function ShipmentControl() {
  const { state: operationsState, runWorkflowCommand, commandError, clearCommandError, activeCase, runtime } = useOperations();
  const state = operationsState.shipmentState;
  const setState = (shipmentState: ShipmentState) => runWorkflowCommand({ type: "set_shipment_state", state: shipmentState });
  const states = demoShipmentStates;
  const notificationLog = state === "notified" ? ["Shipment Team · delivered", "Logistics Desk · delivered", "Customer Service · delivered"] : state === "failed" ? ["Shipment Team · delivered", "Logistics Desk · failed", "Customer Service · delivered"] : [];
  const current = states[state];
  const delayed = state === "delayed";
  const persistedImpact = activeCase?.shipmentImpacts[0];
  const estimate = activeCase?.recoveryTimeEstimates[0];
  const formatTime = (value: string) => new Date(value).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const schedule = persistedImpact ? {
    completion: estimate ? formatTime(estimate.expectedRecoveryAt) : "Recovery estimate unavailable",
    shipment: formatTime(persistedImpact.revisedEta),
    delay: `${Math.round((persistedImpact.delayMinutes ?? 0) / 60 * 10) / 10}h`
  } : {
    completion: delayed ? demoShipmentSchedules.delayed.completion : demoShipmentSchedules.revised.completion,
    shipment: delayed ? demoShipmentSchedules.delayed.shipment : demoShipmentSchedules.revised.shipment,
    delay: delayed ? demoShipmentSchedules.delayed.delay : demoShipmentSchedules.revised.delay,
  };

  const originalSchedule = persistedImpact ? {
    completion: "Original production plan",
    shipment: formatTime(persistedImpact.originalEta),
    delay: "0h"
  } : demoShipmentSchedules.original;

  const notify = () => setState("notified");
  const fail = () => setState("failed");

  return (
    <main className="px-5 py-7 md:px-8 md:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="flex flex-col gap-5 border-b border-border pb-7">
          <div className="flex flex-wrap items-center gap-3"><Badge variant="outline">CONTROLLED DATA</Badge><span className="font-mono text-xs text-muted-foreground">SHIPMENT IMPACT / SO-8841 / WS-102 RECOVERY</span></div>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div className="max-w-3xl"><h1 className="font-heading text-4xl font-semibold tracking-[-0.04em] md:text-5xl">Keep the delivery commitment visible.</h1><p className="mt-3 text-base leading-7 text-muted-foreground">Compare original and revised production timing before stakeholder notifications are sent. Customer-facing communication remains a preview.</p></div><Badge variant={current.badge}>{current.label}</Badge></div>
        </section>

        <ShipmentSignal delayed={delayed} shipment={schedule.shipment} delay={schedule.delay} />

        {commandError ? <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive"><span>{commandError}</span><button className="underline" onClick={clearCommandError}>Dismiss</button></div> : null}
        <ShipmentNavigator state={state} shipment={schedule.shipment} delay={schedule.delay} onStateChange={setState} />

        <ShipmentCoreMap state={state} shipment={schedule.shipment} delayed={delayed} runtime={runtime} impacts={activeCase?.shipmentImpacts ?? []} jobs={activeCase?.productionJobs ?? []} />

        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Card><CardHeader><CardTitle className="font-heading">Commitment comparison</CardTitle><CardDescription>SO-8841 is linked to J1001, J1002, and J1003 after WS-102 containment.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><Schedule title="Original commitment" completion="09-Aug / 14:00" shipment="09-Aug / 18:00" delay="0h" /><Schedule title="Revised recovery plan" completion={schedule.completion} shipment={schedule.shipment} delay={schedule.delay} revised /></CardContent></Card>
          <Card><CardHeader><CardTitle className="font-heading">Impact context</CardTitle><CardDescription>Why the schedule changed.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4"><Item label="Failure case" value="FC-2026-0047 / WS-102 bearing risk" /><Item label="Rerouting plan" value="J1001 + J1002 → WS-105; J1003 → WS-108" /><Item label="Recovery assumption" value={delayed ? "Vendor bearing scenario" : "Local bearing scenario"} /><Item label="Delivery risk" value={delayed ? "Delayed / notify stakeholders" : "Revised / review notification"} /></CardContent></Card>
        </section>

        <ShipmentImpactTimeline original={originalSchedule} revised={schedule} delayed={delayed} />

        <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div><CardTitle className="font-heading">Notification center</CardTitle><CardDescription>{current.description}</CardDescription></div><span className="flex items-center gap-2 font-mono text-xs text-muted-foreground"><Clock3 className="size-4" /> Controlled delivery state</span></div></CardHeader><CardContent className="flex flex-col gap-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(["no-impact", "revised", "delayed", "notification-pending", "notified", "failed"] as ShipmentState[]).map((option) => <button key={option} onClick={() => setState(option)} className={cn("rounded-md border p-4 text-left transition-colors", state === option ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted")}><span className="font-mono text-xs">{states[option].label}</span><span className="mt-2 block text-sm">{states[option].description}</span></button>)}</div><div className="flex flex-wrap gap-3"><Button onClick={notify}><Send data-icon="inline-start" />Confirm stakeholder delivery</Button><Button variant="outline" onClick={fail}><MailWarning data-icon="inline-start" />Simulate failed channel</Button><Button variant="outline" onClick={() => setState("notification-pending")}><Bell data-icon="inline-start" />Mark notification pending</Button></div>{notificationLog.length > 0 ? <div className="grid gap-2 md:grid-cols-3">{notificationLog.map((entry) => <div key={entry} className="flex items-center gap-2 rounded-md bg-muted p-3 font-mono text-xs"><Check className={cn("size-4", entry.includes("failed") && "text-destructive")} />{entry}</div>)}</div> : <p className="font-mono text-xs text-muted-foreground">No external communication has been sent by this demo.</p>}</CardContent></Card>

        <Card><CardHeader><CardTitle className="font-heading">Customer communication preview</CardTitle><CardDescription>Preview only. No external customer delivery integration is configured.</CardDescription></CardHeader><CardContent><div className="rounded-md border border-border bg-muted p-5"><p className="text-sm font-semibold">Subject: Updated production timing for SO-8841</p><p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">We are reviewing a controlled production recovery plan. The current revised shipment estimate is {schedule.shipment}. This preview is not sent externally.</p></div></CardContent></Card>
      </div>
    </main>
  );
}

function ShipmentCoreMap({ state, shipment, delayed, runtime, impacts, jobs }: { state: ShipmentState; shipment: string; delayed: boolean; runtime: "live" | "demo"; impacts: NonNullable<ReturnType<typeof useOperations>["activeCase"]>["shipmentImpacts"]; jobs: NonNullable<ReturnType<typeof useOperations>["activeCase"]>["productionJobs"] }) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [activeWaypoint, setActiveWaypoint] = useState<number | null>(null);

  // Geographic route coordinates for the industrial recovery corridor
  const route = demoShipmentRoute;
  const corridorWaypoints = [
    { ...route.origin, coords: "18.52° N, 73.85° E", distance: "0 km", status: "Departed", eta: "08:30" },
    { ...route.checkpoints[0], coords: "19.99° N, 73.78° E", distance: "210 km", status: "In Transit", eta: "13:15" },
    { ...route.checkpoints[1], coords: "20.25° N, 74.12° E", distance: "355 km", status: delayed ? "Delayed Handoff" : "On Schedule", eta: shipment },
  ];

  // Synthesize baseline impact if active recovery has not yet generated one
  const resolvedImpacts = impacts.length > 0 ? impacts : [
    {
      externalId: "SO-8841",
      state: state === "no-impact" ? "original" : state === "notification-pending" ? "notification_pending" : state,
      originalEta: "2026-08-21T20:00:00.000Z",
      revisedEta: delayed ? "2026-08-22T20:00:00.000Z" : "2026-08-22T02:00:00.000Z",
      classification: delayed ? "DELAYED" : "AT_RISK",
      delayMinutes: delayed ? 1440 : 360,
      affectedJobIds: ["J1001", "J1002"],
      rationale: null,
      deltaHours: delayed ? 24 : 6,
    } as unknown as NonNullable<ReturnType<typeof useOperations>["activeCase"]>["shipmentImpacts"][number],
  ];

  const [selectedId, setSelectedId] = useState(resolvedImpacts[0]?.externalId ?? "SO-8841");
  const filtered = useMemo(() => resolvedImpacts.filter((impact) => `${impact.externalId} ${impact.classification ?? ""}`.toLowerCase().includes(query.toLowerCase()) && (filter === "all" || impact.classification === filter)), [filter, resolvedImpacts, query]);
  const selected = resolvedImpacts.find((impact) => impact.externalId === selectedId) ?? filtered[0] ?? resolvedImpacts[0];
  const resetView = () => { setZoom(1); setOffset({ x: 0, y: 0 }); };

  return (
    <section
      data-story="shipment-impact"
      className="overflow-hidden rounded-[2rem] border border-[#d8d1ca] bg-white shadow-[0_24px_50px_rgba(0,0,0,0.07)]"
    >
      <header className="flex flex-col gap-4 border-b border-[#e5dfd9] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] font-bold tracking-[0.16em] text-emerald-700">
              SUPPLY CHAIN CORRIDOR · WESTERN MANUFACTURING ZONE
            </p>
          </div>
          <h2 className="mt-1 text-2xl font-semibold">Production-to-Delivery GIS Highway</h2>
          <p className="mt-1 text-sm text-[#716b66]">
            Pune Vendor Hub → Nashik Cross-Dock → Plant Alpha WS-102 Delivery Corridor (355 km)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <MapButton label="Zoom in" onClick={() => setZoom((value) => Math.min(2.0, value + 0.2))}>
            <ZoomIn />
          </MapButton>
          <MapButton label="Zoom out" onClick={() => setZoom((value) => Math.max(0.7, value - 0.2))}>
            <ZoomOut />
          </MapButton>
          <MapButton label="Reset view" onClick={resetView}>
            <RefreshCw />
          </MapButton>
          <MapButton label="Fit corridor" onClick={() => { setZoom(1.1); setOffset({ x: 0, y: 0 }); }}>
            <LocateFixed />
          </MapButton>
        </div>
      </header>

      <div className="grid min-h-[34rem] lg:grid-cols-[1fr_340px]">
        {/* Vector Industrial GIS Map Canvas */}
        <div
          className="relative min-h-[30rem] cursor-grab select-none overflow-hidden bg-[#181716] active:cursor-grabbing"
          onPointerDown={(event) => setDrag({ x: event.clientX - offset.x, y: event.clientY - offset.y })}
          onPointerMove={(event) => { if (drag) setOffset({ x: event.clientX - drag.x, y: event.clientY - drag.y }); }}
          onPointerUp={() => setDrag(null)}
          onPointerLeave={() => setDrag(null)}
        >
          {/* Subtle GIS Radar Grid Background */}
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage: "radial-gradient(#4a453f 1px, transparent 1px), linear-gradient(to right, #2a2724 1px, transparent 1px), linear-gradient(to bottom, #2a2724 1px, transparent 1px)",
              backgroundSize: "24px 24px, 120px 120px, 120px 120px",
            }}
          />

          {/* Regional Contour Rings */}
          <div
            className="absolute inset-0 size-full transition-transform duration-200"
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
          >
            <svg viewBox="0 0 800 500" className="size-full" preserveAspectRatio="xMidYMid meet">
              {/* Regional Terrain & Elevation Contours */}
              <defs>
                <linearGradient id="corridorGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.8" />
                  <stop offset="100%" stopColor={delayed ? "#f87171" : "#10b981"} stopOpacity="0.9" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Topographic Area Contours */}
              <path
                d="M 60 420 Q 200 380 280 320 T 480 220 T 720 120"
                fill="none"
                stroke="#2a2724"
                strokeWidth="60"
                strokeLinecap="round"
                opacity="0.4"
              />
              <path
                d="M 90 440 Q 220 390 310 330 T 510 230 T 740 130"
                fill="none"
                stroke="#35312d"
                strokeWidth="24"
                strokeLinecap="round"
                opacity="0.3"
              />

              {/* Highway Corridor Buffer Zone */}
              <path
                d="M 120 400 Q 220 350 360 270 T 640 140"
                fill="none"
                stroke="#3f3b36"
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray="4 6"
              />

              {/* Main Arterial Route: Pune -> Nashik -> Plant Alpha */}
              <path
                d="M 120 400 Q 220 350 360 270 T 640 140"
                fill="none"
                stroke="url(#corridorGradient)"
                strokeWidth="5"
                strokeLinecap="round"
                filter="url(#glow)"
              />

              {/* Animated Route Flow Pulse */}
              <path
                d="M 120 400 Q 220 350 360 270 T 640 140"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeDasharray="8 24"
                strokeLinecap="round"
                className="animate-pulse"
              />

              {/* Distance Callouts Along Highway */}
              <text x="210" y="325" fill="#a8a29e" fontSize="11" fontFamily="monospace" fontWeight="600">
                NH-60 · 210 km
              </text>
              <text x="470" y="190" fill="#a8a29e" fontSize="11" fontFamily="monospace" fontWeight="600">
                SH-17 · 145 km
              </text>

              {/* Waypoint 1: Apex Motion Components (Pune) */}
              <g
                className="cursor-pointer transition-transform hover:scale-110"
                onClick={() => setActiveWaypoint(0)}
                transform="translate(120, 400)"
              >
                <circle r="22" fill="#10b981" fillOpacity="0.15" className="animate-ping" />
                <circle r="12" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
                <circle r="4" fill="#ffffff" />
                <text x="-70" y="32" fill="#f5f5f4" fontSize="12" fontWeight="700">
                  Apex Motion Hub (Pune)
                </text>
                <text x="-70" y="47" fill="#a8a29e" fontSize="10" fontFamily="monospace">
                  18.52° N, 73.85° E · Dep. 08:30
                </text>
              </g>

              {/* Waypoint 2: Nashik Cross-Dock */}
              <g
                className="cursor-pointer transition-transform hover:scale-110"
                onClick={() => setActiveWaypoint(1)}
                transform="translate(360, 270)"
              >
                <circle r="18" fill="#38bdf8" fillOpacity="0.2" />
                <circle r="11" fill="#0284c7" stroke="#ffffff" strokeWidth="2.5" />
                <circle r="3.5" fill="#ffffff" />
                <text x="-50" y="-22" fill="#f5f5f4" fontSize="12" fontWeight="700">
                  Nashik Cross-Dock
                </text>
                <text x="-50" y="-9" fill="#a8a29e" fontSize="10" fontFamily="monospace">
                  19.99° N, 73.78° E · In Transit
                </text>
              </g>

              {/* Waypoint 3: Plant Alpha Receiving Dock */}
              <g
                className="cursor-pointer transition-transform hover:scale-110"
                onClick={() => setActiveWaypoint(2)}
                transform="translate(640, 140)"
              >
                <circle
                  r="24"
                  fill={delayed ? "#f87171" : "#10b981"}
                  fillOpacity="0.2"
                  className="animate-ping"
                />
                <circle
                  r="14"
                  fill={delayed ? "#dc2626" : "#059669"}
                  stroke="#ffffff"
                  strokeWidth="3"
                />
                <text x="-50" y="34" fill="#f5f5f4" fontSize="13" fontWeight="700">
                  Plant Alpha Receiving
                </text>
                <text
                  x="-50"
                  y="50"
                  fill={delayed ? "#fca5a5" : "#6ee7b7"}
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="600"
                >
                  WS-102 Dock · ETA {shipment}
                </text>
              </g>
            </svg>
          </div>

          {/* Floating Waypoint Detail Overlay */}
          {activeWaypoint !== null ? (
            <div className="absolute left-6 top-6 z-20 max-w-xs rounded-2xl border border-white/20 bg-[#252423]/95 p-4 text-white shadow-2xl backdrop-blur animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold tracking-widest text-amber-300">
                  WAYPOINT INSPECTION
                </span>
                <button
                  onClick={() => setActiveWaypoint(null)}
                  className="rounded px-1.5 py-0.5 text-xs text-white/60 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <h4 className="mt-1 font-bold text-sm">{corridorWaypoints[activeWaypoint].label}</h4>
              <p className="mt-0.5 text-xs text-white/70">{corridorWaypoints[activeWaypoint].detail}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-2 text-[10px] font-mono">
                <div>
                  <span className="text-white/50">COORDINATES</span>
                  <p className="text-white">{corridorWaypoints[activeWaypoint].coords}</p>
                </div>
                <div>
                  <span className="text-white/50">DISTANCE</span>
                  <p className="text-white">{corridorWaypoints[activeWaypoint].distance}</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Weather Window Overlay Pill */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2 rounded-full border border-white/15 bg-black/75 px-3.5 py-1.5 text-xs text-white backdrop-blur">
            <CloudSun className="size-4 text-amber-300" />
            <span className="font-semibold">{route.weather.temperature}</span>
            <span className="text-white/50">·</span>
            <span className="text-white/80">{route.weather.condition}</span>
          </div>

          {/* Status HUD Footer */}
          <div className="absolute bottom-4 left-4 z-10 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-black/80 px-3.5 py-1.5 font-mono text-[11px] font-semibold text-white backdrop-blur border border-white/10">
              CORRIDOR LENGTH: 355 KM · NH-60 ARTERIAL
            </span>
            <span className="rounded-full bg-emerald-950/80 px-3 py-1.5 font-mono text-[11px] text-emerald-300 backdrop-blur border border-emerald-500/30">
              CORRIDOR STATUS: {delayed ? "AT RISK (+24h DELAY)" : "FLOWING NORMAL"}
            </span>
          </div>
        </div>

        {/* Sidebar Controls & Impact Details */}
        <aside className="border-t border-[#e5dfd9] bg-[#fbfaf8] p-5 lg:border-l lg:border-t-0">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#716b66]" />
            <span className="sr-only">Search shipments</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search shipment or status"
              className="h-11 w-full rounded-xl border border-[#ddd6ce] bg-white pl-10 pr-3 text-sm focus:border-black focus:outline-none"
            />
          </label>
          <div className="mt-3 flex gap-2">
            <select
              aria-label="Shipment status filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="h-10 flex-1 rounded-xl border border-[#ddd6ce] bg-white px-3 text-xs"
            >
              <option value="all">All statuses</option>
              <option value="ON_TIME">On time</option>
              <option value="AT_RISK">At risk</option>
              <option value="DELAYED">Delayed</option>
            </select>
          </div>
          <div className="mt-4 space-y-2">
            {filtered.map((impact) => (
              <button
                key={impact.externalId}
                onClick={() => setSelectedId(impact.externalId)}
                className={cn(
                  "w-full rounded-xl border p-3 text-left transition-colors",
                  selected.externalId === impact.externalId
                    ? "border-black bg-black text-white"
                    : "border-[#ddd6ce] bg-white hover:bg-[#f2ede8]"
                )}
              >
                <span className="font-mono text-xs font-bold">{impact.externalId}</span>
                <span className="mt-1 block text-xs opacity-70">
                  {impact.classification ?? impact.state} · {impact.delayMinutes ?? 0} min
                </span>
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-2xl bg-[#252423] p-4 text-white">
            <p className="text-[10px] font-bold tracking-[0.12em] text-amber-300">SELECTED IMPACT</p>
            <h3 className="mt-2 font-mono text-lg">{selected.externalId}</h3>
            <dl className="mt-4 space-y-3 text-xs">
              <MapDetail label="Original commitment" value={new Date(selected.originalEta).toLocaleString()} />
              <MapDetail label="Revised projection" value={new Date(selected.revisedEta).toLocaleString()} />
              <MapDetail label="Classification" value={selected.classification ?? selected.state} />
              <MapDetail label="Delay" value={`${selected.delayMinutes ?? 0} minutes`} />
              <MapDetail
                label="Affected jobs"
                value={jobs.length > 0 ? jobs.map((job) => job.externalId).join(", ") : "J1001, J1002, J1003 (Line A CNC Batch)"}
              />
              <MapDetail
                label="Carrier & Freight Fleet"
                value="DHL Industrial Logistics · Volvo FH16 650 (MH-14-AZ-8921)"
              />
              <MapDetail
                label="Active Telematics"
                value="Speed: 64 km/h · Cargo Temp: 20.8°C · GPS Signal: Lock (12 Sats)"
              />
              <MapDetail
                label="Recovery dependency"
                value="Active recovery estimate + persisted reroute decisions"
              />
            </dl>
          </div>
          <div className="mt-4 rounded-xl border border-[#ddd6ce] bg-white p-3 text-xs text-[#716b66]">
            <strong className="text-[#292524]">Estimated arrival</strong>
            <span className="mt-1 block font-mono font-semibold text-[#1c1a19]">{shipment}</span>
            <span className="mt-2 block">State: {demoShipmentStates[state].label}</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) { return <button aria-label={label} title={label} onClick={onClick} className="grid size-11 cursor-pointer place-items-center rounded-xl border border-[#ddd6ce] bg-white transition-colors hover:bg-[#f1ece6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black [&_svg]:size-4">{children}</button>; }
function MapDetail({ label, value }: { label: string; value: string }) { return <div><dt className="text-white/50">{label}</dt><dd className="mt-0.5 leading-5 text-white/90">{value}</dd></div>; }

function Schedule({ title, completion, shipment, delay, revised = false }: { title: string; completion: string; shipment: string; delay: string; revised?: boolean }) { return <div className={cn("rounded-xl border p-5", revised ? "border-primary bg-muted" : "border-border")}><p className="text-sm font-semibold">{title}</p><div className="mt-4 flex flex-col gap-3"><Item label="Production completion" value={completion} /><Item label="Shipment date" value={shipment} /><Item label="Schedule delta" value={delay} /></div></div>; }
function ShipmentImpactTimeline({ original, revised, delayed }: { original: { completion: string; shipment: string; delay: string }; revised: { completion: string; shipment: string; delay: string }; delayed: boolean }) { return <section className="overflow-hidden rounded-[2rem] border border-[#ddd6ce] bg-white shadow-[0_20px_36px_rgba(0,0,0,0.035)]"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e1dbd5] bg-[#f7f3ef] p-6"><div><p className="text-[10px] font-bold tracking-[0.16em] text-[#716b66]">TIME &amp; COMMITMENT IMPACT</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Recovery impact timeline</h2></div><span className={delayed ? "rounded-full bg-rose-200 px-3 py-1.5 text-xs font-bold text-rose-800" : "rounded-full bg-amber-200 px-3 py-1.5 text-xs font-bold text-amber-900"}>{revised.delay} CHANGE</span></div><div className="grid gap-5 p-6 md:grid-cols-2"><TimelineLane title="Original commitment" completion={original.completion} shipment={original.shipment} tone="neutral" /><TimelineLane title="Revised recovery plan" completion={revised.completion} shipment={revised.shipment} tone={delayed ? "danger" : "warning"} /></div><div className="mx-6 mb-6 rounded-2xl bg-[#252423] px-5 py-4 text-[#faf7f3]"><div className="flex items-center gap-3"><Clock3 className="size-5 text-amber-300" /><div><p className="text-sm font-semibold">Delta from original promise: {revised.delay}</p><p className="mt-0.5 text-xs text-white/60">The selected recovery path determines the revised internal commitment.</p></div></div></div></section>; }
function ShipmentNavigator({ state, shipment, delay, onStateChange }: { state: ShipmentState; shipment: string; delay: string; onStateChange: (state: ShipmentState) => void }) { const delivered = state === "notified"; const blocked = state === "failed" || state === "delayed"; const stages = [{ label: "Recovery re-route", detail: "WS-102 work released", complete: true }, { label: "Internal commitment", detail: `${delay} projection recorded`, complete: state !== "no-impact" }, { label: "Stakeholder delivery", detail: delivered ? "Confirmation received" : blocked ? "Intervention required" : "Awaiting confirmation", complete: delivered }]; return <section className="grid overflow-hidden rounded-[2rem] border border-[#ddd6ce] bg-[#fbfaf8] shadow-[0_20px_36px_rgba(0,0,0,0.035)] lg:grid-cols-[0.82fr_1.18fr]"><div className="border-b border-[#e1dbd5] bg-white p-6 lg:border-b-0 lg:border-r"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[0.15em] text-[#716b66]">SHIPMENT NAVIGATOR</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">SO-8841</h2></div><LocateFixed className="size-5 text-[#0b825a]" /></div><p className="mt-3 text-sm text-[#716b66]">WS-102 recovery → customer commitment</p><div className="mt-6 rounded-2xl bg-[#252423] p-4 text-white"><p className="text-[10px] font-bold tracking-[0.1em] text-white/55">CURRENT ESTIMATE</p><p className="mt-2 font-mono text-base font-semibold">{shipment}</p><p className="mt-1 text-xs text-amber-300">Status: {demoShipmentStates[state].label}</p></div><div className="mt-4 flex gap-2"><button onClick={() => onStateChange("notification-pending")} className="min-h-10 flex-1 rounded-xl border border-[#ded8d1] bg-white px-3 text-xs font-semibold transition-colors hover:bg-[#f1ece6]">Review delivery</button><button onClick={() => onStateChange("notified")} className="min-h-10 flex-1 rounded-xl bg-[#0b825a] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#087052]">Confirm</button></div></div><div className="p-6"><div className="flex items-center gap-2"><Route className="size-4 text-[#716b66]" /><p className="text-sm font-semibold">Delivery checkpoints</p></div><ol className="mt-6 space-y-4">{stages.map((stage, index) => <li key={stage.label} className="flex gap-4"><span className={stage.complete ? "grid size-8 shrink-0 place-items-center rounded-full bg-emerald-700 text-white" : blocked && index === 2 ? "grid size-8 shrink-0 place-items-center rounded-full bg-rose-200 text-rose-800" : "grid size-8 shrink-0 place-items-center rounded-full bg-amber-200 text-amber-900"}>{stage.complete ? <Check className="size-4" /> : index + 1}</span><div className="min-w-0 flex-1 border-b border-[#e5dfd9] pb-4 last:border-0"><p className="text-sm font-semibold">{stage.label}</p><p className="mt-1 text-xs text-[#716b66]">{stage.detail}</p></div></li>)}</ol></div></section>; }
function ShipmentRouteWeather({ state, shipment, delayed }: { state: ShipmentState; shipment: string; delayed: boolean }) {
  const route = demoShipmentRoute;
  const allPoints = [route.origin, ...route.checkpoints];
  const finalTone = delayed ? "bg-rose-400" : "bg-emerald-500";

  return <section className="overflow-hidden rounded-[2rem] border border-[#ddd6ce] bg-white shadow-[0_20px_36px_rgba(0,0,0,0.035)]">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e5dfd9] bg-[#fbfaf8] p-6">
      <div><div className="flex items-center gap-2"><MapPin className="size-4 text-[#0b825a]" /><p className="text-[10px] font-bold tracking-[0.15em] text-[#716b66]">ROUTE &amp; WEATHER CONTEXT</p></div><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Recovery delivery corridor</h2><p className="mt-2 max-w-2xl text-sm text-[#716b66]">Dedicated NH-60 expressway freight corridor · Pune Hub → Nashik Facility → Plant Alpha dock.</p></div>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] font-bold tracking-[0.08em] text-emerald-600 dark:text-emerald-400"><span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />CARRIER TELEMATICS ACTIVE</span>
    </div>
    <div className="grid lg:grid-cols-[1.35fr_0.65fr]">
      <div className="min-h-[19rem] bg-[#f4f1ed] p-5 sm:p-7"><div className="relative h-[16rem] overflow-hidden rounded-[1.35rem] border border-[#ded8d1] bg-[#eeeae4]" aria-label="Controlled route schematic from Apex Motion Components to Plant Alpha"><div className="absolute inset-0 opacity-60" style={{ backgroundImage: "radial-gradient(#cfc8c0 1px, transparent 1px)", backgroundSize: "18px 18px" }} /><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden="true"><path d="M16 72 C27 66 32 57 43 48 S64 38 77 28" fill="none" stroke="#c8c1b9" strokeWidth="4" strokeLinecap="round" /><path d="M16 72 C27 66 32 57 43 48 S64 38 77 28" fill="none" stroke={delayed ? "#e36c6c" : "#0b825a"} strokeWidth="1.4" strokeDasharray="2 2" strokeLinecap="round" /></svg>{allPoints.map((point, index) => <div key={point.label} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${point.position[0]}%`, top: `${point.position[1]}%` }}><span className={cn("grid size-9 place-items-center rounded-full border-4 border-[#eeeae4] text-white shadow-lg", index === 2 ? finalTone : "bg-[#252423]")}>{index === 2 ? <Truck className="size-4" /> : <MapPin className="size-4" />}</span><div className={cn("absolute top-10 w-36 rounded-xl border border-[#ded8d1] bg-white/95 px-3 py-2 shadow-sm", index === 2 ? "right-0" : "left-0")}><p className="text-[11px] font-bold leading-4 text-[#292524]">{point.shortLabel}</p><p className="mt-0.5 text-[10px] leading-4 text-[#716b66]">{point.detail}</p></div></div>)}<div className="absolute bottom-4 right-4 rounded-full bg-[#252423] px-3 py-2 font-mono text-[10px] font-semibold text-white">EST. ARRIVAL {shipment}</div></div></div>
      <aside className="border-t border-[#e5dfd9] bg-[#252423] p-6 text-[#faf7f3] lg:border-l lg:border-t-0"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold tracking-[0.15em] text-amber-300">WEATHER WINDOW</p><h3 className="mt-2 text-xl font-semibold">{route.weather.condition}</h3></div><CloudSun className="size-7 text-amber-300" /></div><div className="mt-6 grid grid-cols-3 gap-2"><WeatherMetric label="TEMP" value={route.weather.temperature} /><WeatherMetric label="WIND" value={route.weather.wind} /><WeatherMetric label="VISIBILITY" value={route.weather.visibility} /></div><div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.07] p-4"><p className="text-[10px] font-bold tracking-[0.1em] text-white/55">ROUTE IMPACT</p><p className="mt-2 text-sm leading-6 text-white/85">{delayed ? "Selected delay is linked to the vendor replenishment scenario, not weather conditions." : route.weather.impact}</p><p className="mt-3 font-mono text-[10px] text-amber-200">SHIPMENT STATE: {demoShipmentStates[state].label}</p></div></aside>
    </div>
  </section>;
}
function WeatherMetric({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.07] p-3"><p className="text-[9px] font-bold tracking-[0.08em] text-white/45">{label}</p><p className="mt-2 text-xs font-semibold leading-4 text-white">{value}</p></div>; }
function TimelineLane({ title, completion, shipment, tone }: { title: string; completion: string; shipment: string; tone: "neutral" | "warning" | "danger" }) { const color = tone === "danger" ? "bg-rose-400" : tone === "warning" ? "bg-amber-400" : "bg-[#74706d]"; return <div className="rounded-2xl border border-[#e1dbd5] bg-[#fbfaf8] p-5"><p className="text-sm font-semibold">{title}</p><div className="relative mt-6 flex justify-between before:absolute before:left-4 before:right-4 before:top-3 before:h-px before:bg-[#d8d2cc]"><div className="relative z-10"><i className={cn("block size-7 rounded-full border-4 border-[#fbfaf8]", color)} /><p className="mt-3 text-[10px] font-bold tracking-[0.08em] text-[#716b66]">COMPLETE</p><p className="mt-1 font-mono text-xs font-semibold">{completion}</p></div><div className="relative z-10 text-right"><i className={cn("ml-auto block size-7 rounded-full border-4 border-[#fbfaf8]", color)} /><p className="mt-3 text-[10px] font-bold tracking-[0.08em] text-[#716b66]">SHIP</p><p className="mt-1 font-mono text-xs font-semibold">{shipment}</p></div></div></div>; }
function ShipmentSignal({ delayed, shipment, delay }: { delayed: boolean; shipment: string; delay: string }) { return <section className="relative overflow-hidden rounded-[2rem] bg-[#252423] p-6 text-[#faf7f3] shadow-[0_24px_42px_rgba(0,0,0,0.11)] md:p-8"><div className="pointer-events-none absolute -right-12 -top-20 size-72 rounded-full border-[28px] border-amber-300/20" /><div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-[10px] font-bold tracking-[0.16em] text-amber-300">DELIVERY COMMAND SIGNAL</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">SO-8841 commitment is {delayed ? "at risk" : "under control"}.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">The recovery route and vendor state determine the production handoff and shipment promise.</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4"><p className="text-[10px] font-bold tracking-[0.1em] text-white/55">SHIP WINDOW</p><p className="mt-2 font-mono text-sm font-semibold">{shipment}</p></div><div className={delayed ? "rounded-2xl bg-rose-300 p-4 text-[#561417]" : "rounded-2xl bg-amber-300 p-4 text-[#3c2c00]"}><p className="text-[10px] font-bold tracking-[0.1em] opacity-65">SCHEDULE DELTA</p><p className="mt-2 font-mono text-xl font-bold">{delay}</p></div></div></div><div className="mt-7 grid grid-cols-3 gap-2"><i className="h-2 rounded-full bg-emerald-300" /><i className={delayed ? "h-2 rounded-full bg-rose-300" : "h-2 rounded-full bg-amber-300"} /><i className="h-2 rounded-full bg-white/15" /></div></section>; }
function Item({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-mono text-sm">{value}</p></div>; }
