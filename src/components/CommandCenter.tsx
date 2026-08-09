"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Check, CircleDot, Clock3, PackageCheck, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FailureWorkflowPanel } from "@/components/FailureWorkflowPanel";
import { Separator } from "@/components/ui/separator";
import { MOCK_WORKSTATIONS } from "@/data/workstations";
import { cn } from "@/lib/utils";

const DigitalTwinScene = dynamic(
  () => import("@/components/DigitalTwinScene").then((module) => module.DigitalTwinScene),
  { ssr: false },
);

// demo_data
export type CommandView = "dashboard" | "failure" | "rerouting" | "warehouse" | "procurement" | "maintenance" | "shipment" | "settings";

const copy: Record<CommandView, { code: string; title: string; description: string; action: string }> = {
  dashboard: { code: "CONTROL ROOM / NORTH FABRICATION PLANT", title: "See the consequence before the downtime.", description: "A controlled WS-102 bearing-risk scenario connects production, inventory, maintenance, and shipment decisions.", action: "Open failure control" },
  failure: { code: "FAILURE CONTROL / FC-2024-0047", title: "WS-102 needs a decision in 18 hours.", description: "X-Axis Servo Assembly bearing degradation is at 92% predicted risk. Allocation is held for operator approval.", action: "Block allocation" },
  rerouting: { code: "FLOW CONTROL / J1001", title: "Protect the order without hiding the trade-off.", description: "Stage the alternate resource, review capacity, and approve the routing decision explicitly.", action: "Stage reroute" },
  warehouse: { code: "INVENTORY CONTROL / BRG-10023", title: "Reserve the recovery-critical bearing.", description: "Inventory is visible before the work order is released.", action: "Reserve bearing" },
  procurement: { code: "PROCUREMENT CONTROL / BRG-10023", title: "Expedite the recovery path.", description: "The purchase proposal remains a human-approved action.", action: "Create approval draft" },
  maintenance: { code: "MAINTENANCE CONTROL / WS-102", title: "Turn prediction into a bounded work order.", description: "Plan service, assign the machine window, then verify recovery.", action: "Create work order" },
  shipment: { code: "SHIPMENT CONTROL / SO-8841", title: "Keep delivery commitments explicit.", description: "Shipment impact stays visible until recovery is approved.", action: "Notify logistics" },
  settings: { code: "SYSTEM SETTINGS", title: "Control the decision environment.", description: "Demo data stays distinct from future live telemetry.", action: "Save controls" },
};

