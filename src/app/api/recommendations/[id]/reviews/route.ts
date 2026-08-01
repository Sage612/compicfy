import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { reviewSchema } from '@/lib/utils/validators'
import { sendReviewNotificationEmail } from '@/lib/email/send'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit  = parseInt(searchParams.get('limit')  ?? '10')
    const offset = parseInt(searchParams.get('offset') ?? '0')

    const supabase = await createClient()

    const { data, error, count } = await supabase
      .from('reviews')
      .select('*, profiles(username, display_name, avatar_url), review_replies(*, profiles(username, display_name, avatar_url, role))', { count: 'exact' })
      .eq('recommendation_id', id)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    // Sort each review's replies oldest-first (a natural reading order for
    // a Q&A-style thread), since the nested select doesn't guarantee order.
    const reviews = (data ?? []).map((review: any) => ({
      ...review,
      review_replies: (review.review_replies ?? []).sort(
        (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    }))

    return NextResponse.json({
      reviews,
      total: count,
      hasMore: (count ?? 0) > offset + limit,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check if user already reviewed this comic
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('recommendation_id', id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'You have already reviewed this comic' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const normalized = {
      ...body,
      rating: body.rating ? Number(body.rating) : null,
    }

    const parsed = reviewSchema.safeParse(normalized)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data: review, error } = await ((supabase.from('reviews') as any)
      .insert({
        user_id:            user.id,
        recommendation_id:  id,
        content:            parsed.data.content,
        rating:             parsed.data.rating ?? null,
        contains_spoilers:  parsed.data.contains_spoilers,
      })
      .select('*, profiles(username, display_name, avatar_url)')
      .single())

    if (error) throw error

    // Notify comic owner — don't notify yourself
    try {
      const [{ data: rec }, { data: reviewer }] = await Promise.all([
        (supabase as any).from('recommendations').select('user_id, title').eq('id', id).single(),
        (supabase as any).from('profiles').select('username, display_name').eq('id', user.id).single(),
      ])

      if (rec && rec.user_id !== user.id) {
        const reviewerUsername = reviewer?.username ?? 'someone'
        const reviewerName     = reviewer?.display_name || reviewerUsername
        const notifTitle       = `${reviewerName} reviewed your recommendation "${rec.title}"`

        // In-app + push notification (push handled by DB webhook via should_push)
        await (supabase as any).from('notifications').insert({
          user_id: rec.user_id,
          type:    'review',
          title:   notifTitle,
          content: parsed.data.content.slice(0, 100),
          should_push: true,
          data:    { recommendation_id: id, reviewer_id: user.id },
        })

        // Email notification — fire and forget
        sendReviewNotificationEmail(
          rec.user_id,
          reviewerUsername,
          rec.title,
          id,
          parsed.data.content
        ).catch(console.error)
      }
    } catch (notifError) {
      console.error('Notification error (non-fatal):', notifError)
    }

    return NextResponse.json({ review }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
}