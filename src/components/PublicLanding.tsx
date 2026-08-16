"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, Box, CircleAlert, PackageCheck, Route, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const HeroTwin = dynamic(() => import("@/components/DigitalTwinScene").then((module) => module.DigitalTwinScene), {
  ssr: false,
  loading: () => <div className="flex h-[340px] items-center justify-center rounded-2xl border border-border bg-twin-canvas p-6 text-center font-mono text-xs text-primary-foreground">DEMO ASSET / Loading WS-102 engineering view…</div>,
});

const chain = [
  { icon: CircleAlert, title: "Detect", text: "Evidence identifies an elevated bearing-risk condition on WS-102." },
  { icon: Route, title: "Contain", text: "New allocation pauses while alternate capacity is reviewed." },
  { icon: PackageCheck, title: "Recover", text: "Inventory and vendor scenarios make the recovery estimate explicit." },
  { icon: Wrench, title: "Release", text: "A human approves the work order and return-to-service decision." },
];

export function PublicLanding() {
  return <main className="min-h-screen bg-background text-foreground"><header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 md:px-8"><Link href="/" className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-primary font-heading text-sm font-semibold text-primary-foreground">MO</span><span className="font-heading text-base font-semibold">Machine Overwatch</span></Link><div className="flex items-center gap-3"><span className="hidden rounded-full border border-border bg-muted px-3 py-1 font-mono text-[10px] font-semibold tracking-wide sm:inline">DEMO DATA</span><Button asChild variant="outline" size="sm"><Link href="/sign-in">Sign in</Link></Button></div></header><section className="mx-auto grid max-w-7xl gap-10 px-5 pb-14 pt-8 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-20"><div><p className="font-mono text-xs tracking-widest text-muted-foreground">PREDICTIVE CONTINUITY / CONTROLLED DEMONSTRATION</p><h1 className="mt-5 max-w-3xl font-heading text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">See the recovery plan before downtime becomes delivery risk.</h1><p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">Machine Overwatch connects failure evidence, parts, alternate capacity, maintenance, and shipment commitments into a clear operator-approved path.</p><div className="mt-8 flex flex-wrap gap-3"><Button asChild><Link href="/dashboard">Explore demo <ArrowRight data-icon="inline-end" /></Link></Button><Button asChild variant="outline"><Link href="/sign-in?next=/dashboard">Sign in to demo</Link></Button></div><p className="mt-5 max-w-lg text-xs leading-5 text-muted-foreground">All figures are simulated scenario data. This interface does not control equipment, send external notices, or claim a plant connection.</p></div><div><HeroTwin machineId="WS-102" /><p className="mt-3 flex items-center gap-2 font-mono text-xs text-muted-foreground"><Box className="size-4" /> Demo asset: retained Haas VF-2SS CNC model, framed for the WS-102 scenario.</p></div></section><section className="border-y border-border bg-card"><div className="mx-auto max-w-7xl px-5 py-14 md:px-8"><div className="max-w-2xl"><p className="font-mono text-xs tracking-widest text-muted-foreground">FAILURE TO RECOVERY</p><h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.04em]">One causal chain, no hidden decision.</h2></div><div className="mt-8 grid gap-4 md:grid-cols-4">{chain.map(({ icon: Icon, title, text }) => <Card key={title}><CardHeader><Icon className="size-5" /><CardTitle className="font-heading">{title}</CardTitle></CardHeader><CardContent><CardDescription>{text}</CardDescription></CardContent></Card>)}</div></div></section></main>;
}
