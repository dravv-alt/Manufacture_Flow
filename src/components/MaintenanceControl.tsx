"use client";

import { useMemo, useState } from "react";
import { Check, Clock3, Factory, PackageCheck, ShieldCheck, UserRound, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Scenario = "local" | "vendor";

// demo_data
const scenarios = {
  local: {
    label: "Scenario 1 / local bearing available",
    availability: "10-Aug-2026 / 06:45 IST",
    total: "6h 15m",
    steps: [
      ["Part transfer", "45m"],
      ["Bearing replacement", "2h 30m"],
      ["Testing", "1h 30m"],
      ["Quality validation", "1h 30m"],
    ],
  },
  vendor: {
    label: "Scenario 2 / vendor replenishment required",
    availability: "12-Aug-2026 / 20:30 IST",
    total: "60h",
    steps: [
      ["Vendor lead time", "36h"],
      ["Transportation + inspection", "12h"],
      ["Bearing replacement", "6h"],
      ["Testing + quality validation", "6h"],
    ],
  },
} as const;

const stages = ["Created", "Waiting for part", "Planned", "Installed", "Testing", "Validation", "Returned to service"] as const;

export function MaintenanceControl() {
  const [scenario, setScenario] = useState<Scenario>("local");
  const [stageIndex, setStageIndex] = useState(2);
  const [assignee, setAssignee] = useState("A. Kulkarni / Maintenance Lead");
  const selected = scenarios[scenario];
  const audit = useMemo(() => [
    "03:14 IST · Failure case FC-2024-0047 created",
    "03:15 IST · WS-102 allocation blocked",
    "03:21 IST · BRG-10023 requirement linked",
    "03:32 IST · Work order planned by " + assignee,
  ], [assignee]);

  const advance = () => setStageIndex((value) => Math.min(value + 1, stages.length - 1));

  return (
    <main className="px-5 py-7 md:px-8 md:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="flex flex-col gap-5 border-b border-border pb-7">
          <div className="flex flex-wrap items-center gap-3"><Badge variant="outline">DEMO DATA</Badge><span className="font-mono text-xs text-muted-foreground">MAINTENANCE CONTROL / WO-WS102-081</span></div>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div className="max-w-3xl"><h1 className="font-heading text-4xl font-semibold tracking-[-0.04em] md:text-5xl">Recover WS-102 with visible assumptions.</h1><p className="mt-3 text-base leading-7 text-muted-foreground">The work order links failure evidence, BRG-10023 availability, repair stages, and a deterministic return-to-service estimate.</p></div><Button onClick={advance} disabled={stageIndex === stages.length - 1}>{stageIndex === stages.length - 1 ? <Check data-icon="inline-start" /> : <Wrench data-icon="inline-start" />}{stageIndex === stages.length - 1 ? "Returned to service" : "Advance work order stage"}</Button></div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <Card><CardHeader><CardTitle className="font-heading">Work order</CardTitle><CardDescription>Authorized maintenance record for the controlled scenario.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4"><Detail icon={Factory} label="Workstation" value="WS-102 / Haas VF-2SS CNC" /><Detail icon={Wrench} label="Predicted fault" value="X-Axis Servo Motor Bearing" /><Detail icon={PackageCheck} label="Required part" value="BRG-10023 / quantity 1" /><Detail icon={UserRound} label="Assignee" value={assignee} /><Button variant="outline" onClick={() => setAssignee((value) => value.startsWith("A.") ? "R. Shah / Reliability Technician" : "A. Kulkarni / Maintenance Lead")}>Change assignee</Button></CardContent></Card>
          <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="font-heading">Recovery lifecycle</CardTitle><CardDescription>Current state: {stages[stageIndex]}</CardDescription></div><Badge variant="secondary">{stages[stageIndex].toUpperCase()}</Badge></div></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{stages.map((stage, index) => <button key={stage} onClick={() => setStageIndex(index)} className={cn("flex items-center gap-3 rounded-md border p-3 text-left", index === stageIndex ? "border-primary bg-primary text-primary-foreground" : index < stageIndex ? "border-border bg-muted" : "border-border")}><span className={cn("flex size-6 items-center justify-center rounded-full font-mono text-xs", index <= stageIndex ? "bg-primary-foreground text-primary" : "bg-muted text-muted-foreground")}>{index < stageIndex ? <Check className="size-3" /> : index + 1}</span><span className="text-sm font-medium">{stage}</span></button>)}</CardContent></Card>
        </section>

        <Card><CardHeader><CardTitle className="font-heading">Recovery scenario calculation</CardTitle><CardDescription>Select the supply condition; the duration breakdown and availability estimate update deterministically.</CardDescription></CardHeader><CardContent className="flex flex-col gap-5"><div className="grid gap-3 md:grid-cols-2">{(["local", "vendor"] as Scenario[]).map((option) => <button key={option} onClick={() => setScenario(option)} className={cn("rounded-md border p-4 text-left", scenario === option ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted")}><p className="font-mono text-xs">{scenarios[option].label.toUpperCase()}</p><p className="mt-2 text-sm">{option === "local" ? "Use warehouse-reserved BRG-10023." : "Use vendor lead time, delivery, and inspection."}</p></button>)}</div><div className="grid gap-4 md:grid-cols-[1fr_1fr_0.7fr]"><div className="rounded-md bg-muted p-4"><p className="text-xs text-muted-foreground">Expected availability</p><p className="mt-2 font-mono text-sm font-semibold">{selected.availability}</p></div><div className="rounded-md bg-muted p-4"><p className="text-xs text-muted-foreground">Scenario used</p><p className="mt-2 text-sm font-semibold">{selected.label}</p></div><div className="rounded-md border border-border p-4"><p className="text-xs text-muted-foreground">Total duration</p><p className="mt-2 font-mono text-2xl font-semibold">{selected.total}</p></div></div><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">{selected.steps.map(([label, duration]) => <div key={label} className="rounded-md border border-border p-4"><p className="text-sm">{label}</p><p className="mt-2 font-mono text-sm text-muted-foreground">{duration}</p></div>)}</div></CardContent></Card>

        <Card><CardHeader><CardTitle className="font-heading">Audit history</CardTitle><CardDescription>Operator changes remain attached to the work order.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3">{audit.map((event) => <p key={event} className="rounded-md border border-border px-4 py-3 font-mono text-xs text-muted-foreground">{event}</p>)}</CardContent></Card>
      </div>
    </main>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof Factory; label: string; value: string }) { return <div className="flex gap-3 rounded-md bg-muted p-4"><Icon className="mt-0.5 size-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div></div>; }
