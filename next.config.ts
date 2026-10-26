import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Nearly every screen is personalised (your calendar, your bookings), so the
  // app uses the standard request-time rendering model rather than Cache Components.
  cacheComponents: false,
  async headers() {
    return [
      {
        // The service worker must never be served stale.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
