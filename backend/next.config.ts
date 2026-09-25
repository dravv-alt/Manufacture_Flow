import type { NextConfig } from "next";
import path from "path";

const isDevelopment = process.env.NODE_ENV === "development";
const runtimeDistDir = process.env.APP_RUNTIME === "demo" ? ".next-demo" : ".next-live";

const nextConfig: NextConfig = {
  // Vercel performs its own server tracing. Keep standalone for the
  // Railway/Docker backend image, but avoid the Next 16.3 Vercel adapter
  // conflict that expects an NFT manifest that is not emitted there.
  output: process.env.VERCEL ? undefined : "standalone",
  // Next's dev lock lives under distDir. Live and Demo are separate
  // processes, so they must not share the same development lock directory.
  distDir: isDevelopment ? runtimeDistDir : ".next",
  turbopack: {
    root: path.resolve(process.cwd(), ".."),
  },
};

export default nextConfig;
