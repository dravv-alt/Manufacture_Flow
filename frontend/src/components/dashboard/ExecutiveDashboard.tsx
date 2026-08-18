"use client";

/**
 * REDUNDANT — replaced by TwinWorkspace and target-owned dashboard route components.
 * Retained intact for review; do not import into active routes.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarClock, CircleAlert, Database, PackageCheck, Search, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_WORKSTATIONS } from "@/data/workstations";
import { cn } from "@/lib/utils";

// demo_data
export function ExecutiveDashboard() {
  const [selectedId, setSelectedId] = useState("WS-102");
  const [query, setQuery] = useState("");
  const selected = MOCK_WORKSTATIONS.find((workstation) => workstation.id === selectedId) ?? MOCK_WORKSTATIONS[0];
  const atRisk = MOCK_WORKSTATIONS.filter((workstation) => workstation.status === "At Risk");
  const operational = MOCK_WORKSTATIONS.filter((workstation) => workstation.status === "Operational" || workstation.status === "Recovered");
  const inMaintenance = MOCK_WORKSTATIONS.filter((workstation) => workstation.status === "Under Maintenance");
  const averageCapacity = Math.round(MOCK_WORKSTATIONS.reduce((total, workstation) => total + workstation.capacity, 0) / MOCK_WORKSTATIONS.length);
  const filtered = useMemo(() => MOCK_WORKSTATIONS.filter((workstation) => {
    const term = query.trim().toLowerCase();
    return !term || [workstation.id, workstation.name, workstation.status, workstation.predictedComponent].join(" ").toLowerCase().includes(term);
  }), [query]);

  return (
    <main className="px-5 py-8 md:px-8 lg:px-10">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
        <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><h1 className="font-heading text-3xl font-semibold tracking-[-0.04em]">Plant overview</h1><p className="mt-2 max-w-xl text-base leading-7 text-muted-foreground">A controlled manufacturing scenario. Every displayed operational value comes from the labelled demo workstation dataset.</p></div>
          <div className="flex flex-wrap gap-3"><Link href="/dashboard" className="flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm text-muted-foreground"><Search className="size-4" />Open 3D workspace</Link><Button asChild><Link href="/failure/FC-2024-0047">Review WS-102 case</Link></Button></div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Monitored workstations" value={String(MOCK_WORKSTATIONS.length)} detail="Controlled scenario scope" />
          <Stat label="Operational" value={String(operational.length)} detail="Operational or recovered" />
          <Stat label="At risk" value={String(atRisk.length)} detail="Requires review" danger />
          <Stat label="Under maintenance" value={String(inMaintenance.length)} detail="Active service state" />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
          <Card className="overflow-hidden"><CardHeader><div className="flex items-start justify-between"><div><CardTitle className="font-heading">Risk concentration</CardTitle><CardDescription>Click a station to inspect its recorded condition.</CardDescription></div><Badge variant="outline">DEMO DATA</Badge></div></CardHeader><CardContent className="relative min-h-64 overflow-hidden"><button onClick={() => setSelectedId("WS-112")} className={cn("absolute left-[32%] top-12 flex size-24 items-center justify-center rounded-full bg-primary text-center font-mono text-xs text-primary-foreground shadow-xl transition-transform hover:scale-105", selectedId === "WS-112" && "ring-4 ring-primary/20")}>WS-112<br />Normal</button><button onClick={() => setSelectedId("WS-108")} className={cn("absolute left-[44%] top-3 flex size-32 items-center justify-center rounded-full bg-warning text-center font-heading text-sm font-semibold shadow-xl transition-transform hover:scale-105", selectedId === "WS-108" && "ring-4 ring-warning/30")}>WS-108<br />{atRisk.find((workstation) => workstation.id === "WS-108")?.failureProb}% risk</button><button onClick={() => setSelectedId("WS-102")} className={cn("absolute left-[61%] top-14 flex size-28 items-center justify-center rounded-full bg-destructive text-center font-heading text-sm font-semibold text-primary-foreground shadow-xl transition-transform hover:scale-105", selectedId === "WS-102" && "ring-4 ring-destructive/25")}>WS-102<br />{atRisk.find((workstation) => workstation.id === "WS-102")?.failureProb}% risk</button><div className="absolute bottom-4 left-0 flex flex-col gap-2 text-xs"><span className="flex items-center gap-2"><i className="h-0.5 w-5 bg-destructive" />At-risk condition</span><span className="flex items-center gap-2"><i className="h-0.5 w-5 bg-warning" />Degraded condition</span><span className="flex items-center gap-2"><i className="h-0.5 w-5 bg-primary" />Normal condition</span></div></CardContent></Card>
          <Card className="bg-primary text-primary-foreground"><CardHeader><div className="flex items-start justify-between"><div><CardTitle className="font-heading text-primary-foreground">Recovery queue</CardTitle><CardDescription className="text-primary-foreground/60">Current controlled work</CardDescription></div><CalendarClock className="size-5 text-primary-foreground/65" /></div></CardHeader><CardContent className="flex flex-col gap-3"><QueueItem label="WS-102 / FC-2024-0047" detail="BRG-10023 · estimated TTF 18 hours" link="/failure/FC-2024-0047" /><QueueItem label="WO-WS102-081" detail="Bearing replacement · planned state" link="/maintenance" /><QueueItem label="WS-110" detail="Under maintenance · 0% capacity" link="/maintenance" /><div className="mt-2 border-t border-primary-foreground/15 pt-4"><Link href="/maintenance" className="flex items-center gap-2 text-sm font-medium text-primary-foreground">Open maintenance control <ArrowRight className="size-4" /></Link></div></CardContent></Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <Card><CardHeader><CardTitle className="font-heading">Capacity utilization</CardTitle><CardDescription>Average declared workstation capacity</CardDescription></CardHeader><CardContent className="flex min-h-48 flex-col items-center justify-center"><div className="flex size-32 items-center justify-center rounded-full border-[9px] border-success text-center"><span className="font-heading text-3xl font-semibold">{averageCapacity}%</span></div><p className="mt-4 font-mono text-xs text-muted-foreground">AVERAGE ACROSS {MOCK_WORKSTATIONS.length} WORKSTATIONS</p></CardContent></Card>
          <Card><CardHeader><div className="flex items-start justify-between"><div><CardTitle className="font-heading">Data coverage</CardTitle><CardDescription>Telemetry fields available in this demo</CardDescription></div><Database className="size-5 text-muted-foreground" /></div></CardHeader><CardContent className="flex min-h-48 flex-col justify-center"><p className="font-heading text-5xl font-semibold">{MOCK_WORKSTATIONS.length}/{MOCK_WORKSTATIONS.length}</p><p className="mt-3 text-sm leading-6 text-muted-foreground">Temperature, vibration, pressure, cycle count, current, and maintenance history are populated for the displayed workstations.</p></CardContent></Card>
          <Card><CardHeader><div className="flex items-start justify-between"><div><CardTitle className="font-heading">Selected workstation</CardTitle><CardDescription>{selected.id} / {selected.status}</CardDescription></div><CircleAlert className={cn("size-5", selected.status === "At Risk" ? "text-destructive" : "text-muted-foreground")} /></div></CardHeader><CardContent className="flex flex-col gap-3"><p className="font-heading text-lg">{selected.name}</p><p className="text-sm text-muted-foreground">{selected.predictedComponent === "â€”" ? "No predicted failing component in this scenario." : selected.predictedComponent + " · " + selected.failureProb + "% failure probability"}</p><Link href={selected.id === "WS-102" ? "/failure/FC-2024-0047" : "/dashboard"} className="mt-auto flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline">{selected.id === "WS-102" ? "Open failure control" : "Open 3D workspace"}<ArrowRight className="size-4" /></Link></CardContent></Card>
        </section>

        <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div><CardTitle className="font-heading">Workstation health data</CardTitle><CardDescription>Searchable source values from the controlled workstation dataset.</CardDescription></div><label className="flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4"><Search className="size-4 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-48 bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Search workstation" aria-label="Search workstations" /></label></div></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="border-b border-border font-mono text-[10px] tracking-wide text-muted-foreground"><tr>{["WS ID","WORKSTATION","STATUS","JOB","TEMP °C","VIB mm/s","CAPACITY","FAILURE RISK","PREDICTED COMPONENT","TTF","LAST MAINT."].map((label) => <th key={label} className="pb-3 pr-4">{label}</th>)}</tr></thead><tbody>{filtered.map((workstation) => <tr key={workstation.id} onClick={() => setSelectedId(workstation.id)} className="cursor-pointer border-b border-border transition-colors hover:bg-muted last:border-0"><td className="py-4 pr-4 font-mono font-semibold">{workstation.id}</td><td className="py-4 pr-4">{workstation.name}</td><td className="py-4 pr-4"><Status status={workstation.status} /></td><td className="py-4 pr-4 font-mono">{workstation.currentJob}</td><td className={cn("py-4 pr-4 font-mono", workstation.temperature > 80 && "font-semibold text-destructive")}>{workstation.temperature}</td><td className={cn("py-4 pr-4 font-mono", workstation.vibration > 3.5 && "font-semibold text-destructive")}>{workstation.vibration}</td><td className="py-4 pr-4 font-mono">{workstation.capacity}%</td><td className={cn("py-4 pr-4 font-mono", workstation.failureProb >= 70 && "font-semibold text-destructive")}>{workstation.failureProb}%</td><td className="py-4 pr-4">{workstation.predictedComponent}</td><td className="py-4 pr-4 font-mono">{workstation.estimatedTTF}</td><td className="py-4 pr-4 font-mono">{workstation.lastMaintenance}</td></tr>)}</tbody></table></CardContent></Card>
      </div>
    </main>
  );
}

function Stat({ label, value, detail, danger = false }: { label: string; value: string; detail: string; danger?: boolean }) { return <Card><CardHeader className="gap-1"><CardDescription>{label}</CardDescription><CardTitle className={cn("font-heading text-4xl", danger && "text-destructive")}>{value}</CardTitle></CardHeader><CardContent><p className="font-mono text-xs text-muted-foreground">{detail}</p></CardContent></Card>; }
function QueueItem({ label, detail, link }: { label: string; detail: string; link: string }) { return <Link href={link} className="rounded-xl bg-primary-foreground/10 p-3 transition-colors hover:bg-primary-foreground/15"><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-xs text-primary-foreground/65">{detail}</p></Link>; }
function Status({ status }: { status: string }) { return <Badge variant={status === "At Risk" ? "destructive" : status === "Under Maintenance" ? "warning" : "success"}>{status}</Badge>; }
