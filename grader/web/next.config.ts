import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Test case uploads go through server actions
    serverActions: { bodySizeLimit: "20mb" },
  },
};

export default nextConfig;
