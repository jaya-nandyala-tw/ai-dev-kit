import type { NextConfig } from "next";

// This tool is local-only by design (it shells out to real setup scripts and writes to the
// parent repo checkout). Never bind it beyond localhost — see README.md and lib/hostGuard.ts.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // pdf-parse@1.x has a `!module.parent` debug-mode check that misfires when webpack bundles it
  // (module.parent comes back undefined), synchronously reading a test fixture path that doesn't
  // exist in this build and crashing page-data collection. Keeping it external forces a real
  // Node `require` at runtime instead, where `module.parent` is set correctly.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
