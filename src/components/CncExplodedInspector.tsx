"use client";

import { useMemo, useState } from "react";
import { Crosshair, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CncExplodedScene } from "@/components/CncExplodedScene";

type CncExplodedInspectorProps = { selectedComponent: string; onSelectedComponentChange: (component: string) => void };

// demo_data
const inspectionStops = [
  { value: 0, label: "Full assembly", component: "cnc" },
  { value: 33, label: "Servo assembly", component: "x-axis" },
  { value: 66, label: "Bearing isolate", component: "bearing" },
  { value: 100, label: "Impact evidence", component: "sensors" },
] as const;

// demo_data
const componentNotes: Record<string, { title: string; detail: string; state: string }> = {
  cnc: { title: "Haas VF-2SS CNC", detail: "WS-102 machining-center assembly and its controlled engineering context.", state: "Asset root" },
  "x-axis": { title: "X-Axis Servo Assembly", detail: "Servo-drive, motor, shaft, ball-screw, and linear-guideway context for the affected axis.", state: "At risk" },
  bearing: { title: "Servo Motor Bearing / BRG-10023", detail: "92% failure probability · estimated TTF 18 hours · vibration threshold breach 4.1 mm/s · temperature 84.5 °C.", state: "Priority component" },
  sensors: { title: "Vibration + temperature evidence", detail: "Three threshold events link the predicted bearing condition to the machine-level allocation block.", state: "Evidence linked" },
};

export function CncExplodedInspector({ selectedComponent, onSelectedComponentChange }: CncExplodedInspectorProps) {
  const [progress, setProgress] = useState(66);
  const activeStop = useMemo(() => inspectionStops.reduce((nearest, stop) => Math.abs(stop.value - progress) < Math.abs(nearest.value - progress) ? stop : nearest, inspectionStops[0]), [progress]);
  const selected = componentNotes[selectedComponent] ?? componentNotes.bearing;

  function updateProgress(value: number) {
    setProgress(value);
    const stop = inspectionStops.reduce((nearest, item) => Math.abs(item.value - value) < Math.abs(nearest.value - value) ? item : nearest, inspectionStops[0]);
    onSelectedComponentChange(stop.component);
  }

  return <Card className="overflow-hidden"><CardHeader className="border-b border-border bg-muted/35"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Crosshair className="size-4" /><CardTitle className="font-heading">Exploded assembly diagnostic</CardTitle></div><CardDescription className="mt-1 max-w-2xl">Moving diagnostic assembly with WS-102 component evidence in the adjacent inspector.</CardDescription></div><Button variant="outline" size="sm" onClick={() => { setProgress(66); onSelectedComponentChange("bearing"); }}><RotateCcw data-icon="inline-start" />Reset focus</Button></div></CardHeader><CardContent className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:p-5"><div><CncExplodedScene progress={progress / 100} /><section className="mt-4 rounded-xl bg-[#211f19] p-4 font-mono text-[#e0dacb]"><div className="flex items-center justify-between text-[10px] tracking-[0.18em]"><span>TIMELINE SCRUB</span><span className="text-[#d58a35]">{String(Math.round(progress)).padStart(3, "0")}%</span></div><div className="relative mt-4 h-5"><div className="absolute inset-x-0 top-2 h-px bg-[#77705e]" /><div className="absolute inset-x-0 top-0 flex justify-between">{Array.from({ length: 17 }).map((_, index) => <span key={index} className="h-2 border-l border-[#77705e]" />)}</div><input id="cnc-explosion-stage" aria-label="Assembly timeline scrub" className="absolute inset-0 z-10 h-5 w-full cursor-pointer opacity-0" type="range" min="0" max="100" step="1" value={progress} onChange={(event) => updateProgress(Number(event.target.value))} /><span className="absolute top-[3px] size-3 -translate-x-1/2 rotate-45 border-2 border-white bg-[#d58a35]" style={{ left: `${progress}%` }} /></div><div className="mt-3 flex items-center justify-between text-[10px] tracking-[0.12em] text-[#a9a18f]"><span>STAGE · {activeStop.label.toUpperCase()}</span><span>FR {String(Math.round(progress * 2.4)).padStart(3, "0")} / 240</span></div></section></div><aside className="flex flex-col gap-3" aria-label="CNC component inspection controls"><div className="rounded-xl border border-border bg-muted/45 p-4"><Badge variant={selectedComponent === "bearing" ? "destructive" : "secondary"}>{selected.state}</Badge><p className="mt-3 font-heading text-lg font-semibold">{selected.title}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{selected.detail}</p></div><div className="grid gap-2">{Object.entries(componentNotes).map(([id, item]) => <button key={id} type="button" onClick={() => onSelectedComponentChange(id)} className={cn("min-h-11 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", selectedComponent === id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted")}><span className="block text-sm font-semibold">{item.title}</span><span className={cn("mt-1 block font-mono text-[10px]", selectedComponent === id ? "text-primary-foreground/75" : "text-muted-foreground")}>{item.state}</span></button>)}</div></aside></CardContent></Card>;
}
