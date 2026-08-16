"use client";

import Link from "next/link";
import { AlertTriangle, Check, MapPin, PackageCheck, PackageSearch, Truck } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOperations } from "@/contexts/OperationsContext";
import { OperationalPath } from "@/components/OperationalPath";

// demo_data
export function WarehouseControl() {
  // REDUNDANT LOCAL STATE — retained for review; inventory decisions now persist in OperationsContext.
  // const [available, setAvailable] = useState(true);
  // const [reserved, setReserved] = useState(false);
  const { state, update } = useOperations();
  const available = state.inventoryState === "available";
  const reserved = state.bearingReserved;
  const stock = available ? 3 : 0;
  const reservedCount = reserved ? 1 : 0;
  const remaining = stock - reservedCount;

  return (
    <main className="px-5 py-7 md:px-8 md:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="flex flex-col gap-5 border-b border-border pb-7">
          <div className="flex flex-wrap items-center gap-3"><Badge variant="outline">DEMO DATA</Badge><span className="font-mono text-xs text-muted-foreground">INVENTORY CONTROL / FAILURE CASE FC-2024-0047</span></div>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div className="max-w-3xl"><h1 className="font-heading text-4xl font-semibold tracking-[-0.04em] md:text-5xl">Make the spare decision explicit.</h1><p className="mt-3 text-base leading-7 text-muted-foreground">Reserve BRG-10023 for the WS-102 bearing replacement or route the unavailable branch to a procurement draft.</p></div><Button variant="outline" onClick={() => update({ inventoryState: available ? "unavailable" : "available", inventoryAvailable: !available, bearingReserved: false, recoveryScenario: available ? "vendor" : "local" })}>{available ? "Simulate unavailable stock" : "Restore available stock"}</Button></div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <StockAvailabilityOverview stock={stock} reserved={reservedCount} remaining={remaining} available={available} />
          <LogisticsProgressTimeline available={available} reserved={reserved} />
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Card><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle className="font-heading">BRG-10023</CardTitle><CardDescription>Servo Motor Bearing / required for WS-102 X-Axis recovery.</CardDescription></div>{available ? <Badge variant="secondary">AVAILABLE</Badge> : <Badge variant="destructive">UNAVAILABLE</Badge>}</div></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><InventoryDetail icon={PackageSearch} label="Required quantity" value="1 unit" /><InventoryDetail icon={PackageCheck} label="Available quantity" value={remaining + " units"} /><InventoryDetail icon={MapPin} label="Warehouse location" value="WH-A / Rack B-14" /><InventoryDetail icon={Truck} label="Internal ETA" value={available ? "45 minutes" : "Not available"} /></CardContent></Card>
          <Card><CardHeader><CardTitle className="font-heading">Reservation control</CardTitle><CardDescription>Links this spare to FC-2026-0047 and the pending WS-102 work order.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4">{reserved ? <div className="rounded-md bg-muted p-4"><p className="flex items-center gap-2 text-sm font-semibold"><Check className="size-4" /> Bearing reserved</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Reservation R-10023 is held for WO-WS102-081.</p></div> : available ? <AlertDialog><AlertDialogTrigger asChild><Button><PackageCheck data-icon="inline-start" />Reserve 1 bearing</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Reserve BRG-10023?</AlertDialogTitle><AlertDialogDescription>This will hold one available bearing for WS-102 failure case FC-2026-0047. It does not place a purchase order.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => update({ bearingReserved: true, recoveryScenario: "local" })}>Confirm reservation</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog> : <div className="flex flex-col gap-3 rounded-md border border-destructive p-4"><p className="flex items-center gap-2 text-sm font-semibold text-destructive"><AlertTriangle className="size-4" /> Stock is insufficient</p><p className="text-sm leading-6 text-muted-foreground">No bearing can be reserved. Continue to a draft procurement request; financial approval remains outside this app.</p><Button asChild><Link href="/procurement">Open procurement draft</Link></Button></div>}<Link href="/failure/FC-2026-0047" className="text-sm font-medium underline-offset-4 hover:underline">Back to failure control</Link></CardContent></Card>
        </section>

        <OperationalPath title="Part-to-repair path" description="A compact handoff view for the controlled spare-recovery scenario." steps={[{ id: "verify", label: "Stock verified", detail: available ? `${stock} units recorded at WH-A.` : "No reservable stock is currently recorded.", state: available ? "complete" : "blocked" }, { id: "reserve", label: "Reservation", detail: reserved ? "One bearing is held for WO-WS102-081." : available ? "Awaiting a reservation decision." : "Blocked until procurement confirms availability.", state: reserved ? "complete" : available ? "active" : "blocked" }, { id: "transfer", label: "Transfer to maintenance", detail: available ? "Internal transfer estimate: 45 minutes." : "Vendor replenishment path selected.", state: reserved ? "active" : "upcoming" }, { id: "repair", label: "Controlled repair", detail: "Maintenance retains approval of the service window.", state: "upcoming" }]} />

        <Card><CardHeader><CardTitle className="font-heading">Stock state audit</CardTitle><CardDescription>Controlled inventory states are visible to maintenance before work begins.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><Audit label="On hand" value={stock + " units"} /><Audit label="Reserved" value={reservedCount + " units"} /><Audit label="Available after action" value={remaining + " units"} /></CardContent></Card>
      </div>
    </main>
  );
}

