import { NextRequest, NextResponse } from "next/server";

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return value.trim().replace(/\/$/, "");
  }
}

function allowedOrigins() {
  return (process.env.FRONTEND_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);
}

function corsHeaders(response: NextResponse, origin: string) {
  const requestedOrigin = normalizeOrigin(origin);
  const configuredOrigins = allowedOrigins();
  const localAliases = configuredOrigins.map((configuredOrigin) => configuredOrigin.replace("localhost", "127.0.0.1"));
  if (configuredOrigins.includes(requestedOrigin) || localAliases.includes(requestedOrigin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }
  response.headers.set("Vary", "Origin");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Accept, Content-Type, X-Telemetry-Api-Key, Last-Event-ID");
  response.headers.set("Access-Control-Max-Age", "600");
  return response;
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  if (request.method === "OPTIONS") return corsHeaders(new NextResponse(null, { status: 204 }), origin);
  return corsHeaders(NextResponse.next(), origin);
}

export const config = { matcher: "/api/:path*" };
