import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { canReplyToReview } from '@/lib/utils/reviewReplyAuth'

const MAX_REPLY_LENGTH = 2000

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  try {
    const { reviewId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { content } = await request.json()
    const trimmed = typeof content === 'string' ? content.trim() : ''

    if (!trimmed) {
      return NextResponse.json({ error: 'Reply cannot be empty' }, { status: 400 })
    }
    if (trimmed.length > MAX_REPLY_LENGTH) {
      return NextResponse.json({ error: `Reply must be ${MAX_REPLY_LENGTH} characters or fewer` }, { status: 400 })
    }

    const { allowed, reason } = await canReplyToReview(supabase, user.id, reviewId)
    if (!allowed) {
      return NextResponse.json({ error: reason ?? 'Not authorized to reply to this review' }, { status: 403 })
    }

    const { data: reply, error: insertError } = await (supabase as any)
      .from('review_replies')
      .insert({
        review_id: reviewId,
        user_id:   user.id,
        content:   trimmed,
      })
      .select('*, profiles(username, display_name, avatar_url, role)')
      .single()

    if (insertError) {
      console.error('Review reply insert error:', insertError)
      return NextResponse.json({ error: 'Failed to post reply' }, { status: 500 })
    }

    // Notify the review's author that they got a reply — don't notify
    // yourself if you're replying to your own review (e.g. a mod note).
    try {
      const { data: review } = await (supabase as any)
        .from('reviews')
        .select('user_id, recommendation_id, recommendations(title)')
        .eq('id', reviewId)
        .single()

      if (review && review.user_id !== user.id) {
        const { data: replier } = await (supabase as any)
          .from('profiles')
          .select('username, display_name')
          .eq('id', user.id)
          .single()

        const replierName = replier?.display_name || replier?.username || 'Someone'
        const comicTitle   = review.recommendations?.title ?? 'a comic'

        await (supabase as any).from('notifications').insert({
          user_id: review.user_id,
          type:    'reply',
          title:   `${replierName} replied to your review on "${comicTitle}"`,
          content: trimmed.slice(0, 100),
          should_push: true,
          data:    { recommendation_id: review.recommendation_id, review_id: reviewId, replier_id: user.id },
        })
      }
    } catch (notifError) {
      console.error('Reply notification error (non-fatal):', notifError)
    }

    return NextResponse.json({ reply }, { status: 201 })
  } catch (err) {
    console.error('Reply route unexpected error:', err)
    return NextResponse.json({ error: 'Failed to post reply' }, { status: 500 })
  }
}