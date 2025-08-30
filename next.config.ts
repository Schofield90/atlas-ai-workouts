import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Note: api configuration has moved to route-specific settings in Next.js 13+
  // Use route segment config in individual API routes instead
};

export default nextConfig;
