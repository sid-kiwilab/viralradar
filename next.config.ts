import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    const noReferrer = [
      { key: "Referrer-Policy", value: "no-referrer" },
    ];
    return [
      { source: "/", headers: noReferrer },
      { source: "/:path*", headers: noReferrer },
    ];
  },
  turbopack: {
    rules: {
      // Tailwind must not process CSS modules — it strips rules like display:none.
      "*.module.css": {
        loaders: [],
        as: "*.css",
      },
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
