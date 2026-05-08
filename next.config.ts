import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qptfcfirgdgecglsxhbv.supabase.co',
      },
    ],
  },
};

export default nextConfig;
