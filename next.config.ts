import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page here is per-user and live (spots left, ratings), so we render on request.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
