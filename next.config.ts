import type { NextConfig } from "next";

import withPWAInit, { runtimeCaching as defaultRuntimeCaching } from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  workboxOptions: {
    skipWaiting: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/maps\.googleapis\.com\/.*$/,
        handler: 'NetworkOnly',
      },
      {
        urlPattern: /^https:\/\/maps\.gstatic\.com\/.*$/,
        handler: 'NetworkOnly',
      },
      ...(defaultRuntimeCaching || []),
    ],
  },
  disable: process.env.NODE_ENV === 'development',
});

export default withPWA(nextConfig);
