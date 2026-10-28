import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // One copy of Yjs for every route, so live rooms share their documents
  serverExternalPackages: ["yjs"],
  experimental: {
    // Test case uploads go through server actions
    serverActions: { bodySizeLimit: "20mb" },
  },
};

export default nextConfig;
