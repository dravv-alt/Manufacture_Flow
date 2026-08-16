"use client";

/**
 * REDUNDANT — replaced by FailureViews and the shared operational workflow state.
 * Retained intact for review; do not import into active routes.
 */

import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock3, PackageSearch, Route, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FailureWorkflowPanel } from "@/components/FailureWorkflowPanel";

// demo_data
export function FailureControl() {
  return (
    <main className="px-5 py-7 md:px-8 md:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="border-l-4 border-destructive bg-muted px-6 py-7 md:px-8">
          <div className="flex flex-wrap items-center gap-3"><Badge variant="destructive">CRITICAL CASE</Badge><span className="font-mono text-xs text-muted-foreground">DEMO DATA / FC-2024-0047 / DETECTED 03:14 IST</span></div>
          <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-3xl"><p className="font-mono text-xs text-muted-foreground">WS-102 / HAAS VF-2SS CNC / LINE L-03</p><h1 className="mt-2 font-heading text-4xl font-semibold tracking-[-0.04em] md:text-5xl">Servo bearing failure risk requires containment.</h1><p className="mt-3 text-base leading-7 text-muted-foreground">BRG-10023 / X-Axis Servo Assembly / 92% predicted failure probability / 18-hour decision window.</p></div>
            <Button asChild><Link href="/rerouting"><Route data-icon="inline-start" />Review routing impact</Link></Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <CaseMetric icon={ShieldAlert} label="Allocation state" value="BLOCKED" />
          <CaseMetric icon={AlertTriangle} label="Failure probability" value="92%" destructive />
          <CaseMetric icon={Clock3} label="Time to failure" value="18h" />
          <CaseMetric icon={PackageSearch} label="Bearing available" value="3 units" />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
          <FailureWorkflowPanel />
          <Card>
            <CardHeader><CardTitle className="font-heading">Impact register</CardTitle><CardDescription>What this case changes before the machine is stopped.</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Impact title="Production" detail="J1001 is held from the WS-102 allocation queue." link="/rerouting" linkLabel="Open re-routing" />
              <Impact title="Inventory" detail="BRG-10023 must be reserved before maintenance begins." link="/warehouse" linkLabel="Open warehouse" />
              <Impact title="Procurement" detail="Expedite is proposed only if the reserve threshold falls." link="/procurement" linkLabel="Open procurement" />
              <Impact title="Shipment" detail="SO-8841 promise remains visible until recovery approval." link="/shipment" linkLabel="Open shipment" />
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function CaseMetric({ icon: Icon, label, value, destructive = false }: { icon: typeof AlertTriangle; label: string; value: string; destructive?: boolean }) {
  return <Card><CardHeader className="gap-2"><Icon className="size-4 text-muted-foreground" /><CardDescription>{label}</CardDescription><CardTitle className={destructive ? "font-heading text-2xl text-destructive" : "font-heading text-2xl"}>{value}</CardTitle></CardHeader></Card>;
}

function Impact({ title, detail, link, linkLabel }: { title: string; detail: string; link: string; linkLabel: string }) {
  return <div className="rounded-md border border-border p-4"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p><Link href={link} className="mt-3 inline-flex items-center text-sm font-medium underline-offset-4 hover:underline">{linkLabel}<ArrowRight className="ml-1 size-4" /></Link></div>;
}
