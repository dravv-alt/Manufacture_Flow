"use client";

import { useState } from "react";
import { Bell, Check, Clock3, MailWarning, Send, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ShipmentState = "no-impact" | "revised" | "delayed" | "notification-pending" | "notified" | "failed";

// demo_data
const states: Record<ShipmentState, { label: string; description: string; badge: "outline" | "secondary" | "destructive" }> = {
  "no-impact": { label: "NO IMPACT", description: "Recovery stays inside the original commitment window.", badge: "secondary" },
  revised: { label: "REVISED", description: "A revised internal production commitment is awaiting notification.", badge: "outline" },
  delayed: { label: "DELAYED", description: "Recovery pushes the shipment past the original commitment.", badge: "destructive" },
  "notification-pending": { label: "NOTIFICATION PENDING", description: "Operations decision is complete; stakeholder delivery is not yet confirmed.", badge: "outline" },
  notified: { label: "NOTIFIED", description: "Shipment, Logistics, and Customer Service delivery states are confirmed.", badge: "secondary" },
  failed: { label: "DELIVERY FAILED", description: "One stakeholder channel failed; retry remains available.", badge: "destructive" },
};

export function ShipmentControl() {
  const [state, setState] = useState<ShipmentState>("revised");
  const [notificationLog, setNotificationLog] = useState<string[]>([]);
  const current = states[state];
  const delayed = state === "delayed";
  const schedule = delayed ? { completion: "11-Aug / 16:00", shipment: "12-Aug / 09:00", delay: "+24h" } : { completion: "10-Aug / 14:00", shipment: "10-Aug / 18:00", delay: "+6h" };
  const notify = () => { setState("notified"); setNotificationLog(["Shipment Team · delivered", "Logistics Desk · delivered", "Customer Service · delivered"]); };
  const fail = () => { setState("failed"); setNotificationLog(["Shipment Team · delivered", "Logistics Desk · failed", "Customer Service · delivered"]); };

  return (
    <main className="px-5 py-7 md:px-8 md:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="flex flex-col gap-5 border-b border-border pb-7">
          <div className="flex flex-wrap items-center gap-3"><Badge variant="outline">DEMO DATA</Badge><span className="font-mono text-xs text-muted-foreground">SHIPMENT IMPACT / SO-8841 / WS-102 RECOVERY</span></div>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div className="max-w-3xl"><h1 className="font-heading text-4xl font-semibold tracking-[-0.04em] md:text-5xl">Keep the delivery commitment visible.</h1><p className="mt-3 text-base leading-7 text-muted-foreground">Compare original and revised production timing before stakeholder notifications are sent. Customer-facing communication remains a preview.</p></div><Badge variant={current.badge}>{current.label}</Badge></div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Card><CardHeader><CardTitle className="font-heading">Commitment comparison</CardTitle><CardDescription>SO-8841 is linked to J1001, J1002, and J1003 after WS-102 containment.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><Schedule title="Original commitment" completion="09-Aug / 14:00" shipment="09-Aug / 18:00" delay="0h" /><Schedule title="Revised recovery plan" completion={schedule.completion} shipment={schedule.shipment} delay={schedule.delay} revised /></CardContent></Card>
          <Card><CardHeader><CardTitle className="font-heading">Impact context</CardTitle><CardDescription>Why the schedule changed.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4"><Item label="Failure case" value="FC-2024-0047 / WS-102 bearing risk" /><Item label="Rerouting plan" value="J1001 + J1002 → WS-105; J1003 → WS-108" /><Item label="Recovery assumption" value={delayed ? "Vendor bearing scenario" : "Local bearing scenario"} /><Item label="Delivery risk" value={delayed ? "Delayed / notify stakeholders" : "Revised / review notification"} /></CardContent></Card>
        </section>

        <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div><CardTitle className="font-heading">Notification center</CardTitle><CardDescription>{current.description}</CardDescription></div><span className="flex items-center gap-2 font-mono text-xs text-muted-foreground"><Clock3 className="size-4" /> Controlled delivery state</span></div></CardHeader><CardContent className="flex flex-col gap-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(["no-impact", "revised", "delayed", "notification-pending", "notified", "failed"] as ShipmentState[]).map((option) => <button key={option} onClick={() => setState(option)} className={cn("rounded-md border p-4 text-left transition-colors", state === option ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted")}><span className="font-mono text-xs">{states[option].label}</span><span className="mt-2 block text-sm">{states[option].description}</span></button>)}</div><div className="flex flex-wrap gap-3"><Button onClick={notify}><Send data-icon="inline-start" />Confirm stakeholder delivery</Button><Button variant="outline" onClick={fail}><MailWarning data-icon="inline-start" />Simulate failed channel</Button><Button variant="outline" onClick={() => setState("notification-pending")}><Bell data-icon="inline-start" />Mark notification pending</Button></div>{notificationLog.length > 0 ? <div className="grid gap-2 md:grid-cols-3">{notificationLog.map((entry) => <div key={entry} className="flex items-center gap-2 rounded-md bg-muted p-3 font-mono text-xs"><Check className={cn("size-4", entry.includes("failed") && "text-destructive")} />{entry}</div>)}</div> : <p className="font-mono text-xs text-muted-foreground">No external communication has been sent by this demo.</p>}</CardContent></Card>

        <Card><CardHeader><CardTitle className="font-heading">Customer communication preview</CardTitle><CardDescription>Preview only. No external customer delivery integration is configured.</CardDescription></CardHeader><CardContent><div className="rounded-md border border-border bg-muted p-5"><p className="text-sm font-semibold">Subject: Updated production timing for SO-8841</p><p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">We are reviewing a controlled production recovery plan. The current revised shipment estimate is {schedule.shipment}. This preview is not sent externally.</p></div></CardContent></Card>
      </div>
    </main>
  );
}

function Schedule({ title, completion, shipment, delay, revised = false }: { title: string; completion: string; shipment: string; delay: string; revised?: boolean }) { return <div className={cn("rounded-xl border p-5", revised ? "border-primary bg-muted" : "border-border")}><p className="text-sm font-semibold">{title}</p><div className="mt-4 flex flex-col gap-3"><Item label="Production completion" value={completion} /><Item label="Shipment date" value={shipment} /><Item label="Schedule delta" value={delay} /></div></div>; }
function Item({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-mono text-sm">{value}</p></div>; }
