import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'us-a.tapas.io',
      },
      {
        protocol: 'https',
        hostname: '*.webtoons.com',
      },
      {
        protocol: 'https',
        hostname: '*.comix.to',
      },
    ],
  },
  // Turbopack is enabled via --turbopack flag or next.config
  // No special config needed — it's the default dev server in Next 15
}

export default nextConfig
