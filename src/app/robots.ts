import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/reader/dashboard/',
          '/creator/dashboard/',
          '/pro/reader/dashboard/',
          '/pro/creator/dashboard/',
          '/admin/',
          '/api/',
        ],
      },
    ],
    sitemap: 'https://compicfy.com/sitemap.xml',
  }
}