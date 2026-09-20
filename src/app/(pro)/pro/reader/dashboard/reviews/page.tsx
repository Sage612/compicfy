import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Star, BookOpen, ExternalLink, MessageSquare } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Reviews | Pro' }

function proxyCover(url: string | null | undefined): string {
  if (!url) return "" // Returning an empty string satisfies the 'string' requirement
  if (url.startsWith('data:')) return url
  if (url.startsWith('/')) return url
  if (url.includes('/api/image-proxy')) return url

  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}


export default async function ProReaderReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, content, rating, created_at, contains_spoilers, recommendations(id, title, cover_url, type)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <Star size={17} className="text-amber-500" />
          </div>
          <h1 className="text-xl font-black tracking-tight truncate">My Reviews</h1>
        </div>
        <p className="text-xs text-muted-foreground pl-0.5">{reviews?.length ?? 0} written</p>
      </div>

      {/* Empty */}
      {!reviews?.length ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border space-y-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <Star size={24} className="text-amber-500" />
          </div>
          <div>
            <p className="font-black text-sm">No reviews yet</p>
            <p className="text-xs text-muted-foreground mt-1">Browse comics and share your thoughts</p>
          </div>
          <Link href="/browse" className="text-xs text-primary font-semibold hover:underline">
            Browse comics →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(reviews as any[]).map(review => {
            const rec = Array.isArray(review.recommendations)
              ? review.recommendations[0]
              : review.recommendations

            return (
              <div key={review.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                {/* Comic info row */}
                <div className="flex items-center gap-3 p-3 border-b border-border/50">
                  <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                    {rec?.cover_url
                      ? <img src={proxyCover(rec.cover_url)} alt={rec.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <BookOpen size={12} className="text-muted-foreground opacity-40" />
                        </div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/comic/${rec?.id}`}
                      className="font-black text-sm hover:text-primary transition-colors line-clamp-1 block"
                    >
                      {rec?.title ?? 'Unknown comic'}
                    </Link>
                    {/* Star rating */}
                    {review.rating && (
                      <div className="flex items-center gap-0.5 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={11} className={cn(
                            i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                          )} />
                        ))}
                        <span className="text-[10px] text-muted-foreground ml-1">{review.rating}/5</span>
                      </div>
                    )}
                  </div>
                  <Link href={`/comic/${rec?.id}`} className="shrink-0">
                    <ExternalLink size={13} className="text-muted-foreground hover:text-primary transition-colors" />
                  </Link>
                </div>

                {/* Review content */}
                <div className="p-3 space-y-2">
                  {review.contains_spoilers && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                      ⚠️ Spoilers
                    </span>
                  )}
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {review.content}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">
                    {formatDate(review.created_at)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}