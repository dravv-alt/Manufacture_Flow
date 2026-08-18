import { NextResponse, type NextRequest } from "next/server";

const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const response = request.method === "OPTIONS"
    ? new NextResponse(null, { status: 204 })
    : NextResponse.next();

  if (origin === frontendOrigin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    response.headers.set("Vary", "Origin");
  }
  return response;
}

export const config = { matcher: "/api/:path*" };
