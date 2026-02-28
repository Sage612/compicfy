import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { reviewSchema } from '@/lib/utils/validators'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') ?? '10')
    const offset = parseInt(searchParams.get('offset') ?? '0')

    const supabase = await createClient()

    const { data, error, count } = await supabase
      .from('reviews')
      .select('*, profiles(username, display_name, avatar_url)', { count: 'exact' })
      .eq('recommendation_id', id)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({
      reviews: data,
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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    const parsed = reviewSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data: review, error } = await ((supabase.from('reviews') as any)
      .insert({
        user_id: user.id,
        recommendation_id: id,
        content: parsed.data.content,
        rating: parsed.data.rating ?? null,
        contains_spoilers: parsed.data.contains_spoilers,
      })
      .select('*, profiles(username, display_name, avatar_url)')
      .single())

    if (error) throw error

    return NextResponse.json({ review }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
}