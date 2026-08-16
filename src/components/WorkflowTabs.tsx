"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Route, ShieldAlert, Truck, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/failure", label: "Failure control", icon: ShieldAlert },
  { href: "/rerouting", label: "Re-routing", icon: Route },
  { href: "/maintenance", label: "Recovery", icon: Wrench },
  { href: "/shipment", label: "Shipment", icon: Truck },
] as const;

const publicRoutes = new Set(["/", "/sign-in", "/sign-up", "/forgot-password", "/check-email", "/onboarding"]);

export function WorkflowTabs() {
  const pathname = usePathname();
  if (publicRoutes.has(pathname)) return null;
  return <div className="border-b border-border bg-[#faf9f7]/90 px-4 py-2.5 md:px-6"><nav aria-label="Recovery workflow" className="mx-auto flex max-w-[1600px] items-center gap-1 overflow-x-auto"><span className="mr-2 hidden shrink-0 text-[10px] font-bold tracking-[0.14em] text-muted-foreground lg:inline">RECOVERY FLOW</span>{tabs.map(({ href, label, icon: Icon }) => { const active = pathname === href || pathname.startsWith(`${href}/`); return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", active ? "bg-[#252423] text-white shadow-sm" : "text-muted-foreground hover:bg-[#ece7e1] hover:text-foreground")}><Icon className="size-3.5" />{label}{href === "/rerouting" ? <span className={active ? "ml-1 rounded-full bg-amber-300 px-1.5 py-0.5 text-[9px] font-bold text-[#312500]" : "ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800"}>3</span> : null}</Link>; })}</nav></div>;
}
