"use client";

import Link from "next/link";
import { useState } from "react";
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

// demo_data
export function WarehouseControl() {
  const [available, setAvailable] = useState(true);
  const [reserved, setReserved] = useState(false);
  const stock = available ? 3 : 0;
  const reservedCount = reserved ? 1 : 0;
  const remaining = stock - reservedCount;

  return (
    <main className="px-5 py-7 md:px-8 md:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="flex flex-col gap-5 border-b border-border pb-7">
          <div className="flex flex-wrap items-center gap-3"><Badge variant="outline">DEMO DATA</Badge><span className="font-mono text-xs text-muted-foreground">INVENTORY CONTROL / FAILURE CASE FC-2024-0047</span></div>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div className="max-w-3xl"><h1 className="font-heading text-4xl font-semibold tracking-[-0.04em] md:text-5xl">Make the spare decision explicit.</h1><p className="mt-3 text-base leading-7 text-muted-foreground">Reserve BRG-10023 for the WS-102 bearing replacement or route the unavailable branch to a procurement draft.</p></div><Button variant="outline" onClick={() => { setAvailable((state) => !state); setReserved(false); }}>{available ? "Simulate unavailable stock" : "Restore available stock"}</Button></div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Card><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle className="font-heading">BRG-10023</CardTitle><CardDescription>Servo Motor Bearing / required for WS-102 X-Axis recovery.</CardDescription></div>{available ? <Badge variant="secondary">AVAILABLE</Badge> : <Badge variant="destructive">UNAVAILABLE</Badge>}</div></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><InventoryDetail icon={PackageSearch} label="Required quantity" value="1 unit" /><InventoryDetail icon={PackageCheck} label="Available quantity" value={remaining + " units"} /><InventoryDetail icon={MapPin} label="Warehouse location" value="WH-A / Rack B-14" /><InventoryDetail icon={Truck} label="Internal ETA" value={available ? "45 minutes" : "Not available"} /></CardContent></Card>
          <Card><CardHeader><CardTitle className="font-heading">Reservation control</CardTitle><CardDescription>Links this spare to FC-2024-0047 and the pending WS-102 work order.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4">{reserved ? <div className="rounded-md bg-muted p-4"><p className="flex items-center gap-2 text-sm font-semibold"><Check className="size-4" /> Bearing reserved</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Reservation R-10023 is held for WO-WS102-081.</p></div> : available ? <AlertDialog><AlertDialogTrigger asChild><Button><PackageCheck data-icon="inline-start" />Reserve 1 bearing</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Reserve BRG-10023?</AlertDialogTitle><AlertDialogDescription>This will hold one available bearing for WS-102 failure case FC-2024-0047. It does not place a purchase order.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => setReserved(true)}>Confirm reservation</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog> : <div className="flex flex-col gap-3 rounded-md border border-destructive p-4"><p className="flex items-center gap-2 text-sm font-semibold text-destructive"><AlertTriangle className="size-4" /> Stock is insufficient</p><p className="text-sm leading-6 text-muted-foreground">No bearing can be reserved. Continue to a draft procurement request; financial approval remains outside this app.</p><Button asChild><Link href="/procurement">Open procurement draft</Link></Button></div>}<Link href="/failure/FC-2024-0047" className="text-sm font-medium underline-offset-4 hover:underline">Back to failure control</Link></CardContent></Card>
        </section>

        <Card><CardHeader><CardTitle className="font-heading">Stock state audit</CardTitle><CardDescription>Controlled inventory states are visible to maintenance before work begins.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><Audit label="On hand" value={stock + " units"} /><Audit label="Reserved" value={reservedCount + " units"} /><Audit label="Available after action" value={remaining + " units"} /></CardContent></Card>
      </div>
    </main>
  );
}

function InventoryDetail({ icon: Icon, label, value }: { icon: typeof PackageSearch; label: string; value: string }) { return <div className="rounded-md bg-muted p-4"><Icon className="size-4 text-muted-foreground" /><p className="mt-3 text-xs text-muted-foreground">{label}</p><p className="mt-1 font-mono text-sm font-medium">{value}</p></div>; }
function Audit({ label, value }: { label: string; value: string }) { return <div className="rounded-md border border-border p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 font-mono text-lg font-semibold">{value}</p></div>; }
