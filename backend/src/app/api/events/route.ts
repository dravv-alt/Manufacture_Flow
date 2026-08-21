import { and, asc, gt } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { workflowEvents } from "@/lib/db/schema";
import { publicRuntimeInfo } from "@/lib/runtime/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response(JSON.stringify({ error: "AUTHENTICATION_REQUIRED" }), { status: 401, headers: { "content-type": "application/json" } });
  const requestedCursor = new URL(request.url).searchParams.get("after");
  const initialCursor = requestedCursor && !Number.isNaN(Date.parse(requestedCursor)) ? new Date(requestedCursor) : new Date(Date.now() - 60_000);
  const encoder = new TextEncoder();
  let cursor = initialCursor;
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      send("connected", { runtime: publicRuntimeInfo(), cursor: cursor.toISOString() });
      const poll = async () => {
        if (closed) return;
        try {
          const rows = await db.select().from(workflowEvents).where(and(gt(workflowEvents.occurredAt, cursor))).orderBy(asc(workflowEvents.occurredAt)).limit(100);
          for (const row of rows) { cursor = row.occurredAt; send("workflow", row); }
          controller.enqueue(encoder.encode(`: heartbeat ${new Date().toISOString()}\n\n`));
        } catch (error) { send("stream-error", { message: error instanceof Error ? error.message : "Event stream unavailable." }); }
        timer = setTimeout(poll, 1500);
      };
      await poll();
    },
    cancel() { closed = true; if (timer) clearTimeout(timer); },
  });
  request.signal.addEventListener("abort", () => { closed = true; if (timer) clearTimeout(timer); });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" } });
}
