"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, CircleAlert, MailWarning, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOperations } from "@/contexts/OperationsContext";
import { apiFetch } from "@/lib/api-client";
import { demoNotifications, type DemoNotification, type NotificationStatus } from "@/demo-data/ws102-scenario";
import { cn } from "@/lib/utils";

type Filter = "all" | NotificationStatus;
type PersistedNotification = { id: string; subject: string; recipientRole: string; channel: string; state: NotificationStatus };
type NotificationAttempt = { id: string; notificationId: string; attemptNumber: number; state: NotificationStatus; actor: string; detail: string; occurredAt: string };

export function NotificationsControl() {
  const [filter, setFilter] = useState<Filter>("all");
  const [notices, setNotices] = useState<DemoNotification[]>(() => [...demoNotifications]);
  const [attempts, setAttempts] = useState<NotificationAttempt[]>([]);
  const { runWorkflowCommand, pendingCommand, commandError, clearCommandError } = useOperations();

  useEffect(() => {
    let active = true;
    void apiFetch("/api/failure-cases/FC-2026-0047", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ notifications: PersistedNotification[]; notificationAttempts: NotificationAttempt[] }> : null)
      .then((payload) => {
        if (!active || !payload?.notifications.length) return;
        setNotices(payload.notifications.map((notice) => ({
          id: notice.id,
          title: notice.subject,
          detail: `${notice.recipientRole} via ${notice.channel.replace("_", " ")}.`,
          status: notice.state,
          href: "/failure/FC-2026-0047",
        })));
        setAttempts(payload.notificationAttempts);
      })
      .catch(() => { /* Demo notification fixtures remain visible if the API is offline. */ });
    return () => { active = false; };
  }, [pendingCommand]);

  const visible = useMemo(() => filter === "all" ? notices : notices.filter((notice) => notice.status === filter), [filter, notices]);
  const update = async (notice: DemoNotification, status: NotificationStatus) => {
    await runWorkflowCommand(status === "acknowledged"
      ? { type: "acknowledge_notification", notificationId: notice.id }
      : { type: "retry_notification", notificationId: notice.id });
  };

  return <main className="px-5 py-7 md:px-8 md:py-10"><div className="mx-auto flex max-w-5xl flex-col gap-6">
    <section className="flex flex-col justify-between gap-5 border-b border-border pb-7 md:flex-row md:items-end"><div><div className="flex items-center gap-3"><Badge variant="outline">CONTROLLED DATA</Badge><span className="font-mono text-xs text-muted-foreground">DELIVERY CENTER</span></div><h1 className="mt-4 font-heading text-4xl font-semibold tracking-[-0.04em]">Notifications and delivery state.</h1><p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">Every alert is linked to its operational record. A failed delivery is visible and retryable; an acknowledgement is persisted in the audit timeline.</p></div><Badge variant="destructive">{notices.filter((notice) => notice.status === "failed").length} FAILED</Badge></section>
    {commandError ? <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive"><span>{commandError}</span><button className="underline" onClick={clearCommandError}>Dismiss</button></div> : null}
    <div className="flex flex-wrap gap-2">{(["all", "unread", "failed", "acknowledged"] as Filter[]).map((option) => <Button key={option} variant={filter === option ? "default" : "outline"} size="sm" onClick={() => setFilter(option)}>{option === "all" ? "All" : option[0].toUpperCase() + option.slice(1)}</Button>)}</div>
    <Card><CardHeader><CardTitle className="font-heading">Delivery records</CardTitle><CardDescription>{visible.length} visible record{visible.length === 1 ? "" : "s"}</CardDescription></CardHeader><CardContent className="flex flex-col gap-3">{visible.map((notice) => { const history = attempts.filter((attempt) => attempt.notificationId === notice.id); return <article key={notice.id} className={cn("flex flex-col gap-4 rounded-xl border p-4", notice.status === "failed" ? "border-destructive" : "border-border")}><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div className="flex gap-3"><span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", notice.status === "failed" ? "bg-destructive text-primary-foreground" : notice.status === "unread" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{notice.status === "failed" ? <MailWarning className="size-4" /> : notice.status === "acknowledged" ? <Check className="size-4" /> : <CircleAlert className="size-4" />}</span><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{notice.title}</p><Badge variant={notice.status === "failed" ? "destructive" : notice.status === "unread" ? "outline" : "secondary"}>{notice.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{notice.detail}</p><p className="mt-2 font-mono text-[10px] text-muted-foreground">{notice.id}</p></div></div><div className="flex flex-wrap gap-2"><Button asChild variant="outline" size="sm"><Link href={notice.href}>Open record</Link></Button>{notice.status === "failed" ? <Button size="sm" disabled={pendingCommand === "retry_notification"} onClick={() => update(notice, "unread")}><RotateCw data-icon="inline-start" />Retry</Button> : notice.status === "unread" ? <Button size="sm" disabled={pendingCommand === "acknowledge_notification"} onClick={() => update(notice, "acknowledged")}><Check data-icon="inline-start" />Acknowledge</Button> : null}</div></div>{history.length ? <div className="border-t border-border pt-3"><p className="font-mono text-[10px] font-semibold tracking-wide text-muted-foreground">DELIVERY HISTORY</p><div className="mt-2 space-y-2">{history.map((attempt) => <div key={attempt.id} className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>#{attempt.attemptNumber} · {attempt.detail} · {attempt.actor}</span><time>{new Date(attempt.occurredAt).toLocaleString()}</time></div>)}</div></div> : null}</article>; })}</CardContent></Card>
  </div></main>;
}
