import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { NewsCarousel } from '@/components/news/NewsCarousel'
import { NewsCard } from '@/components/news/NewsCard'
import { NewsFilters } from '@/components/news/NewsFilters'
import type { News } from '@/types/database.types'

interface Props {
  searchParams: Promise<{
    category?: string
    q?: string
    page?: string
  }>
}

async function NewsGrid({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()

  const page = parseInt(params.page ?? '1')
  const limit = 12
  const offset = (page - 1) * limit

  let query = supabase
    .from('news')
    .select('*', { count: 'exact' })
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  if (params.category) query = query.eq('category', params.category)
  if (params.q) query = query.ilike('title', `%${params.q}%`)

  query = query.range(offset, offset + limit - 1)

  const { data, count } = await query
  const news = (data as News[]) ?? []
  const totalPages = Math.ceil((count ?? 0) / limit)

  if (!news.length) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <span className="text-5xl block mb-4">📰</span>
        <p className="font-semibold">No news found</p>
        <p className="text-sm mt-1">Check back soon for updates!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{count} article{count !== 1 ? 's' : ''}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {news.map((item) => (
          <NewsCard key={item.id} news={item} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          {page > 1 && (
            <a href={`/news?page=${page - 1}`} className="px-4 py-2 rounded-lg border border-border text-sm hover:border-primary transition-colors">
              ← Previous
            </a>
          )}
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <a href={`/news?page=${page + 1}`} className="px-4 py-2 rounded-lg border border-border text-sm hover:border-primary transition-colors">
              Next →
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export default async function NewsPage({ searchParams }: Props) {
  const supabase = await createClient()

  // Fetch featured news for carousel (top 5 most viewed)
  const { data: featuredNews } = await supabase
    .from('news')
    .select('*')
    .eq('is_published', true)
    .order('view_count', { ascending: false })
    .limit(5)

  const featured = (featuredNews as News[]) ?? []

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">News</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Latest updates from the manga & comics world
        </p>
      </div>

      {/* Featured carousel */}
      {featured.length > 0 && (
        <Suspense fallback={<div className="aspect-[16/9] max-h-96 rounded-2xl bg-muted animate-pulse" />}>
          <NewsCarousel news={featured} />
        </Suspense>
      )}

      {/* Filters */}
      <Suspense fallback={<div className="h-20 bg-muted/30 rounded-lg animate-pulse" />}>
        <NewsFilters />
      </Suspense>

      {/* News grid */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        }
      >
        <NewsGrid searchParams={searchParams} />
      </Suspense>
    </div>
  )
}