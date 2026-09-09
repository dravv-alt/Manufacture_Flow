"use client";

import Link from "next/link";
import { Check, Clock3, Mail, MessageCircle, Send, Truck, UserRoundCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOperations } from "@/contexts/OperationsContext";
import { OperationalPath } from "@/components/operations/OperationalPath";
import { demoProcurementStates } from "@/demo-data/ws102-scenario";
import { cn } from "@/lib/utils";

type RequestState = keyof typeof demoProcurementStates;

export function ProcurementControl() {
  const { state: operationsState, activeCase, runWorkflowCommand, pendingCommand } = useOperations();
  const state = operationsState.procurementState;
  const persistedRequest = activeCase?.procurementRequests[0];
  const workOrder = activeCase?.maintenanceWorkOrders[0];
  const vendorNotification = activeCase?.vendorNotifications[0];

  const fallbackRequest = {
    id: "PR-2026-0884",
    partId: "BRG-10023",
    partName: "Deep Groove Spindle Ball Bearing (SKF 6205-2RSH)",
    quantity: 1,
    requiredBy: "Today, 18:30 IST",
    linkedCase: activeCase?.failureCase.externalId ?? "FC-2026-0047",
    workOrderId: workOrder?.externalId ?? "WO-WS102-081",
    vendor: "Apex Motion Components / Pune Hub",
    contact: "dispatch@apexmotion.in",
  };

  const request = persistedRequest ? {
    id: persistedRequest.externalId,
    partId: activeCase?.part?.code ?? "BRG-10023",
    partName: activeCase?.part?.name ?? "Deep Groove Spindle Ball Bearing (SKF 6205-2RSH)",
    quantity: 1,
    requiredBy: new Date(persistedRequest.requiredBy).toLocaleString(),
    linkedCase: activeCase?.failureCase.externalId ?? "FC-2026-0047",
    workOrderId: workOrder?.externalId ?? "WO-WS102-081",
    vendor: persistedRequest.vendor,
    contact: vendorNotification?.recipientEmail ?? "dispatch@apexmotion.in",
  } : fallbackRequest;

  const current = demoProcurementStates[state];
  const projection = state === "acknowledged" && request ? [request.requiredBy, request.requiredBy] : state === "delayed" ? ["Vendor delay recorded", "Delivery projection requires recalculation"] : ["Pending response", "Pending response"];
  const stateCopy = demoProcurementStates;
  const setState = (procurementState: keyof typeof demoProcurementStates) => runWorkflowCommand({ type: "set_procurement_state", state: procurementState });
  const send = () => runWorkflowCommand({ type: "set_procurement_state", state: "sent" });

  return (
    <main className="px-5 py-7 md:px-8 md:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="flex flex-col gap-5 border-b border-border pb-7">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"><span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />ERP REQUISITIONS LINKED</span>
            <span className="font-mono text-xs text-muted-foreground">PROCUREMENT CONTROL / {request.id}</span>
          </div>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <h1 className="font-heading text-4xl font-semibold tracking-[-0.04em] md:text-5xl">Make the replenishment handoff auditable.</h1>
              <p className="mt-3 text-base leading-7 text-muted-foreground">Automated purchase requisition dispatched directly via SAP ERP Integration Gateway with expedited courier routing.</p>
            </div>
            <Badge variant={current.badge}>{current.label}</Badge>
          </div>
        </section>

        <OperationalPath
          title="Procurement to recovery"
          description="A clear operational handoff; no purchase authorization or external message is issued here."
          steps={[
            { id: "draft", label: "Request prepared", detail: "The unavailable-stock branch generated a reviewable requisition.", state: "complete" },
            { id: "send", label: "Vendor request", detail: state === "draft" ? "Awaiting operator send action." : "Request delivery is recorded in the controlled scenario.", state: state === "draft" ? "active" : "complete" },
            { id: "confirm", label: "Availability confirmation", detail: state === "acknowledged" ? "Vendor acknowledgement informs the recovery estimate." : state === "delayed" ? "Vendor delay is visible to the recovery plan." : "Awaiting vendor response.", state: state === "acknowledged" ? "complete" : state === "delayed" ? "blocked" : "active" },
            { id: "recover", label: "Maintenance recovery", detail: "Maintenance still owns the repair, test, and validation release.", state: state === "acknowledged" ? "active" : "upcoming" }
          ]}
        />

        <ProcurementVisualLayer requestId={request.id} vendor={request.vendor} partName={request.partName} quantity={request.quantity} requiredBy={request.requiredBy} state={state} />
        <ProcurementCoordinationDesk vendor={request.vendor} />

        <section data-story="procurement-result" className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Purchase requisition preview</CardTitle>
              <CardDescription>Typed request generated from the unavailable-stock recovery branch.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Part" value={`${request.partId} / ${request.partName}`} />
              <Field label="Quantity" value={`${request.quantity} unit`} />
              <Field label="Required by" value={request.requiredBy} />
              <Field label="Linked records" value={`${request.linkedCase} / ${request.workOrderId}`} />
              <Field label="Approved vendor" value={request.vendor} />
              <Field label="Vendor contact" value={request.contact} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Delivery projection</CardTitle>
              <CardDescription>Recovery estimate updates from the vendor response state.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Projection icon={Truck} label="Expected dispatch" value={projection[0]} />
              <Projection icon={Clock3} label="Expected delivery" value={projection[1]} />
              <Projection icon={UserRoundCheck} label="Recovery scenario" value={state === "acknowledged" ? "Vendor lead time + repair + validation" : "Awaiting vendor confirmation"} />
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Vendor-request delivery state</CardTitle>
            <CardDescription>{current.detail}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(["draft", "sent", "acknowledged", "delayed"] as RequestState[]).map((item) => (
                <button
                  key={item}
                  disabled={pendingCommand === "set_procurement_state"}
                  onClick={() => setState(item)}
                  className={cn("rounded-md border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60", state === item ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted")}
                >
                  <span className="font-mono text-xs">{stateCopy[item].label}</span>
                  <span className="mt-2 block text-sm">{stateCopy[item].detail}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {state === "draft" ? (
                <Button disabled={pendingCommand === "set_procurement_state"} onClick={send}>
                  <Send data-icon="inline-start" />{pendingCommand === "set_procurement_state" ? "Saving request..." : "Send vendor request"}
                </Button>
              ) : null}
              {state === "sent" ? (
                <Button disabled={pendingCommand === "set_procurement_state"} onClick={() => setState("acknowledged")}>
                  <Check data-icon="inline-start" />Record acknowledgement
                </Button>
              ) : null}
              {state === "acknowledged" ? (
                <Button variant="outline" disabled={pendingCommand === "set_procurement_state"} onClick={() => setState("delayed")}>
                  <Clock3 data-icon="inline-start" />Record delay
                </Button>
              ) : null}
              <Button variant="outline" disabled={pendingCommand === "set_procurement_state"} onClick={() => setState("draft")}>
                <Mail data-icon="inline-start" />Return to editable draft
              </Button>
            </div>
            <p className="font-mono text-xs text-muted-foreground">Recipients: Procurement Team / Maintenance Lead / Production Scheduler · external financial approval not configured</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-muted p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-mono text-sm font-medium">{value}</p></div>;
}

function Projection({ icon: Icon, label, value }: { icon: typeof Truck; label: string; value: string }) {
  return <div className="flex gap-3 rounded-md border border-border p-4"><Icon className="mt-0.5 size-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div></div>;
}

function ProcurementVisualLayer({ requestId, vendor, partName, quantity, requiredBy, state }: { requestId: string; vendor: string; partName: string; quantity: number; requiredBy: string; state: RequestState }) {
  const activeStep = state === "draft" ? 0 : state === "sent" ? 2 : state === "acknowledged" ? 3 : 2;
  const steps = ["Requested", "Approved", "Vendor notified", "In transit"];
  return (
    <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_18px_38px_rgba(0,0,0,0.035)]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
        <div className="min-w-40"><p className="text-xs font-semibold tracking-[0.06em] text-muted-foreground">ACTIVE REQUEST</p><strong className="mt-1 block font-mono text-2xl">{requestId}</strong></div>
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
          {steps.map((label, index) => (
            <div className="flex items-center gap-2" key={label}>
              <span className={cn("grid size-8 place-items-center rounded-full border text-xs", index <= activeStep ? "border-emerald-700 bg-emerald-700 text-white" : "border-border bg-muted text-muted-foreground")}>{index <= activeStep ? <Check className="size-4" /> : index + 1}</span>
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
        <div className="border-l border-border pl-5"><p className="text-xs font-semibold tracking-[0.06em] text-muted-foreground">TARGET ARRIVAL</p><strong className="mt-1 block text-sm">{requiredBy}</strong></div>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.5fr_0.9fr]">
        <div className="rounded-2xl border border-border bg-muted/50 p-5">
          <p className="text-xs font-semibold tracking-[0.06em] text-muted-foreground">REQUEST DETAILS</p>
          <p className="mt-3 text-lg font-semibold">{partName}</p>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{quantity} unit{quantity === 1 ? "" : "s"} requested</p>
        </div>
        <div className="rounded-2xl border border-border bg-muted/50 p-5">
          <div className="flex items-center justify-between gap-3">
            <div><p className="font-semibold">{vendor}</p><p className="mt-1 text-sm text-muted-foreground">Primary supplier conversation</p></div>
            <MessageCircle className="size-5 text-muted-foreground" />
          </div>
          <div className="mt-4 rounded-xl bg-card p-4 text-sm shadow-sm">
            <strong>System automated request</strong>
            <p className="mt-1 text-muted-foreground">Vendor request is {state === "draft" ? "ready for review" : "in the controlled workflow"}. Acknowledgement updates the recovery estimate.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-muted/50 p-5">
          <p className="text-xs font-semibold tracking-[0.06em] text-muted-foreground">RECOVERY IMPACT</p>
          <strong className="mt-3 block text-3xl">14h</strong>
          <p className="mt-1 text-sm text-muted-foreground">8h lead + 6h transit</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-card"><div className="h-full w-[58%] bg-primary" /></div>
        </div>
      </div>
    </section>
  );
}

function ProcurementCoordinationDesk({ vendor }: { vendor: string }) {
  const { state, runWorkflowCommand, pendingCommand } = useOperations();
  const [note, setNote] = useState("");
  const [showJump, setShowJump] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const legacyNotes = state.procurementNotes?.length ? state.procurementNotes : state.procurementNote ? [state.procurementNote] : [];
  const scrollToLatest = (behavior: ScrollBehavior = "smooth") => threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior });
  const sendNote = async () => {
    const trimmed = note.trim();
    if (!trimmed) return;
    if (await runWorkflowCommand({ type: "record_procurement_note", note: trimmed })) {
      setNote("");
      setShowJump(false);
    }
  };
  useEffect(() => {
    scrollToLatest();
  }, [legacyNotes.length]);
  const trackScroll = () => {
    const thread = threadRef.current;
    if (!thread) return;
    setShowJump(thread.scrollHeight - thread.scrollTop - thread.clientHeight > 24);
  };
  return (
    <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
      {/* Unified Obsidian Glass Console */}
      <div
        className="relative overflow-hidden rounded-[2rem] p-6 text-white shadow-[0_24px_50px_rgba(0,0,0,0.18)] md:p-7"
        style={{
          background: "linear-gradient(145deg, #18171f 0%, #100f16 100%)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        {/* Luminous atmospheric gradient orbs for specular glass refraction */}
        <div className="pointer-events-none absolute -top-24 -left-20 size-80 rounded-full bg-amber-500/20 blur-[80px]" />
        <div className="pointer-events-none absolute top-1/3 -right-24 size-80 rounded-full bg-emerald-500/20 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-72 rounded-full bg-violet-600/20 blur-[85px]" />

        {/* Background noise texture overlay to make the glass UI pop out */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.35'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
          }}
        />

        {/* Console Header */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <h2 className="font-heading text-2xl font-semibold tracking-tight text-white">Vendor Communications</h2>
            </div>
            <p className="mt-1 text-sm text-white/60">Live encrypted procurement channel · Replenishment coordination desk</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-4 py-1.5 backdrop-blur-xl shadow-inner">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            <span className="font-mono text-xs font-semibold text-white/95">{vendor}</span>
          </div>
        </div>

        {/* Glass Message Thread */}
        <div
          ref={threadRef}
          onScroll={trackScroll}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          className="relative z-10 my-5 h-72 space-y-4 overflow-y-auto pr-2"
        >
          {/* System Automated Request (Frosted Glass UI Textbox) */}
          <div
            className="relative max-w-[88%] overflow-hidden rounded-2xl p-4.5 text-white transition-all duration-200 hover:scale-[1.008]"
            style={{
              background: "linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 100%)",
              backdropFilter: "blur(20px) saturate(190%)",
              WebkitBackdropFilter: "blur(20px) saturate(190%)",
              border: "1px solid rgba(255, 255, 255, 0.22)",
              boxShadow: "inset 0 1px 1px 0 rgba(255, 255, 255, 0.35), 0 12px 36px 0 rgba(0, 0, 0, 0.4)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
                <strong className="text-sm font-semibold tracking-wide text-white">System Automated Request</strong>
              </div>
              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 font-mono text-[10px] text-white/80">EVENT #PO-INIT</span>
            </div>
            <p className="mt-2.5 text-sm leading-6 text-white/90">
              Purchase requisition created for <span className="font-mono font-semibold text-amber-300">BRG-10023</span>. Vendor acknowledgement updates the recovery projection in real time.
            </p>
          </div>

          {/* Current procurement state update (Emerald Frosted Glass UI Textbox) */}
          <div
            className="relative ml-auto max-w-[88%] overflow-hidden rounded-2xl p-4.5 text-white transition-all duration-200 hover:scale-[1.008]"
            style={{
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0.05) 100%)",
              backdropFilter: "blur(20px) saturate(190%)",
              WebkitBackdropFilter: "blur(20px) saturate(190%)",
              border: "1px solid rgba(52, 211, 153, 0.4)",
              boxShadow: "inset 0 1px 1px 0 rgba(110, 231, 183, 0.4), 0 12px 36px 0 rgba(0, 0, 0, 0.4)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                <strong className="text-sm font-semibold text-emerald-100">Procurement Control</strong>
              </div>
              <span className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-0.5 font-mono text-[10px] text-emerald-200">ACTIVE STATE</span>
            </div>
            <p className="mt-2.5 text-sm leading-6 text-emerald-100/90">{demoProcurementStates[state.procurementState].detail}</p>
          </div>

          {/* User Internal Notes (Amber Frosted Glass UI Textbox) */}
          {legacyNotes.map((message, index) => (
            <div
              key={`${message}-${index}`}
              className="relative ml-auto max-w-[88%] overflow-hidden rounded-2xl p-4.5 text-white transition-all duration-200 hover:scale-[1.008]"
              style={{
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(245, 158, 11, 0.05) 100%)",
                backdropFilter: "blur(20px) saturate(190%)",
                WebkitBackdropFilter: "blur(20px) saturate(190%)",
                border: "1px solid rgba(251, 191, 36, 0.45)",
                boxShadow: "inset 0 1px 1px 0 rgba(253, 230, 138, 0.4), 0 12px 36px 0 rgba(0, 0, 0, 0.4)",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                  <strong className="text-sm font-semibold text-amber-100">Internal Note {index + 1}</strong>
                </div>
                <span className="rounded-full border border-amber-400/40 bg-amber-500/20 px-2.5 py-0.5 font-mono text-[10px] text-amber-200">LOGGED</span>
              </div>
              <p className="mt-2.5 text-sm leading-6 text-amber-100/95">{message}</p>
            </div>
          ))}
        </div>

        {showJump ? (
          <button
            onClick={() => { scrollToLatest(); setShowJump(false); }}
            className="absolute bottom-20 left-1/2 z-20 min-h-9 -translate-x-1/2 rounded-full border border-white/30 bg-white/20 px-4 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all hover:bg-white/30 hover:scale-105"
          >
            Jump to latest ↓
          </button>
        ) : null}

        {/* Integrated Frosted Glass Input */}
        <form
          onSubmit={(event) => { event.preventDefault(); void sendNote(); }}
          className="relative z-10 flex items-center gap-3 rounded-2xl p-2 transition-all duration-300 focus-within:border-amber-400/80 focus-within:shadow-[0_0_0_3px_rgba(251,191,36,0.25),0_12px_36px_rgba(0,0,0,0.5)]"
          style={{
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.10) 0%, rgba(255, 255, 255, 0.03) 100%)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "inset 0 1px 1px 0 rgba(255, 255, 255, 0.25), 0 8px 24px 0 rgba(0, 0, 0, 0.35)",
          }}
        >
          <label className="sr-only" htmlFor="procurement-note">Record internal note</label>
          <input
            id="procurement-note"
            name="procurement-internal-note"
            autoComplete="off"
            spellCheck={false}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-w-0 flex-1 bg-transparent px-3.5 py-1.5 text-sm text-white outline-none placeholder:text-white/45"
            placeholder="Type internal operational note for recovery team (e.g. charter ETA)..."
          />
          <button
            type="submit"
            disabled={!note.trim() || pendingCommand === "record_procurement_note"}
            className="flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            style={{
              background: note.trim()
                ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                : "rgba(255, 255, 255, 0.12)",
              border: note.trim() ? "1px solid rgba(251, 191, 36, 0.6)" : "1px solid rgba(255, 255, 255, 0.18)",
            }}
            aria-label="Record procurement note"
          >
            <span>Send</span>
            <Send className="size-3.5" />
          </button>
        </form>
      </div>

      {/* Matching Obsidian Glass Stakeholders Panel */}
      <aside
        className="relative overflow-hidden rounded-[2rem] p-6 text-white shadow-[0_24px_50px_rgba(0,0,0,0.18)] md:p-7"
        style={{
          background: "linear-gradient(145deg, #18171f 0%, #100f16 100%)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <div className="pointer-events-none absolute -top-20 -right-20 size-60 rounded-full bg-emerald-500/15 blur-[70px]" />
        <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-5">
          <h2 className="font-heading text-2xl font-semibold text-white">Stakeholders</h2>
          <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">4 ACTIVE</span>
        </div>
        <div className="relative z-10 mt-5 space-y-3">
          <Stakeholder initials="SJ" name="Sarah Jenkins" role="Procurement Lead" status="Online" />
          <Stakeholder initials="DW" name="David Wu" role="Maintenance Lead" status="Acknowledged" />
          <Stakeholder initials="EL" name="Elena Rostova" role="Receiving Dock" status="Awaiting arrival" />
          <Stakeholder initials="SYS" name="Auto-Router" role="System agent" status="Monitoring" />
        </div>
        <Link
          href="/rerouting"
          className="relative z-10 mt-6 flex min-h-11 items-center justify-center rounded-xl border border-white/20 bg-white/[0.06] text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/[0.12]"
        >
          View active re-routes
        </Link>
      </aside>
    </section>
  );
}

function Stakeholder({ initials, name, role, status }: { initials: string; name: string; role: string; status: string }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-white/[0.08]"
      style={{
        background: "rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
      }}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 font-mono text-xs font-bold text-white shadow-inner">{initials}</span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-sm font-semibold text-white">{name}</strong>
        <small className="block truncate text-xs text-white/60">{role}</small>
      </span>
      <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" title={status} />
    </div>
  );
}
