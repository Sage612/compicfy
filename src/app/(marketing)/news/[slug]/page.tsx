import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { AffiliateBadge } from '@/components/news/AffiliateBadge'
import { NewsCard } from '@/components/news/NewsCard'
import { PremiumNewsGate } from '@/components/news/PremiumNewsGate'
import { Badge } from '@/components/ui/badge'
import { Calendar, Eye, ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatNumber } from '@/lib/utils/format'
import type { News } from '@/types/database.types'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('news')
    .select('title, excerpt')
    .eq('slug', slug)
    .single()

  const meta = data as { title: string; excerpt: string } | null

  return {
    title: meta?.title ?? 'News',
    description: meta?.excerpt,
  }
}

const categoryLabels: Record<string, string> = {
  industry:     '🏭 Industry',
  release:      '📚 New Release',
  adaptation:   '🎬 Adaptation',
  event:        '🎪 Event',
  creator:      '✍️ Creator',
  announcement: '📢 Announcement',
}

export default async function NewsDetailPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let userHasAccess = false

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_pro, pro_expires_at, role')
      .eq('id', user.id)
      .single() as { data: { is_pro: boolean; pro_expires_at: string | null; role: string } | null }

    if (profile) {
      const isPrivileged = ['admin', 'moderator'].includes(profile.role)
      const isPro = profile.is_pro &&
        (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date())
      userHasAccess = isPrivileged || isPro
    }
  }

  const { data } = await supabase
    .from('news')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!data) notFound()

  const news = data as News & {
    is_premium?: boolean
    premium_preview_lines?: number
    cover_alt?: string
  }

  await (supabase as any)
    .from('news')
    .update({ view_count: news.view_count + 1 })
    .eq('id', news.id)

  const { data: relatedData } = await supabase
    .from('news')
    .select('*')
    .eq('is_published', true)
    .eq('category', news.category)
    .neq('id', news.id)
    .order('published_at', { ascending: false })
    .limit(3)

  const related = (relatedData as News[]) ?? []

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link
        href="/news"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft size={15} />
        Back to News
      </Link>

      <article className="space-y-6">
        {news.cover_url && (
          <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-muted">
            <img
              src={proxyCover(news.cover_url)}
              alt={news.cover_alt ?? news.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {categoryLabels[news.category] ?? news.category}
            </Badge>
            {news.is_premium && (
              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                👑 Premium
              </Badge>
            )}
            {news.is_affiliate && (
              <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                💰 Affiliate
              </Badge>
            )}
            {news.is_ai_generated && (
              <Badge variant="outline" className="text-muted-foreground">
                🤖 AI Generated
              </Badge>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold leading-tight">{news.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              {formatDate(news.published_at)}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye size={14} />
              {formatNumber(news.view_count)} views
            </span>
            {news.author && <span>By {news.author}</span>}
          </div>
        </div>

        <p className="text-lg text-muted-foreground leading-relaxed border-l-4 border-primary pl-4">
          {news.excerpt}
        </p>

        <div className="prose prose-sm dark:prose-invert max-w-none">
          {news.is_premium && !userHasAccess ? (
            <PremiumNewsGate previewLines={news.premium_preview_lines ?? 3}>
              <div dangerouslySetInnerHTML={{ __html: news.content ?? '' }} />
            </PremiumNewsGate>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: news.content ?? '' }} />
          )}
        </div>

        {news.is_affiliate && news.affiliate_url && (
          <div className="p-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 space-y-3">
            <AffiliateBadge
              url={news.affiliate_url}
              disclaimer={news.affiliate_disclaimer}
            />
          </div>
        )}

        <div className="flex items-center gap-2 p-4 rounded-xl border border-border bg-card">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Original Source</p>
            <p className="text-sm font-medium">{news.source_name}</p>
          </div>
          <a
            href={news.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:border-primary transition-colors"
          >
            <ExternalLink size={13} />
            View Source
          </a>
        </div>

        {news.tags && news.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {news.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </article>

      {related.length > 0 && (
        <div className="mt-12 space-y-4">
          <h2 className="text-lg font-bold">Related News</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map((item) => (
              <NewsCard key={item.id} news={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}