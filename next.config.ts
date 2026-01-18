import type { NextConfig } from "next";

import withPWAInit from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
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
  },
});

export default withPWA(nextConfig);
