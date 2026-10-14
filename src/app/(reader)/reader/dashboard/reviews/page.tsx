import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Star, BookOpen } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { PageShell, PageHeader } from '@/components/dashboard/PageHeader'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Reviews' }

function proxyCover(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('data:')) return url
  if (url.startsWith('/')) return url
  if (url.includes('/api/image-proxy')) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

export default async function ReaderReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, content, rating, created_at, contains_spoilers, recommendations(id, title, cover_url, type)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const count = reviews?.length ?? 0

  return (
    <PageShell width="narrow">
      <PageHeader
        eyebrow="Library"
        title="Reviews"
        subtitle={`${count} ${count === 1 ? 'review' : 'reviews'} written`}
        backHref="/reader/dashboard"
        backLabel="Dashboard"
      />

      {!count ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-border space-y-3 text-center">
          <Star size={20} className="text-muted-foreground" />
          <div>
            <p className="font-dashboard-serif text-lg text-foreground">No reviews yet</p>
            <p className="text-sm text-muted-foreground mt-1">Leave a review on any comic you&apos;ve read.</p>
          </div>
          <Link href="/browse" className="text-xs text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors">
            Browse comics
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(reviews as any[]).map(review => {
            const rec = Array.isArray(review.recommendations) ? review.recommendations[0] : review.recommendations
            return (
              <article key={review.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Link href={`/comic/${rec?.id}`} className="w-12 h-16 rounded-md overflow-hidden bg-muted shrink-0">
                    {rec?.cover_url
                      ? <img src={proxyCover(rec.cover_url)} alt={rec.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><BookOpen size={14} className="text-muted-foreground/40" /></div>
                    }
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/comic/${rec?.id}`} className="font-dashboard-serif text-base text-foreground hover:text-muted-foreground transition-colors line-clamp-1">
                      {rec?.title ?? 'Unknown'}
                    </Link>
                    {review.rating && (
                      <div className="flex items-center gap-0.5 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={11}
                            className={i < review.rating ? 'fill-foreground/70 text-foreground/70' : 'text-muted-foreground/30'}
                          />
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(review.created_at)}</p>
                  </div>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{review.content}</p>
                {review.contains_spoilers && (
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60">Contains spoilers</p>
                )}
              </article>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}