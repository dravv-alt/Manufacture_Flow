"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, RefreshCw, Route, SlidersHorizontal, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { CircuitBoard } from "@/components/CircuitBoard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOperations } from "@/contexts/OperationsContext";
import { cn } from "@/lib/utils";

export function FailureIndex() {
  const { data } = useOperations();
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<"all" | "critical" | "warning">("all");
  const failures = useMemo(() => data.failures.filter((item) => (severity === "all" || item.severity === severity) && `${item.id} ${item.stationId} ${item.component} ${item.state}`.toLowerCase().includes(query.toLowerCase())), [data.failures, query, severity]);

  return <main className="min-h-screen bg-background px-4 py-6 md:px-8"><div className="mx-auto flex max-w-6xl flex-col gap-6"><header><Badge variant="outline">DEMO DATA</Badge><h1 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.04em]">Failure cases</h1><p className="mt-2 text-muted-foreground">Search predictive cases by station, component, severity, or workflow state.</p></header><div className="grid gap-3 sm:grid-cols-[1fr_auto]"><label><span className="sr-only">Search failure cases</span><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3" placeholder="Search cases" /></label><div className="flex gap-2" role="group" aria-label="Filter severity">{(["all", "critical", "warning"] as const).map((item) => <Button key={item} variant={severity === item ? "default" : "outline"} onClick={() => setSeverity(item)}>{item}</Button>)}</div></div><div className="grid gap-4">{failures.map((failure) => <Card key={failure.id}><CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div><CardTitle className="font-mono">{failure.id} / {failure.stationId}</CardTitle><CardDescription>{failure.component}</CardDescription></div><Badge variant={failure.severity === "critical" ? "destructive" : "warning"}>{failure.severity}</Badge></div></CardHeader><CardContent className="grid gap-4 md:grid-cols-[repeat(4,1fr)_auto] md:items-end"><Value label="Risk" value={`${failure.probability}%`} /><Value label="Window" value={`${failure.ttfHours}h`} /><Value label="Detected" value={failure.detectedAt} /><Value label="State" value={failure.state} /><Button asChild><Link href={`/failure/${failure.id}`}>Open case <ArrowRight data-icon="inline-end" /></Link></Button></CardContent></Card>)}{failures.length === 0 ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No failure cases match the current filters.</CardContent></Card> : null}</div></div></main>;
}

