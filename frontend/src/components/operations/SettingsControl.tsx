"use client";

import { useState } from "react";
import { Check, Eye, MonitorCog, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useOperations } from "@/contexts/OperationsContext";
import { PersistedPreferences } from "@/components/operations/PersistedPreferences";

// demo_data
export function SettingsControl() {
  // REDUNDANT LOCAL STATE — shared preferences now persist in OperationsContext.
  // const [reducedMotion, setReducedMotion] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [saved, setSaved] = useState(false);
  const { state, update } = useOperations();
  const { reducedMotion, role } = state;

  return (
    <main className="px-5 py-7 md:px-8 md:py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="flex flex-col gap-4 border-b border-border pb-7"><div className="flex items-center gap-3"><Badge variant="outline">DEMO DATA</Badge><span className="font-mono text-xs text-muted-foreground">WORKSPACE CONTROLS</span></div><h1 className="font-heading text-4xl font-semibold tracking-[-0.04em]">Settings and demo controls.</h1><p className="max-w-2xl text-base leading-7 text-muted-foreground">These controls change local interface preferences only. They do not alter plant equipment, allocate jobs, send vendor requests, or notify external parties.</p></section>
        <section className="grid gap-5 md:grid-cols-2">
          <Card><CardHeader><CardTitle className="font-heading">User context</CardTitle><CardDescription>Role and plant context for this controlled UI scenario.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4"><Setting label="Active role" value={role} action="Change role" onClick={() => update({ role: role === "Plant Manager" ? "Maintenance Lead" : "Plant Manager" })} /><Setting label="Plant context" value="North Fabrication Plant / Line A" /><Setting label="Permissions" value="Review, approve drafts, update work orders" /></CardContent></Card>
          <Card><CardHeader><CardTitle className="font-heading">Accessibility</CardTitle><CardDescription>Motion and visual controls are shared workspace preferences.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4"><Toggle label="Reduced motion" detail="Stops non-essential animation in the twin and workflow surfaces." enabled={reducedMotion} onClick={() => update({ reducedMotion: !reducedMotion })} /><Toggle label="Demo scenario mode" detail="Keeps the visible data source labelled as controlled demo data." enabled={demoMode} onClick={() => setDemoMode((value) => !value)} /></CardContent></Card>
        </section>
        <Card><CardHeader><CardTitle className="font-heading">Data and decision boundary</CardTitle><CardDescription>Clear source ownership prevents the UI from presenting a recommendation as an approved action.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-3"><Boundary icon={Eye} title="Data source" detail={demoMode ? "Controlled fixture data" : "No live connector configured"} /><Boundary icon={ShieldCheck} title="Approvals" detail="Human-controlled in every workflow" /><Boundary icon={MonitorCog} title="Motion preference" detail={reducedMotion ? "Reduced motion enabled" : "Standard motion enabled"} /></CardContent></Card>
        <PersistedPreferences />
      </div>
    </main>
  );
}

function Setting({ label, value, action, onClick }: { label: string; value: string; action?: string; onClick?: () => void }) { return <div className="flex items-center justify-between gap-4 rounded-md bg-muted p-4"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>{action ? <Button variant="outline" size="sm" onClick={onClick}>{action}</Button> : null}</div>; }
function Toggle({ label, detail, enabled, onClick }: { label: string; detail: string; enabled: boolean; onClick: () => void }) { return <button onClick={onClick} className="flex items-start justify-between gap-4 rounded-md border border-border p-4 text-left hover:bg-muted"><span><span className="block text-sm font-medium">{label}</span><span className="mt-1 block text-sm leading-6 text-muted-foreground">{detail}</span></span><span className={cn("mt-1 flex h-6 w-11 items-center rounded-full p-1 transition-colors", enabled ? "bg-primary" : "bg-muted")}><span className={cn("size-4 rounded-full bg-primary-foreground transition-transform", enabled && "translate-x-5")} /></span></button>; }
function Boundary({ icon: Icon, title, detail }: { icon: typeof Eye; title: string; detail: string }) { return <div className="rounded-md border border-border p-4"><Icon className="size-4 text-muted-foreground" /><p className="mt-3 text-sm font-semibold">{title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p></div>; }