export function CommandCenter({ view = "dashboard" }: { view?: CommandView }) {
  const [selectedId, setSelectedId] = useState("WS-102");
  const [staged, setStaged] = useState<string[]>([]);
  const details = copy[view];
  const selected = useMemo(() => MOCK_WORKSTATIONS.find((machine) => machine.id === selectedId) ?? MOCK_WORKSTATIONS[0], [selectedId]);
  const stage = (action: string) => setStaged((items) => items.includes(action) ? items : [...items, action]);
  const steps = ["Acknowledge case", "Hold allocation", "Reserve bearing", "Approve maintenance", "Release recovery"];

  return (
    <main className="px-5 py-7 md:px-8 md:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="flex flex-col gap-5 border-b border-border pb-7">
          <div className="flex flex-wrap items-center gap-3"><Badge variant="outline">DEMO DATA</Badge><span className="font-mono text-xs text-muted-foreground">{details.code}</span></div>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-3xl"><h1 className="font-heading text-4xl font-semibold tracking-[-0.04em] md:text-5xl">{details.title}</h1><p className="mt-3 text-base leading-7 text-muted-foreground">{details.description}</p></div>
            <Button onClick={() => stage(details.action)}>{staged.includes(details.action) ? <Check data-icon="inline-start" /> : <ArrowRight data-icon="inline-start" />}{staged.includes(details.action) ? "Action staged" : details.action}</Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Metric label="Systems monitored" value="12" detail="11 nominal / 1 at risk" />
          <Metric label="Failure probability" value="92%" detail="WS-102 / bearing wear" critical />
          <Metric label="Decision window" value="18h" detail="Time to predicted failure" />
        </section>
        {view === "dashboard" ? <DashboardRiskSummary /> : null}

        <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <Card><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle className="font-heading">Plant digital twin</CardTitle><CardDescription>Select one of the four mapped workstation assets.</CardDescription></div><Badge variant="secondary">LINE A</Badge></div></CardHeader><CardContent className="flex flex-col gap-3"><DigitalTwinScene machineId={selectedId} /><div className="grid gap-3 md:grid-cols-2">{MOCK_WORKSTATIONS.filter((machine) => ["WS-102", "WS-108", "WS-112", "WS-114"].includes(machine.id)).map((machine) => { const active = selectedId === machine.id; const risk = machine.id === "WS-102"; return <button key={machine.id} onClick={() => setSelectedId(machine.id)} className={cn("flex min-h-20 flex-col items-start justify-between rounded-md border p-3 text-left transition-transform hover:-translate-y-0.5", active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted text-foreground")}><span className="font-mono text-xs">{machine.id}</span><span className="font-heading text-sm font-medium">{machine.name}</span><span className="flex items-center gap-2 font-mono text-[10px] uppercase"><CircleDot className={cn("size-3", risk ? "text-destructive" : "text-success")} />{risk ? "At risk" : machine.status}</span></button>; })}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="font-heading">{selected.id} / case context</CardTitle><CardDescription>Controlled scenario values</CardDescription></CardHeader><CardContent className="flex flex-col gap-4"><Detail label="Current job" value={selected.currentJob} /><Detail label="Predicted component" value={selected.predictedComponent} /><Detail label="Temperature" value={selected.temperature + " °C"} /><Detail label="Vibration" value={selected.vibration + " mm/s"} /><Detail label="RUL" value={selected.rul} /><Separator /><Link href="/failure/FC-2024-0047" className="text-sm font-medium underline-offset-4 hover:underline">Open failure control <ArrowRight className="ml-1 inline size-4" /></Link></CardContent></Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card><CardHeader><CardTitle className="font-heading">Decision sequence</CardTitle><CardDescription>Each step is operator-controlled.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3">{steps.map((step, index) => { const done = staged.includes(step); return <button key={step} onClick={() => stage(step)} className="flex items-center gap-3 rounded-md border border-border p-3 text-left hover:bg-muted"><span className={cn("flex size-7 items-center justify-center rounded-full font-mono text-xs", done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{done ? <Check className="size-4" /> : index + 1}</span><span className="text-sm font-medium">{step}</span></button>; })}</CardContent></Card>
          <Card><CardHeader><CardTitle className="font-heading">Consequence chain</CardTitle><CardDescription>One machine risk made decision-relevant.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><Impact icon={AlertTriangle} title="Allocation" text="J1001 is held until a routing decision." /><Impact icon={PackageCheck} title="Inventory" text="BRG-10023 reservation is required." /><Impact icon={Wrench} title="Maintenance" text="Bearing replacement gets a bounded window." /><Impact icon={Clock3} title="Shipment" text="SO-8841 stays visible until release." /></CardContent></Card>
        </section>
        {view === "failure" ? <FailureWorkflowPanel /> : null}
      </div>
    </main>
  );
}

function Metric({ label, value, detail, critical = false }: { label: string; value: string; detail: string; critical?: boolean }) { return <Card><CardHeader className="gap-2"><CardDescription>{label}</CardDescription><CardTitle className={cn("font-heading text-3xl", critical && "text-destructive")}>{value}</CardTitle></CardHeader><CardContent><p className="font-mono text-xs text-muted-foreground">{detail}</p></CardContent></Card>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4"><span className="text-sm text-muted-foreground">{label}</span><span className="font-mono text-xs text-right">{value}</span></div>; }
function Impact({ icon: Icon, title, text }: { icon: typeof AlertTriangle; title: string; text: string }) { return <div className="flex gap-3 rounded-md bg-muted p-4"><Icon className="mt-0.5 size-4 shrink-0" /><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p></div></div>; }

function DashboardRiskSummary() {
  return <section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
    <Card className="overflow-hidden"><CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div><CardTitle className="font-heading">Plant risk level</CardTitle><CardDescription>Real-time predictive risk concentration.</CardDescription></div><Badge variant="outline">ELEVATED / SECTOR 4</Badge></div></CardHeader><CardContent><div className="rounded-xl bg-muted p-6"><p className="font-heading text-6xl font-semibold tracking-[-0.05em]">12.4%</p><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Overall plant-risk probability within the next 24 hours. Primary driver: WS-102 servo bearing vibration and thermal stress.</p><div className="mt-6 h-2 overflow-hidden rounded-full bg-background"><div className="h-full w-[12.4%] rounded-full bg-warning" /></div></div></CardContent></Card>
    <Card><CardHeader><CardTitle className="font-heading">Active predictions</CardTitle><CardDescription>Needs operator review</CardDescription></CardHeader><CardContent className="flex flex-col gap-3"><Prediction id="WS-102" title="Servo Motor Bearing" probability="92%" time="18h" critical /><Prediction id="WS-108" title="Actuator Joint B" probability="68%" time="36h" /></CardContent></Card>
  </section>;
}

function Prediction({ id, title, probability, time, critical = false }: { id: string; title: string; probability: string; time: string; critical?: boolean }) {
  return <Link href="/failure/FC-2024-0047" className="rounded-xl bg-muted p-4 transition-colors hover:bg-secondary"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-sm font-semibold">{id}</p><p className="mt-1 text-sm">{title}</p><p className="mt-1 font-mono text-xs text-muted-foreground">Expected failure · {time}</p></div><Badge variant={critical ? "destructive" : "outline"}>{probability}</Badge></div></Link>;
}
