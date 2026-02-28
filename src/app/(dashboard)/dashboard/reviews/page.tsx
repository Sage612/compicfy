import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Star, BookOpen } from 'lucide-react'
import { StarRating } from '@/components/recommendations/StarRating'
import { formatDate } from '@/lib/utils/format'
import type { Metadata } from 'next'
import type { Review } from '@/types/database.types'

export const metadata: Metadata = { title: 'My Reviews' }

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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Star size={22} />
          My Reviews
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {reviews?.length ?? 0} review{reviews?.length !== 1 ? 's' : ''} written
        </p>
      </div>

      {!reviews?.length ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Star size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
          <h3 className="font-semibold mb-1">No reviews yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Visit a comic and write your first review
          </p>
          <Link href="/browse" className="text-primary hover:underline text-sm">
            Browse Comics →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const rec = review.recommendations 
            return (
              <Link
                key={review.id}
                href={`/comic/${rec?.id}`}
                className="flex gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors"
              >
                {/* Cover */}
                <div className="w-12 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                  {rec?.cover_url ? (
                    <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={14} className="text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm truncate">{rec?.title}</h3>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                  {review.rating && (
                    <StarRating value={review.rating} readonly size={13} />
                  )}
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {review.content}
                  </p>
                  {review.contains_spoilers && (
                    <span className="text-xs text-yellow-600">⚠️ Contains spoilers</span>
                  )}
                  {review.is_edited && (
                    <span className="text-xs text-muted-foreground italic">Edited</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}