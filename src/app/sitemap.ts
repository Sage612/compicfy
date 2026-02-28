import { createClient } from '@/lib/supabase/server'
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://compicfy.com'
  const supabase = await createClient()

 const { data: recommendations } = await supabase
  .from('recommendations')
  .select('id, updated_at')
  .eq('is_approved', true)
  .order('created_at', { ascending: false })
  .limit(1000) as { data: { id: string; updated_at: string }[] | null }

const { data: news } = await supabase
  .from('news')
  .select('slug, updated_at')
  .eq('is_published', true)
  .order('published_at', { ascending: false })
  .limit(500) as { data: { slug: string; updated_at: string }[] | null }

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/browse`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/news`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]

  const comicRoutes: MetadataRoute.Sitemap = (recommendations ?? []).map((rec) => ({
    url: `${baseUrl}/comic/${rec.id}`,
    lastModified: new Date(rec.updated_at),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const newsRoutes: MetadataRoute.Sitemap = (news ?? []).map((item) => ({
    url: `${baseUrl}/news/${item.slug}`,
    lastModified: new Date(item.updated_at),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [...staticRoutes, ...comicRoutes, ...newsRoutes]
}