import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Ekskluder yahoo-finance2 fra bundling (brukes kun server-side med dynamisk import)
  serverExternalPackages: ["yahoo-finance2"],
};

export default nextConfig;
