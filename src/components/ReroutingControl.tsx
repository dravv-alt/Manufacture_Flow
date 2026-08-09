"use client";

import { useState } from "react";
import { Check, Clock3, Factory, Route, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// demo_data
const jobs = [
  { id: "J1001", operation: "Milling phase 2", priority: "Tier 1", original: "WS-102", target: "WS-105", impact: "+0h" },
  { id: "J1002", operation: "Surface finish", priority: "Tier 2", original: "WS-102", target: "WS-105", impact: "+1h" },
  { id: "J1003", operation: "QC preparation", priority: "Tier 3", original: "WS-102", target: "WS-108", impact: "+1h" },
];

const alternatives = [
  { id: "WS-105", label: "Precision Milling Center", capacity: 75, state: "Recommended" },
  { id: "WS-108", label: "6-Axis Robot Arm", capacity: 55, state: "Conditional" },
  { id: "WS-110", label: "Laser Cutter Sigma", capacity: 0, state: "Unavailable" },
];

export function ReroutingControl() {
  const [selected, setSelected] = useState("WS-105");
  const [approved, setApproved] = useState(false);

  return (
    <main className="px-5 py-7 md:px-8 md:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="flex flex-col gap-5 border-b border-border pb-7">
          <div className="flex flex-wrap items-center gap-3"><Badge variant="outline">DEMO DATA</Badge><span className="font-mono text-xs text-muted-foreground">FLOW CONTROL / WS-102 CONTAINMENT</span></div>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div className="max-w-3xl"><h1 className="font-heading text-4xl font-semibold tracking-[-0.04em] md:text-5xl">Re-route work without losing the trade-off.</h1><p className="mt-3 text-base leading-7 text-muted-foreground">Three jobs are held from WS-102. Select an alternate machine, expose its capacity, then approve the controlled routing plan.</p></div><Button onClick={() => setApproved(true)}>{approved ? <Check data-icon="inline-start" /> : <ShieldCheck data-icon="inline-start" />}{approved ? "Routing plan approved" : "Approve routing plan"}</Button></div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <Card><CardHeader><CardTitle className="font-heading">Affected jobs</CardTitle><CardDescription>Original assignment remains visible after the proposed change.</CardDescription></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="font-mono text-[10px] tracking-wide text-muted-foreground"><tr><th className="pb-3">JOB</th><th className="pb-3">OPERATION</th><th className="pb-3">CURRENT</th><th className="pb-3">PROPOSED</th><th className="pb-3 text-right">IMPACT</th></tr></thead><tbody>{jobs.map((job) => <tr key={job.id} className="border-t border-border"><td className="py-4 font-mono font-medium">{job.id}</td><td className="py-4">{job.operation}<span className="ml-2 text-xs text-muted-foreground">{job.priority}</span></td><td className="py-4 font-mono text-muted-foreground">{job.original}</td><td className="py-4 font-mono font-medium">{job.id === "J1003" ? "WS-108" : selected}</td><td className="py-4 text-right font-mono">{job.impact}</td></tr>)}</tbody></table></CardContent></Card>
          <Card><CardHeader><CardTitle className="font-heading">Alternate capacity</CardTitle><CardDescription>Choose an eligible target machine.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3">{alternatives.map((machine) => { const isSelected = selected === machine.id; const disabled = machine.state === "Unavailable"; return <button key={machine.id} disabled={disabled} onClick={() => setSelected(machine.id)} className={cn("rounded-md border p-4 text-left transition-colors", isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted", disabled && "cursor-not-allowed opacity-45")}><div className="flex items-center justify-between gap-3"><span className="font-mono text-sm">{machine.id}</span><Badge variant={machine.state === "Recommended" ? "secondary" : "outline"}>{machine.state}</Badge></div><p className="mt-2 text-sm font-medium">{machine.label}</p><div className="mt-3 flex items-center gap-3"><div className="h-1.5 flex-1 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: machine.capacity + "%" }} /></div><span className="font-mono text-xs">{machine.capacity}%</span></div></button>; })}</CardContent></Card>
        </section>

        <Card><CardHeader><CardTitle className="font-heading">Execution result</CardTitle><CardDescription>Approval is reversible until dispatch is released.</CardDescription></CardHeader><CardContent className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><Route className="size-5" /><p className="text-sm"><span className="font-mono font-medium">J1001 + J1002</span> will route to <span className="font-mono font-medium">{selected}</span>; <span className="font-mono font-medium">J1003</span> remains staged for WS-108.</p></div><span className="flex items-center gap-2 font-mono text-xs text-muted-foreground"><Clock3 className="size-4" /> No hidden schedule change</span></CardContent></Card>
      </div>
    </main>
  );
}
