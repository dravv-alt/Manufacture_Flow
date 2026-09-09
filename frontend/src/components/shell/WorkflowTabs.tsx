"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, Check, FileText, Route, ShieldAlert, Truck, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOperations } from "@/contexts/OperationsContext";

const tabs = [
  { href: "/failure", label: "Failure", icon: ShieldAlert, phaseNumber: 1 },
  { href: "/warehouse", label: "Warehouse", icon: Boxes, phaseNumber: 2 },
  { href: "/procurement", label: "Procurement", icon: FileText, phaseNumber: 3 },
  { href: "/rerouting", label: "Re-routing", icon: Route, phaseNumber: 4 },
  { href: "/shipment", label: "Shipment", icon: Truck, phaseNumber: 5 },
  { href: "/maintenance", label: "Recovery", icon: Wrench, phaseNumber: 6 },
] as const;

const publicRoutes = new Set(["/", "/sign-in", "/sign-up", "/forgot-password", "/check-email", "/onboarding"]);

export function WorkflowTabs() {
  const pathname = usePathname();
  const { activeCase, state } = useOperations();

  if (publicRoutes.has(pathname)) return null;

  const isComplete = (href: string) => {
    if (!activeCase) return false;
    switch (href) {
      case "/failure":
        return Boolean(activeCase.failureCase);
      case "/warehouse":
        return Boolean(
          state.bearingReserved ||
          activeCase.resourceRecoveryResults?.some((r) => r.outcome === "reserved") ||
          activeCase.inventory?.some((i) => i.reserved > 0)
        );
      case "/procurement":
        return Boolean(activeCase.procurementRequests && activeCase.procurementRequests.length > 0);
      case "/rerouting":
        return Boolean(state.routingApproved || activeCase.reroutePlans?.some((p) => p.state === "approved"));
      case "/shipment":
        return Boolean(activeCase.shipmentImpacts && activeCase.shipmentImpacts.length > 0);
      case "/maintenance":
        return Boolean(activeCase.failureCase?.workflowState?.toLowerCase().includes("recovered"));
      default:
        return false;
    }
  };

  const workOrder = activeCase?.maintenanceWorkOrders?.[0];
  const stage = workOrder ? workOrder.stage : 0;

  return (
    <div className="border-b border-border bg-[#faf9f7]/95 px-4 py-2 backdrop-blur md:px-6">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
        <nav aria-label="Recovery workflow rail" className="flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="mr-2 hidden shrink-0 text-[10px] font-bold tracking-[0.16em] text-muted-foreground lg:inline">
            RECOVERY RAIL
          </span>
          {tabs.map(({ href, label, icon: Icon, phaseNumber }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            const completed = isComplete(href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group inline-flex min-h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active
                    ? "bg-[#252423] text-white shadow-sm"
                    : completed
                    ? "bg-emerald-50 text-emerald-900 hover:bg-emerald-100/70 border border-emerald-200/50"
                    : "text-muted-foreground hover:bg-[#ece7e1] hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-full text-[9px] font-bold",
                    active
                      ? "bg-amber-300 text-black"
                      : completed
                      ? "bg-emerald-600 text-white"
                      : "bg-black/10 text-black/60 group-hover:bg-black/15"
                  )}
                >
                  {completed ? <Check className="size-2.5 stroke-[3]" /> : phaseNumber}
                </span>

                <Icon className={cn("size-3.5", completed && !active ? "text-emerald-700" : "")} />
                <span>{label}</span>

                {href === "/rerouting" && !completed && (
                  <span className={active ? "ml-0.5 rounded-full bg-amber-300 px-1.5 py-0.2 text-[9px] font-bold text-[#312500]" : "ml-0.5 rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800"}>
                    3
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {activeCase && (
          <div className="hidden shrink-0 items-center gap-2 text-[10px] font-mono font-semibold text-muted-foreground xl:flex">
            <span className="rounded-full bg-[#f1eeea] px-2.5 py-1 text-black/70 border border-black/5">
              CASE: {activeCase.failureCase.externalId || (activeCase.failureCase.id?.length > 15 ? "FC-2026-0047" : activeCase.failureCase.id)}
            </span>
            {stage > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900 border border-amber-300/40">
                WO STAGE {stage}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
