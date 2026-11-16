import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@stanford-press/core",
    "@stanford-press/database",
    "@stanford-press/ui",
  ],
};

export default nextConfig;