function StockAvailabilityOverview({ stock, reserved, remaining, available }: { stock: number; reserved: number; remaining: number; available: boolean }) {
  return <section className="relative overflow-hidden rounded-[2rem] bg-[#252423] p-6 text-[#f8f5f1] shadow-[0_24px_42px_rgba(0,0,0,0.10)] md:p-7"><div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full border-[28px] border-amber-300/20" /><div className="relative"><p className="text-[10px] font-bold tracking-[0.16em] text-amber-300">STOCK AVAILABILITY</p><div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-3xl font-semibold tracking-[-0.03em]">BRG-10023</h2><p className="mt-1 text-sm text-white/60">Servo motor bearing · WH-A / Rack B-14</p></div><span className={available ? "rounded-full bg-emerald-300 px-3 py-1.5 text-xs font-bold tracking-[0.07em] text-[#123426]" : "rounded-full bg-rose-300 px-3 py-1.5 text-xs font-bold tracking-[0.07em] text-[#561417]"}>{available ? "READY TO RESERVE" : "REPLENISHMENT NEEDED"}</span></div><div className="mt-7 grid grid-cols-3 gap-3"><AvailabilityMetric label="On hand" value={`${stock}`} /><AvailabilityMetric label="Reserved" value={`${reserved}`} accent={reserved > 0} /><AvailabilityMetric label="Free now" value={`${remaining}`} accent={remaining > 0} /></div><div className="mt-7 h-2 overflow-hidden rounded-full bg-white/10"><div className={available ? "h-full rounded-full bg-emerald-300 transition-[width]" : "h-full rounded-full bg-rose-300 transition-[width]"} style={{ width: `${available ? Math.max(20, (remaining / 3) * 100) : 0}%` }} /></div><p className="mt-3 text-xs text-white/55">Inventory position updates immediately when the reservation state changes.</p></div></section>;
}

function AvailabilityMetric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div className={accent ? "rounded-2xl bg-white/12 p-4" : "rounded-2xl bg-white/[0.06] p-4"}><p className="text-[10px] font-semibold tracking-[0.08em] text-white/55">{label.toUpperCase()}</p><p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{value}</p></div>; }

function LogisticsProgressTimeline({ available, reserved }: { available: boolean; reserved: boolean }) {
  const steps = [{ label: "Inventory verified", detail: available ? "WH-A record available" : "No reservable stock", state: available ? "complete" : "blocked" }, { label: "Part reserved", detail: reserved ? "R-10023 held" : "Awaiting decision", state: reserved ? "complete" : available ? "current" : "blocked" }, { label: "Transfer to WS-102", detail: available ? "45 min internal ETA" : "Vendor path required", state: reserved ? "current" : "upcoming" }, { label: "Maintenance handoff", detail: "WO-WS102-081", state: "upcoming" }];
  return <section className="rounded-[2rem] border border-[#ddd6ce] bg-[#f7f3ef] p-6 shadow-[0_20px_36px_rgba(0,0,0,0.035)] md:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[0.16em] text-[#716b66]">PHYSICAL LOGISTICS</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">Part-to-repair movement</h2></div><Truck className="size-5 text-[#0b825a]" /></div><ol className="mt-7 grid gap-3 sm:grid-cols-2">{steps.map((step, index) => <li key={step.label} className={step.state === "current" ? "rounded-2xl border border-amber-400 bg-white p-4" : "rounded-2xl border border-[#ded8d1] bg-white/60 p-4"}><div className="flex items-center gap-3"><span className={step.state === "complete" ? "grid size-7 place-items-center rounded-full bg-emerald-700 text-xs font-bold text-white" : step.state === "blocked" ? "grid size-7 place-items-center rounded-full bg-rose-200 text-xs font-bold text-rose-800" : step.state === "current" ? "grid size-7 place-items-center rounded-full bg-amber-300 text-xs font-bold text-black" : "grid size-7 place-items-center rounded-full bg-[#e5dfd8] text-xs font-bold text-[#6d6763]"}>{index + 1}</span><div><p className="text-sm font-semibold">{step.label}</p><p className="mt-0.5 text-xs text-[#716b66]">{step.detail}</p></div></div></li>)}</ol></section>;
}

function InventoryDetail({ icon: Icon, label, value }: { icon: typeof PackageSearch; label: string; value: string }) { return <div className="rounded-md bg-muted p-4"><Icon className="size-4 text-muted-foreground" /><p className="mt-3 text-xs text-muted-foreground">{label}</p><p className="mt-1 font-mono text-sm font-medium">{value}</p></div>; }
function Audit({ label, value }: { label: string; value: string }) { return <div className="rounded-md border border-border p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 font-mono text-lg font-semibold">{value}</p></div>; }
