import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a second instance (e.g. against scripts/fake-node.ts) run beside `next dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Directory URLs under /ipfs need their trailing slash so relative links in stored sites resolve.
  skipTrailingSlashRedirect: true,
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/ipfs/:cid*",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
};

export default nextConfig;
