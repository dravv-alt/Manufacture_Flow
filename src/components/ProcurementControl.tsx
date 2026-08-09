"use client";

import { useState } from "react";
import { Check, Clock3, Mail, Send, Truck, UserRoundCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RequestState = "draft" | "sent" | "acknowledged" | "delayed";

// demo_data
const stateCopy: Record<RequestState, { label: string; detail: string; badge: "outline" | "secondary" | "destructive" }> = {
  draft: { label: "DRAFT", detail: "Review required before the vendor request is sent.", badge: "outline" },
  sent: { label: "SENT", detail: "Vendor request delivered to Apex Motion Components.", badge: "secondary" },
  acknowledged: { label: "VENDOR ACKNOWLEDGED", detail: "Expected dispatch confirmed for 09:00 tomorrow.", badge: "secondary" },
  delayed: { label: "DELAYED", detail: "Vendor response reports a 24-hour dispatch delay.", badge: "destructive" },
};

export function ProcurementControl() {
  const [state, setState] = useState<RequestState>("draft");
  const current = stateCopy[state];
  const send = () => setState("sent");

  return (
    <main className="px-5 py-7 md:px-8 md:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="flex flex-col gap-5 border-b border-border pb-7">
          <div className="flex flex-wrap items-center gap-3"><Badge variant="outline">DEMO DATA</Badge><span className="font-mono text-xs text-muted-foreground">PROCUREMENT CONTROL / PR-10023-DRAFT</span></div>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div className="max-w-3xl"><h1 className="font-heading text-4xl font-semibold tracking-[-0.04em] md:text-5xl">Make the replenishment handoff auditable.</h1><p className="mt-3 text-base leading-7 text-muted-foreground">This is a vendor-request preview for BRG-10023. Financial authorization remains outside Machine Overwatch.</p></div><Badge variant={current.badge}>{current.label}</Badge></div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Card><CardHeader><CardTitle className="font-heading">Purchase requisition preview</CardTitle><CardDescription>Typed request generated from the unavailable-stock recovery branch.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><Field label="Part" value="BRG-10023 / Servo Motor Bearing" /><Field label="Quantity" value="1 unit" /><Field label="Required by" value="10-Aug-2026 / 06:00 IST" /><Field label="Linked records" value="FC-2024-0047 / WO-WS102-081" /><Field label="Approved vendor" value="Apex Motion Components" /><Field label="Vendor contact" value="procurement@apexmotion.example" /></CardContent></Card>
          <Card><CardHeader><CardTitle className="font-heading">Delivery projection</CardTitle><CardDescription>Recovery estimate updates from the vendor response state.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4"><Projection icon={Truck} label="Expected dispatch" value={state === "delayed" ? "11-Aug / 09:00" : state === "acknowledged" ? "09-Aug / 09:00" : "Pending vendor response"} /><Projection icon={Clock3} label="Expected delivery" value={state === "delayed" ? "12-Aug / 14:00" : state === "acknowledged" ? "10-Aug / 14:00" : "Pending vendor response"} /><Projection icon={UserRoundCheck} label="Recovery scenario" value={state === "acknowledged" ? "Vendor lead time + repair + validation" : "Awaiting vendor confirmation"} /></CardContent></Card>
        </section>

        <Card><CardHeader><CardTitle className="font-heading">Vendor-request delivery state</CardTitle><CardDescription>{current.detail}</CardDescription></CardHeader><CardContent className="flex flex-col gap-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(["draft", "sent", "acknowledged", "delayed"] as RequestState[]).map((item) => <button key={item} onClick={() => setState(item)} className={cn("rounded-md border p-4 text-left transition-colors", state === item ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted")}><span className="font-mono text-xs">{stateCopy[item].label}</span><span className="mt-2 block text-sm">{stateCopy[item].detail}</span></button>)}</div><div className="flex flex-wrap gap-3">{state === "draft" ? <Button onClick={send}><Send data-icon="inline-start" />Send vendor request</Button> : null}{state === "sent" ? <Button onClick={() => setState("acknowledged")}><Check data-icon="inline-start" />Record acknowledgement</Button> : null}{state === "acknowledged" ? <Button variant="outline" onClick={() => setState("delayed")}><Clock3 data-icon="inline-start" />Simulate delay</Button> : null}<Button variant="outline" onClick={() => setState("draft")}><Mail data-icon="inline-start" />Return to editable draft</Button></div><p className="font-mono text-xs text-muted-foreground">Recipients: Procurement Team / Maintenance Lead / Production Scheduler · external financial approval not configured</p></CardContent></Card>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) { return <div className="rounded-md bg-muted p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-mono text-sm font-medium">{value}</p></div>; }
function Projection({ icon: Icon, label, value }: { icon: typeof Truck; label: string; value: string }) { return <div className="flex gap-3 rounded-md border border-border p-4"><Icon className="mt-0.5 size-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div></div>; }
