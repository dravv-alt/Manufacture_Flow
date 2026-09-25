import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel performs its own server tracing. With Next 16.3's Vercel adapter,
  // combining that adapter with standalone output can fail on the missing
  // next-server.js.nft.json manifest. Docker/Railway still needs standalone.
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
