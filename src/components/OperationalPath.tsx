"use client";

import { Check, Circle, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";

export type OperationalPathState = "complete" | "active" | "upcoming" | "blocked";

export interface OperationalPathStep {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly state: OperationalPathState;
}

/**
 * Target-owned presentation component inspired by the Stitch recovery-path layouts.
 * It intentionally accepts display-only state and owns no reference fixtures or domain data.
 */
export function OperationalPath({ title, description, steps }: { title: string; description: string; steps: readonly OperationalPathStep[] }) {
  return <section aria-label={title} className="rounded-xl border border-border bg-card p-5 shadow-sm"><div><h2 className="font-heading text-lg font-semibold">{title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p></div><ol className="mt-5 space-y-0">{steps.map((step, index) => <li key={step.id} className="relative flex gap-3 pb-5 last:pb-0"><span aria-hidden className={cn("z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background", step.state === "complete" && "border-primary bg-primary text-primary-foreground", step.state === "active" && "border-primary text-primary", step.state === "blocked" && "border-destructive text-destructive", step.state === "upcoming" && "border-border text-muted-foreground")}>{step.state === "complete" ? <Check className="size-3.5" /> : step.state === "active" ? <Clock3 className="size-3.5" /> : <Circle className="size-3" />}</span>{index < steps.length - 1 ? <span aria-hidden className="absolute left-3 top-6 h-[calc(100%-12px)] w-px bg-border" /> : null}<span className="min-w-0"><span className="block text-sm font-medium">{step.label}</span><span className="mt-0.5 block text-sm leading-5 text-muted-foreground">{step.detail}</span></span></li>)}</ol></section>;
}
