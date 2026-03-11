import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { NewsCarousel } from '@/components/news/NewsCarousel'
import { NewsCard } from '@/components/news/NewsCard'
import { NewsFilters } from '@/components/news/NewsFilters'
import { Newspaper } from 'lucide-react'
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
  if (params.q)        query = query.ilike('title', `%${params.q}%`)

  query = query.range(offset, offset + limit - 1)

  const { data, count } = await query
  const news = (data as News[]) ?? []
  const totalPages = Math.ceil((count ?? 0) / limit)

  if (!news.length) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <Newspaper size={28} className="text-muted-foreground opacity-40" />
        </div>
        <p className="font-black text-lg">No news found</p>
        <p className="text-sm text-muted-foreground mt-1">Check back soon for updates!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {count} article{count !== 1 ? 's' : ''}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {news.map((item) => (
          <NewsCard key={item.id} news={item} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          {page > 1 && (
            <a
              href={`/news?page=${page - 1}`}
              className="px-4 py-2 rounded-xl border border-border bg-card text-sm font-semibold hover:border-primary/50 transition-colors"
            >
              ← Previous
            </a>
          )}
          <span className="text-sm text-muted-foreground font-medium">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <a
              href={`/news?page=${page + 1}`}
              className="px-4 py-2 rounded-xl border border-border bg-card text-sm font-semibold hover:border-primary/50 transition-colors"
            >
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

  const { data: featuredNews } = await supabase
    .from('news')
    .select('*')
    .eq('is_published', true)
    .order('view_count', { ascending: false })
    .limit(5)

  const featured = (featuredNews as News[]) ?? []

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">

      {/* ── PAGE HEADER ── */}
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Newspaper size={17} className="text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">News</h1>
          </div>
          <p className="text-muted-foreground text-sm pl-0.5">
            Latest updates from the manga &amp; comics world
          </p>
        </div>
      </div>

      {/* Featured carousel */}
      {featured.length > 0 && (
        <Suspense fallback={<div className="aspect-[16/9] max-h-96 rounded-2xl bg-muted animate-pulse" />}>
          <NewsCarousel news={featured} />
        </Suspense>
      )}

      {/* Divider */}
      <div className="relative flex items-center gap-4 py-1">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-border" />
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card shrink-0">
          <Newspaper size={12} className="text-muted-foreground" />
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">All Articles</span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border to-border" />
      </div>

      {/* Filters */}
      <Suspense fallback={<div className="h-20 bg-muted/30 rounded-xl animate-pulse" />}>
        <NewsFilters />
      </Suspense>

      {/* Grid */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        }
      >
        <NewsGrid searchParams={searchParams} />
      </Suspense>
    </div>
  )
}