import { createClient } from '@/lib/supabase/server'
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  const { data: comics } = await supabase
    .from('recommendations')
    .select('id, updated_at')
    .eq('is_approved', true)
    .order('updated_at', { ascending: false })
    .limit(1000)

  const { data: news } = await supabase
    .from('news')
    .select('slug, updated_at')
    .eq('is_published', true)
    .order('updated_at', { ascending: false })
    .limit(200)

  const base = 'https://compicfy.cloud'
  const staticPages: MetadataRoute.Sitemap = [
    { url: base,               lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/browse`,   lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/news`,     lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: `${base}/affiliate`,lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${base}/about`,    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/faq`,      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]

 // For comics (Lines 32-37)
const comicPages: MetadataRoute.Sitemap = (comics as { id: string, updated_at: string }[] ?? []).map((comic) => ({
  url: `${base}/comic/${comic.id}`,
  lastModified: new Date(comic.updated_at),
  changeFrequency: 'weekly',
  priority: 0.8,
}))

// For news (Lines 39-44)
const newsPages: MetadataRoute.Sitemap = (news as { slug: string, updated_at: string }[] ?? []).map((article) => ({
  url: `${base}/news/${article.slug}`,
  lastModified: new Date(article.updated_at),
  changeFrequency: 'monthly',
  priority: 0.6,
}))

  return [...staticPages, ...comicPages, ...newsPages]
}