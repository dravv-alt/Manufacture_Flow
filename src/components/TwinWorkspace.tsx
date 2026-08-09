"use client";

import { useState } from "react";
import { Box, Focus, GitBranch, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DigitalTwinScene } from "@/components/DigitalTwinScene";
import { CncExplodedInspector } from "@/components/CncExplodedInspector";
import { MOCK_WORKSTATIONS } from "@/data/workstations";
import { cn } from "@/lib/utils";

type Mode = "overview" | "isolate" | "dependencies";

// demo_data
const componentTree = [
  { id: "cnc", label: "Haas VF-2SS CNC", state: "Asset root" },
  { id: "x-axis", label: "X-Axis Servo Assembly", state: "At risk" },
  { id: "bearing", label: "Servo Motor Bearing / BRG-10023", state: "92% failure probability" },
  { id: "sensors", label: "Vibration + temperature evidence", state: "3 threshold events" },
];

export function TwinWorkspace() {
  const [machineId, setMachineId] = useState("WS-102");
  const [mode, setMode] = useState<Mode>("overview");
  const [selectedComponent, setSelectedComponent] = useState("bearing");
  const [cameraKey, setCameraKey] = useState(0);
  const machine = MOCK_WORKSTATIONS.find((item) => item.id === machineId) ?? MOCK_WORKSTATIONS[0];
  const isHaas = machineId === "WS-102";

  return (
    <main className="px-5 py-7 md:px-8 md:py-10">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
        <section className="flex flex-col justify-between gap-4 border-b border-border pb-6 lg:flex-row lg:items-end"><div><div className="flex items-center gap-3"><Badge variant="outline">DEMO DATA</Badge><span className="font-mono text-xs text-muted-foreground">DIGITAL TWIN / INSPECTION WORKSPACE</span></div><h1 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.04em]">Plant digital twin workspace.</h1><p className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground">Select a retained plant asset, inspect linked operational evidence, and follow the failure impact without losing physical context.</p></div><Button variant="outline" onClick={() => { setCameraKey((value) => value + 1); setMode("overview"); }}><RotateCcw data-icon="inline-start" />Reset camera and view</Button></section>

        <section className="grid gap-5 xl:grid-cols-[230px_1fr_310px]">
          <Card><CardHeader><CardTitle className="font-heading">Workstations</CardTitle><CardDescription>Retained plant assets</CardDescription></CardHeader><CardContent className="flex flex-col gap-2">{MOCK_WORKSTATIONS.filter((item) => ["WS-102", "WS-108", "WS-112", "WS-114"].includes(item.id)).map((item) => <button key={item.id} onClick={() => { setMachineId(item.id); setMode("overview"); }} className={cn("rounded-xl border p-3 text-left transition-colors", item.id === machineId ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted")}><span className="font-mono text-xs">{item.id}</span><span className="mt-1 block text-sm font-semibold">{item.name}</span><span className="mt-2 block font-mono text-[10px]">{item.status} · {item.capacity}% capacity</span></button>)}</CardContent></Card>
          <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="font-heading">{machine.id} / {machine.name}</CardTitle><CardDescription>Orbit, pan, zoom, and inspect the real retained asset.</CardDescription></div><Badge variant={machine.status === "At Risk" ? "destructive" : "secondary"}>{machine.status}</Badge></div></CardHeader><CardContent className="flex flex-col gap-3"><DigitalTwinScene key={cameraKey} machineId={machineId} sceneMode={mode} /><div className="flex flex-wrap gap-2"><Button variant={mode === "overview" ? "default" : "outline"} size="sm" onClick={() => setMode("overview")}><Focus data-icon="inline-start" />Overview</Button><Button variant={mode === "isolate" ? "default" : "outline"} size="sm" onClick={() => setMode("isolate")}><Box data-icon="inline-start" />Isolate context</Button><Button variant={mode === "dependencies" ? "default" : "outline"} size="sm" onClick={() => setMode("dependencies")}><GitBranch data-icon="inline-start" />Dependencies</Button></div></CardContent></Card>
          <Card><CardHeader><CardTitle className="font-heading">Inspector</CardTitle><CardDescription>Linked engineering data</CardDescription></CardHeader><CardContent className="flex flex-col gap-3">{isHaas ? componentTree.map((component) => <button key={component.id} onClick={() => setSelectedComponent(component.id)} className={cn("rounded-md border p-3 text-left", selectedComponent === component.id ? "border-primary bg-muted" : "border-border hover:bg-muted")}><span className="text-sm font-medium">{component.label}</span><span className="mt-1 block font-mono text-[10px] text-muted-foreground">{component.state}</span></button>) : <div className="rounded-md bg-muted p-4"><p className="text-sm font-semibold">Asset-level inspection</p><p className="mt-2 text-sm leading-6 text-muted-foreground">The current retained model supports physical viewing. Component-level engineering metadata is authored only for WS-102.</p></div>}{isHaas ? <Evidence component={selectedComponent} mode={mode} /> : null}</CardContent></Card>
        </section>
        {isHaas ? <CncExplodedInspector selectedComponent={selectedComponent} onSelectedComponentChange={setSelectedComponent} /> : null}
      </div>
    </main>
  );
}

function Evidence({ component, mode }: { component: string; mode: Mode }) {
  if (mode === "dependencies") return <div className="rounded-md bg-muted p-4"><p className="text-sm font-semibold">Failure propagation</p><p className="mt-2 text-sm leading-6 text-muted-foreground">BRG-10023 → WS-102 allocation block → J1001/J1002/J1003 re-routing → maintenance work order → shipment SO-8841 review.</p></div>;
  if (component === "bearing") return <div className="rounded-md border border-destructive p-4"><p className="font-mono text-xs text-destructive">BRG-10023</p><p className="mt-2 text-sm font-semibold">Servo Motor Bearing</p><p className="mt-2 text-sm leading-6 text-muted-foreground">92% failure probability · estimated TTF 18 hours · vibration threshold breach 4.1 mm/s · temperature 84.5 °C.</p></div>;
  return <div className="rounded-md bg-muted p-4"><p className="text-sm font-semibold">Selected: {component}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Use the component hierarchy to review the causal data layer linked to the physical CNC asset.</p></div>;
}
