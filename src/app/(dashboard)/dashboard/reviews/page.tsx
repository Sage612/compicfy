import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Star, BookOpen, ArrowRight, Sparkles, Search, } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StarRating } from '@/components/recommendations/StarRating'
import { formatDate } from '@/lib/utils/format'
import type { Metadata } from 'next'
import type { Review } from '@/types/database.types'

export const metadata: Metadata = { title: 'My Reviews' }

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-violet-500/10 text-violet-500 border-violet-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
}

export default async function MyReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: reviewsData } = await supabase
    .from('reviews')
    .select('*, recommendations(id, title, cover_url, type)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const reviews = (reviewsData ?? []) as (Review & {
    recommendations: { id: string; title: string; cover_url: string | null; type: string } | null
  })[]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Star size={16} className="text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">My Reviews</h1>
          </div>
          <p className="text-muted-foreground text-sm pl-0.5">
            {reviews.length} review{reviews.length !== 1 ? 's' : ''} written
          </p>
        </div>
        <Link href="/browse">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 shrink-0 border-border hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-200"
          >
            <Search size={14} />
            Browse Comics
          </Button>
        </Link>
      </div>

      {/* Empty state */}
      {!reviews.length ? (
        <div className="relative overflow-hidden text-center py-20 rounded-2xl border border-dashed border-border bg-card">

          {/* Background blobs */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-orange-500/5 blur-2xl pointer-events-none" />

          {/* Stacked star panels */}
          <div className="relative w-28 h-28 mx-auto mb-6">
            <div className="absolute top-0 left-2 w-16 h-22 rounded-xl border-2 border-border bg-muted/60 rotate-[-8deg]" />
            <div className="absolute top-2 left-5 w-16 h-22 rounded-xl border-2 border-border bg-muted/80 rotate-[-3deg]" />
            <div className="absolute top-4 left-8 w-16 h-22 rounded-xl border-2 border-amber-500/30 bg-card flex items-center justify-center shadow-lg">
              <Star size={20} className="text-amber-500/50" />
            </div>
          </div>

          <h3 className="font-black text-xl mb-2">No reviews yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto leading-relaxed">
            Browse comics and leave a review to help others find great reads.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/browse">
              <Button className="gap-2 bg-gradient-to-r from-primary to-violet-500 border-0 shadow-md shadow-primary/20 hover:opacity-90">
                <BookOpen size={14} />
                Browse Comics
              </Button>
            </Link>
            <Link href="/browse?sort=top">
              <Button variant="outline" className="gap-2 hover:border-primary/40 hover:text-primary transition-colors">
                <Sparkles size={14} />
                Top Rated
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const rec = review.recommendations
            const typeStyle = TYPE_COLORS[rec?.type ?? ''] ?? 'bg-muted text-muted-foreground border-border'
            return (
              <Link
                key={review.id}
                href={`/comic/${rec?.id}`}
                className="group flex gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200"
              >
                {/* Cover */}
                <div className="w-14 h-20 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm">
                  {rec?.cover_url ? (
                    <img
                      src={rec.cover_url}
                      alt={rec.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={14} className="text-muted-foreground opacity-40" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-black text-sm truncate group-hover:text-primary transition-colors">
                        {rec?.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${typeStyle}`}>
                          {rec?.type}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{formatDate(review.created_at)}</span>
                      </div>
                    </div>
                    <ArrowRight size={13} className="text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                  </div>

                  {review.rating && <StarRating value={review.rating} readonly size={13} />}

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {review.content}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap">
                    {review.contains_spoilers && (
                      <span className="text-[10px] text-amber-600 bg-amber-500/8 border border-amber-500/15 px-2 py-0.5 rounded-full font-semibold">
                        ⚠️ Spoilers
                      </span>
                    )}
                    {review.is_edited && (
                      <span className="text-[10px] text-muted-foreground italic">Edited</span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}