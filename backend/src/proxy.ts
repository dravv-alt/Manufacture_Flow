import { NextRequest, NextResponse } from "next/server";

function corsHeaders(response: NextResponse, origin: string) {
  const allowedOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
  if (origin === allowedOrigin || origin === allowedOrigin.replace("localhost", "127.0.0.1")) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Vary", "Origin");
  }
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, X-Telemetry-Api-Key, Last-Event-ID");
  return response;
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  if (request.method === "OPTIONS") return corsHeaders(new NextResponse(null, { status: 204 }), origin);
  return corsHeaders(NextResponse.next(), origin);
}

export const config = { matcher: "/api/:path*" };
