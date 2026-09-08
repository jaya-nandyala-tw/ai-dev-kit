import type { NextConfig } from "next";

// This tool is local-only by design (it shells out to real setup scripts and writes to the
// parent repo checkout). Never bind it beyond localhost — see README.md and lib/hostGuard.ts.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
