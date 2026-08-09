import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { demoEnvironment } from "@/demo-data/environment";

// demo_data
const statusSamples = [
  { label: "Systems nominal", variant: "secondary" as const },
  { label: "Observation required", variant: "outline" as const },
  { label: "Allocation blocked", variant: "destructive" as const },
];

export default function DesignSystemPage() {
  return (
    <main className="min-h-full bg-background px-5 py-8 md:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="flex flex-col gap-5 border-b border-border pb-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">DEMO DATA · FOUNDATION REVIEW</Badge>
            <span className="font-mono text-xs text-muted-foreground">{demoEnvironment.plant}</span>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="font-sans text-sm font-medium text-muted-foreground">Machine Overwatch / Design System</p>
              <h1 className="font-heading text-4xl font-semibold tracking-[-0.035em] text-foreground md:text-6xl">
                Industrial clarity. No visual noise.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                A restrained interface foundation for high-consequence plant decisions: white space, graphite structure, and operational states that earn attention.
              </p>
            </div>
            <Button>Review foundation</Button>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Manrope</CardTitle>
              <CardDescription>Display and decision headings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-3xl font-semibold tracking-tight">WS-102 at risk</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">IBM Plex Sans</CardTitle>
              <CardDescription>Interface and operational reading</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-sans text-base leading-7">Maintenance action is scoped, readable, and deliberately calm.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">IBM Plex Mono</CardTitle>
              <CardDescription>Telemetry and identifiers</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-sm">WS-102 · BRG-10023 · TTF 18h</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-border bg-twin-canvas text-primary-foreground">
            <CardHeader>
              <CardTitle className="font-heading text-primary-foreground">Digital twin canvas</CardTitle>
              <CardDescription className="text-primary-foreground/65">A graphite stage reserved for the plant model—not a neon dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="flex min-h-44 flex-col justify-between gap-6">
              <p className="font-mono text-sm text-primary-foreground/75">SCENE / WS-102 / CAMERA-A</p>
              <div className="h-px bg-primary-foreground/20" />
              <p className="font-sans text-sm text-primary-foreground/75">3D implementation intentionally begins only after this foundation is approved.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Operational states</CardTitle>
              <CardDescription>Meaning before decoration</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {statusSamples.map((status) => (
                  <Badge key={status.label} variant={status.variant}>{status.label}</Badge>
                ))}
              </div>
              <Separator />
              <p className="font-mono text-xs text-muted-foreground">{demoEnvironment.workstations} workstations / {demoEnvironment.activeRisks} controlled scenario</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
