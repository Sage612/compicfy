import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Star, BookOpen, ExternalLink } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Reviews' }

export default async function ReaderReviewsPage() {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">My Reviews</h1>
          <p className="text-sm text-muted-foreground mt-1">{reviews?.length ?? 0} reviews written</p>
        </div>
      </div>

      {!reviews?.length ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <Star size={24} className="text-amber-500" />
          </div>
          <div className="text-center">
            <p className="font-black text-sm">No reviews yet</p>
            <p className="text-xs text-muted-foreground mt-1">Leave a review on any comic you've read.</p>
          </div>
          <Link href="/browse" className="text-xs text-primary font-semibold hover:underline">Browse comics →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(reviews as any[]).map(review => {
            const rec = Array.isArray(review.recommendations) ? review.recommendations[0] : review.recommendations
            return (
              <div key={review.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                    {rec?.cover_url
                      ? <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><BookOpen size={14} className="text-muted-foreground opacity-40" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/comic/${rec?.id}`} className="font-black text-sm hover:text-primary transition-colors line-clamp-1">
                        {rec?.title ?? 'Unknown'}
                      </Link>
                      <Link href={`/comic/${rec?.id}`}>
                        <ExternalLink size={12} className="text-muted-foreground shrink-0 mt-0.5" />
                      </Link>
                    </div>
                    {review.rating && (
                      <div className="flex items-center gap-0.5 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={11} className={i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'} />
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(review.created_at)}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{review.content}</p>
                {review.contains_spoilers && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    ⚠️ Contains spoilers
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
