import type { NextConfig } from "next";
import path from "path";

const isDevelopment = process.env.NODE_ENV === "development";
const runtimeDistDir = process.env.APP_RUNTIME === "demo" ? ".next-demo" : ".next-live";

const nextConfig: NextConfig = {
  output: "standalone",
  // Next's dev lock lives under distDir. Live and Demo are separate
  // processes, so they must not share the same development lock directory.
  distDir: isDevelopment ? runtimeDistDir : ".next",
  turbopack: {
    root: path.resolve(process.cwd(), ".."),
  },
};

export default nextConfig;