export function FailureCaseDetail({ caseId }: { caseId: string }) {
  const { state, data, update } = useOperations();
  const failure = data.failures.find((item) => item.id === caseId) ?? data.failures[0];
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const telemetryUnavailable = state.condition === "failed" || state.condition === "stale";
  const rerouteApproved = state.routingApproved;
  const events = [
    { label: "Anomaly detected", detail: "Vibration signature exceeded the X-axis servo threshold.", time: "03:14 IST", complete: true },
    { label: "Automated diagnostics", detail: "Predictive model confirms imminent bearing failure.", time: "03:15 IST", complete: true },
    { label: "Controlled shutdown pending", detail: "Awaiting manual confirmation to begin shutdown sequence and downstream rerouting.", time: "Current", complete: false },
    { label: "Maintenance execution", detail: "Physical repair and part replacement begins after approval.", time: "Pending", complete: false },
  ];

  return <main className="failure-control-page min-h-screen bg-background px-5 py-8 text-[#1c1b1b] lg:px-8"><div className="mx-auto w-full max-w-[1380px] lg:pl-10">
    <header className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-center"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">DEMO DATA</Badge><span className="text-xs font-semibold tracking-[0.06em] text-[#686467]">PREDICTIVE MAINTENANCE</span></div><h1 className="mt-3 text-[32px] font-semibold tracking-[-0.025em]">Failure Case &amp; Control</h1></div><div className="flex flex-wrap items-center gap-3 text-sm text-[#59565a]"><span>Main Plant</span><i className="size-1 rounded-full bg-[#d6d1d0]" /><span>Shift 1</span><i className="size-1 rounded-full bg-[#d6d1d0]" /><span>10:42 IST</span><i className="size-1 rounded-full bg-[#d6d1d0]" /><span className="flex items-center gap-1.5 text-emerald-700"><i className="size-2 rounded-full bg-emerald-700" />Connected</span></div></header>

    {telemetryUnavailable && <TelemetryDiagnostic retry={() => update({ condition: "ready" })} />}

    <section className="grid items-start gap-6 xl:grid-cols-[0.84fr_1.16fr]">
      <div className="flex min-w-0 flex-col gap-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-[#ddd6ce] bg-white p-8 shadow-[0_22px_40px_rgba(0,0,0,0.035)]"><div className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-[#fff4d7]" /><div className="relative"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold tracking-[0.06em] text-[#555156]">ACTIVE INCIDENT</p><h2 className="mt-2 text-[30px] font-semibold tracking-[-0.02em]">{failure.id}</h2></div><span className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-xs font-bold tracking-[0.06em]"><i className="size-2 rounded-full bg-black" />AT RISK</span></div><div className="mt-9 grid grid-cols-2 gap-7"><MetricValue label="Target workstation" value={failure.stationId} /><MetricValue label="Time to failure (TTF)" value={`${failure.ttfHours}`} suffix="h" large /></div><div className="mt-10"><div className="h-3 overflow-hidden rounded-full bg-[#ece7e2]"><div className="h-full rounded-full bg-amber-400" style={{ width: `${failure.probability}%` }} /></div><div className="mt-2 flex items-center justify-between text-sm"><span className="text-[#615d60]">Failure Probability</span><strong>{failure.probability}%</strong></div></div></div></section>

        <section className="rounded-[2rem] border border-[#ddd6ce] bg-white p-8 shadow-[0_22px_40px_rgba(0,0,0,0.035)]"><h2 className="text-[26px] font-semibold tracking-[-0.02em]">Escalation Sequence</h2><div className="relative mt-7 space-y-6 before:absolute before:bottom-8 before:left-[14px] before:top-5 before:w-px before:bg-[#e4ddd7]">{events.map((event, index) => <div className="relative z-10 flex gap-4" key={event.label}><span className={cn("grid size-7 shrink-0 place-items-center rounded-full border-2 bg-white", event.complete ? "border-emerald-700 text-emerald-700" : index === 2 ? "border-amber-400 bg-amber-400 text-black" : "border-[#dad3ce] text-[#a6a0a0]")}>{event.complete ? <Check className="size-4" /> : index === 2 ? <i className="size-2 rounded-full bg-black" /> : null}</span><div className={cn("min-w-0 flex-1", index === 2 && "rounded-[1.5rem] border border-[#ddd6ce] bg-[#f1eeea] p-5")}><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{event.label}{index === 2 && <span className="ml-2 rounded-full bg-white px-2 py-1 text-[10px] font-semibold tracking-[0.06em] text-[#5e5a5c]">CURRENT</span>}</h3><span className="text-xs text-[#696569]">{event.time}</span></div><p className="mt-1 max-w-[390px] text-sm leading-5 text-[#625e61]">{event.detail}</p>{index === 2 && <div className="mt-4 grid gap-2 text-sm"><StatusLine label="Production Supervisor" value="Notified" success /><StatusLine label="Maintenance Lead" value="Notified" success /><StatusLine label="Plant Manager" value="Pending approval" /></div>}</div></div>)}</div></section>
      </div>

      <section className="rounded-[2rem] border border-[#ddd6ce] bg-white p-8 shadow-[0_22px_40px_rgba(0,0,0,0.035)]"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h2 className="text-[26px] font-semibold tracking-[-0.02em]">Downstream Impact</h2><p className="mt-1 text-base text-[#615d60]">If {failure.stationId} enters shutdown at {failure.ttfHours}h</p></div><button onClick={() => setShowDiagnostics((current) => !current)} aria-expanded={showDiagnostics} className="inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-semibold transition-colors hover:bg-[#f3f0ec]"><SlidersHorizontal className="size-4" />Modify Parameters</button></div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3"><ImpactCard label="Affected jobs" value="3" detail="J1001-J1003" /><ImpactCard label="Throughput drop" value="-12%" detail="Est. 4h duration" tone="danger" /><ImpactCard label="Reroute option" value="WS-105" detail="75% capacity" tone="success" /></div>
        <RerouteMap approved={rerouteApproved} />
        {showDiagnostics && <div className="mt-5 rounded-2xl border border-[#ddd6ce] bg-[#f6f3ef] p-4 text-sm text-[#615d60]"><strong className="text-[#1c1b1b]">Scenario parameters</strong><p className="mt-1">The reroute preserves the controlled scenario: WS-102 is isolated and J1001-J1003 are proposed for WS-105 capacity.</p></div>}
        <div className="mt-7 border-t border-[#ded8d1] pt-5"><h3 className="font-semibold">Required Actions</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><button onClick={() => update({ routingApproved: true, routingOutcome: "approved", rerouteTargetId: "WS-105" })} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#303030]"><Route className="size-4" />{rerouteApproved ? "Reroute Approved for WS-105" : "Initiate Reroute to WS-105"}</button><button onClick={() => update({ maintenanceStage: Math.max(state.maintenanceStage, 2) })} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border-2 border-[#747174] bg-white px-5 text-sm font-bold transition-colors hover:bg-[#f5f2ee]"><Wrench className="size-4" />Confirm Maintenance</button></div></div>
      </section>
    </section>
  </div></main>;
}

function RerouteMap({ approved }: { approved: boolean }) {
  const nodes = [
    { id: "intake", x: 120, y: 116, label: "Intake", detail: "J1001-J1003", status: "inactive" as const, size: "lg" as const },
    { id: "workstation", x: 495, y: 116, label: "WS-102", detail: "At risk", status: "processing" as const, size: "lg" as const },
    { id: "reroute", x: 495, y: 260, label: "WS-105", detail: approved ? "Reroute approved" : "75% capacity", status: approved ? "active" as const : "inactive" as const, size: "lg" as const },
  ];
  const connections = [{ from: "intake", to: "workstation", animated: false, color: "#4b4744" }, { from: "intake", to: "reroute", animated: true, dashed: true, color: "#07855c", pulseColor: "#07855c" }];
  return <CircuitBoard nodes={nodes} connections={connections} className="mt-7 min-h-[330px]" />;
}

function MetricValue({ label, value, suffix, large = false }: { label: string; value: string; suffix?: string; large?: boolean }) { return <div><p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#5d595d]">{label}</p><p className={cn("mt-2 font-semibold tracking-[-0.025em]", large ? "text-[56px] leading-none" : "text-[26px]")}>{value}{suffix && <span className="ml-1 text-2xl font-medium text-[#676267]">{suffix}</span>}</p></div>; }
function ImpactCard({ label, value, detail, tone = "default" }: { label: string; value: string; detail: string; tone?: "default" | "danger" | "success" }) { return <div className="rounded-[1.65rem] border border-[#ddd6ce] bg-[#f5f2ef] p-5"><p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#5d595d]">{label}</p><p className={cn("mt-4 text-[30px] font-semibold tracking-[-0.02em]", tone === "danger" && "text-[#ba1a1a]", tone === "success" && "text-emerald-700")}>{value}</p><p className={cn("mt-1 text-sm", tone === "danger" ? "text-[#ba1a1a]" : tone === "success" ? "text-emerald-700" : "text-[#615d60]")}>{detail}</p></div>; }
function StatusLine({ label, value, success = false }: { label: string; value: string; success?: boolean }) { return <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-[#504c4f]"><i className={cn("size-2 rounded-full", success ? "bg-emerald-700" : "bg-amber-400")} />{label}</span><strong className={success ? "text-emerald-700" : "text-amber-600"}>{value}</strong></div>; }
function TelemetryDiagnostic({ retry }: { retry: () => void }) { return <section className="mb-6 rounded-[1.5rem] border border-[#ba1a1a]/30 bg-white p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="flex items-center gap-2 font-semibold text-[#93000a]"><AlertTriangle className="size-4" />Telemetry feed unavailable</p><p className="mt-1 text-sm text-[#625e61]">This controlled demo is showing a recoverable stale-data state.</p></div><button onClick={retry} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#777276] px-4 text-sm font-semibold hover:bg-[#f5f2ee]"><RefreshCw className="size-4" />Retry demo feed</button></div></section>; }
function Value({ label, value }: { label: string; value: string }) { return <div><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-1 font-heading font-semibold">{value}</p></div>; }
