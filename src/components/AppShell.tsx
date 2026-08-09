"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Boxes, CalendarClock, Factory, HelpCircle, Route, Search, Settings, ShieldAlert, Truck, Warehouse } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Command center", icon: Factory },
  { href: "/failure/FC-2024-0047", label: "Failure control", icon: ShieldAlert },
  { href: "/rerouting", label: "Re-routing", icon: Route },
  { href: "/warehouse", label: "Warehouse", icon: Warehouse },
  { href: "/procurement", label: "Procurement", icon: Boxes },
  { href: "/maintenance", label: "Maintenance", icon: CalendarClock },
  { href: "/shipment", label: "Shipment", icon: Truck },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between gap-4 px-5 md:px-8">
          <Link href="/" className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-md bg-primary font-heading text-sm font-semibold text-primary-foreground">MO</span><span className="font-heading text-base font-semibold tracking-tight">Machine Overwatch</span></Link>
          <div className="hidden flex-1 items-center justify-end gap-4 md:flex"><Link href="/dashboard" className="flex h-10 w-full max-w-xs items-center gap-2 rounded-full border border-border bg-card px-4 text-sm text-muted-foreground hover:bg-muted"><Search className="size-4" />Open workstation explorer</Link><span className="flex items-center gap-2 font-mono text-xs text-muted-foreground"><span className="size-2 rounded-full bg-success" />SYSTEMS ONLINE</span><Link href="/notifications" className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Notifications"><Bell className="size-4" /></Link><button className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Help"><HelpCircle className="size-4" /></button></div>
          <Link href="/settings" className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Settings"><Settings className="size-4" /></Link>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1600px]">
        <aside className="hidden w-28 shrink-0 lg:block"><nav className="sticky top-24 mx-4 flex h-[calc(100vh-8rem)] flex-col items-center gap-3 rounded-[2rem] border border-border bg-card px-3 py-5 shadow-[0_18px_40px_rgba(0,0,0,0.08)]"><span className="flex size-10 items-center justify-center rounded-full bg-primary font-heading text-xs font-semibold text-primary-foreground">MO</span><div className="my-1 h-px w-8 bg-border" />{navigation.map((item) => { const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href); const Icon = item.icon; return <Link key={item.href} href={item.href} title={item.label} className={cn("flex size-11 items-center justify-center rounded-full transition-colors", active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><Icon className="size-4" /><span className="sr-only">{item.label}</span></Link>; })}<div className="mt-auto flex size-9 items-center justify-center rounded-full bg-muted font-mono text-[10px] text-muted-foreground">IAI</div></nav></aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
