"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { Check, CircleAlert, Clock3, PackageCheck, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// demo_data
const steps = [
  { label: "Acknowledge prediction", detail: "Failure case FC-2024-0047 is owned by the shift lead.", icon: CircleAlert },
  { label: "Contain allocation", detail: "New work is held from WS-102 until approval.", icon: ShieldCheck },
  { label: "Reserve BRG-10023", detail: "One bearing is committed to the recovery plan.", icon: PackageCheck },
  { label: "Assign maintenance", detail: "Technician and service window are confirmed.", icon: Wrench },
  { label: "Verify recovery", detail: "Release production only after post-maintenance checks.", icon: Check },
];

export function FailureWorkflowPanel() {
  const [activeStep, setActiveStep] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo("[data-workflow-step]", { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.32, stagger: 0.07, ease: "power2.out" });
  }, { scope: root });

  const advance = () => setActiveStep((current) => Math.min(current + 1, steps.length - 1));

  return (
    <Card ref={root}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><CardTitle className="font-heading">Failure recovery protocol</CardTitle><CardDescription>Each transition is a deliberate operator action.</CardDescription></div>
          <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground"><Clock3 className="size-4" /> 18h decision window</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {steps.map((step, index) => {
          const complete = index < activeStep;
          const active = index === activeStep;
          const Icon = step.icon;
          return (
            <button data-workflow-step key={step.label} onClick={() => setActiveStep(index)} className={cn("flex items-start gap-4 rounded-md border p-4 text-left transition-colors", active ? "border-primary bg-primary text-primary-foreground" : complete ? "border-border bg-muted" : "border-border bg-background hover:bg-muted")}>
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", active ? "bg-primary-foreground text-primary" : complete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}><Icon className="size-4" /></span>
              <span className="min-w-0"><span className="block text-sm font-semibold">{step.label}</span><span className={cn("mt-1 block text-sm leading-6", active ? "text-primary-foreground/75" : "text-muted-foreground")}>{step.detail}</span></span>
            </button>
          );
        })}
        <Button className="mt-2 self-start" onClick={advance} disabled={activeStep === steps.length - 1}>
          {activeStep === steps.length - 1 ? <Check data-icon="inline-start" /> : <ShieldCheck data-icon="inline-start" />}
          {activeStep === steps.length - 1 ? "Recovery ready for verification" : "Confirm next control"}
        </Button>
      </CardContent>
    </Card>
  );
}
