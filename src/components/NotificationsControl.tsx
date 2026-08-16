"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, CircleAlert, MailWarning, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { demoNotifications, type DemoNotification, type NotificationStatus } from "@/demo-data/ws102-scenario";
import { cn } from "@/lib/utils";

type Filter = "all" | NotificationStatus;

export function NotificationsControl() {
  const [filter, setFilter] = useState<Filter>("all");
  const [notices, setNotices] = useState<DemoNotification[]>(() => [...demoNotifications]);
  const visible = useMemo(() => filter === "all" ? notices : notices.filter((notice) => notice.status === filter), [filter, notices]);
  const update = (id: string, status: NotificationStatus) => setNotices((items) => items.map((item) => item.id === id ? { ...item, status } : item));

  return (
    <main className="px-5 py-7 md:px-8 md:py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="flex flex-col justify-between gap-5 border-b border-border pb-7 md:flex-row md:items-end"><div><div className="flex items-center gap-3"><Badge variant="outline">DEMO DATA</Badge><span className="font-mono text-xs text-muted-foreground">DELIVERY CENTER</span></div><h1 className="mt-4 font-heading text-4xl font-semibold tracking-[-0.04em]">Notifications and delivery state.</h1><p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">Every alert is linked to its operational record. A failed delivery is visible and retryable; an acknowledgement remains auditable.</p></div><Badge variant="destructive">{notices.filter((notice) => notice.status === "failed").length} FAILED</Badge></section>
        <div className="flex flex-wrap gap-2">{(["all", "unread", "failed", "acknowledged"] as Filter[]).map((option) => <Button key={option} variant={filter === option ? "default" : "outline"} size="sm" onClick={() => setFilter(option)}>{option === "all" ? "All" : option[0].toUpperCase() + option.slice(1)}</Button>)}</div>
        <Card><CardHeader><CardTitle className="font-heading">Delivery records</CardTitle><CardDescription>{visible.length} visible record{visible.length === 1 ? "" : "s"}</CardDescription></CardHeader><CardContent className="flex flex-col gap-3">{visible.map((notice) => <article key={notice.id} className={cn("flex flex-col gap-4 rounded-xl border p-4 md:flex-row md:items-center md:justify-between", notice.status === "failed" ? "border-destructive" : "border-border")}><div className="flex gap-3"><span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", notice.status === "failed" ? "bg-destructive text-primary-foreground" : notice.status === "unread" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{notice.status === "failed" ? <MailWarning className="size-4" /> : notice.status === "acknowledged" ? <Check className="size-4" /> : <CircleAlert className="size-4" />}</span><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{notice.title}</p><Badge variant={notice.status === "failed" ? "destructive" : notice.status === "unread" ? "outline" : "secondary"}>{notice.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{notice.detail}</p><p className="mt-2 font-mono text-[10px] text-muted-foreground">{notice.id}</p></div></div><div className="flex flex-wrap gap-2"><Button asChild variant="outline" size="sm"><Link href={notice.href}>Open record</Link></Button>{notice.status === "failed" ? <Button size="sm" onClick={() => update(notice.id, "unread")}><RotateCw data-icon="inline-start" />Retry</Button> : notice.status === "unread" ? <Button size="sm" onClick={() => update(notice.id, "acknowledged")}><Check data-icon="inline-start" />Acknowledge</Button> : null}</div></article>)}</CardContent></Card>
      </div>
    </main>
  );
}
