"use client";

import { Crosshair } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CncExplodedScene } from "@/components/CncExplodedScene";

type CncExplodedInspectorProps = {
  selectedComponent: string;
  onSelectedComponentChange: (component: string) => void;
};

export function CncExplodedInspector({ selectedComponent }: CncExplodedInspectorProps) {
  return <Card className="overflow-hidden"><CardHeader className="border-b border-border bg-muted/35"><div className="flex items-center gap-2"><Crosshair className="size-4" /><CardTitle className="font-heading">WS-102 exploded diagnostic</CardTitle></div><CardDescription className="mt-1">Use the authored timeline, stage markers, and drag-orbit controls inside the CNC view.</CardDescription></CardHeader><CardContent className="p-4 lg:p-5"><CncExplodedScene progress={0} /><div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-muted/45 p-4"><Badge variant={selectedComponent === "bearing" ? "destructive" : "secondary"}>{selectedComponent === "bearing" ? "Bearing selected" : "Component selected"}</Badge><p className="text-sm text-muted-foreground">The linked component inspector above remains the accessible data alternative to the 3D diagnostic.</p></div></CardContent></Card>;
}
