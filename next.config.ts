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
      { protocol: 'https', hostname: 'placehold.co'           },
      { protocol: 'https', hostname: 'us-a.tapas.io'          },
      { protocol: 'https', hostname: '*.webtoons.com'         },
      { protocol: 'https', hostname: 'uploads.mangadex.org'   },
      { protocol: 'https', hostname: 'cdn.myanimelist.net'    },
      { protocol: 'https', hostname: 's4.anilist.co'          },
      { protocol: 'https', hostname: 'manta.net'              },
      // Common user-submitted cover sources
      { protocol: 'https', hostname: 'i.imgur.com'            },
      { protocol: 'https', hostname: 'cdn.discordapp.com'     },
      { protocol: 'https', hostname: 'pbs.twimg.com'          },
      { protocol: 'https', hostname: 'media.kitsu.io'         },
      { protocol: 'https', hostname: 'cdn.myanimelist.net'    },
      { protocol: 'https', hostname: 'image.tmdb.org'         },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // Google OAuth avatars
    ],
  },

  async headers() {
    return [
      // Cache manga search API
      {
        source: '/api/manga-search',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      // Security headers for all routes
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig