import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { enforceCollectionLimit } from '@/lib/utils/proEnforce'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const userId   = searchParams.get('user_id')
    const contains = searchParams.get('contains')
    // FIX: limit was previously uncapped — ?limit=100000 went straight
    // into .range(), pulling the entire table in one response.
    const page     = Math.max(parseInt(searchParams.get('page') ?? '1') || 1, 1)
    const limit    = Math.min(parseInt(searchParams.get('limit') ?? '12') || 12, 50)
    const offset   = (page - 1) * limit

    if (contains) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ collections: [] })

      const { data, error } = await (supabase as any)
        .from('collections')
        .select(`id, title, collection_items!inner(recommendation_id)`)
        .eq('user_id', user.id)
        .eq('collection_items.recommendation_id', contains)

      if (error) throw error
      return NextResponse.json({ collections: data ?? [] })
    }

    let query = (supabase as any)
      .from('collections')
      .select(`
        *,
        profiles!collections_user_id_fkey(username, display_name, avatar_url, is_pro, role),
        collection_items(recommendations(cover_url))
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const mine = searchParams.get('mine') === 'true'

    if (mine) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ collections: [], total: 0, hasMore: false })
      query = query.eq('user_id', user.id)
    } else if (userId) {
      query = query.eq('user_id', userId)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        query = query.or(`user_id.eq.${user.id},is_published.eq.true`)
      } else {
        query = query.eq('is_published', true)
      }
    }

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({
      collections: data ?? [],
      total:   count ?? 0,
      hasMore: (count ?? 0) > offset + limit,
    })
  } catch (err) {
    console.error('Collections GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ── Single source of truth via proEnforce ──────────────────────
    const { allowed, error: limitError } = await enforceCollectionLimit(user.id)
    if (!allowed) return limitError!

    const { title, description, cover_url, theme_color, is_published } = await request.json()

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 })
    }

    const { data, error } = await (supabase as any)
      .from('collections')
      .insert({
        user_id:      user.id,
        title:        title.trim(),
        description:  description  || null,
        cover_url:    cover_url    || null,
        theme_color:  theme_color  || 'primary',
        is_published: is_published ?? false,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ collection: data }, { status: 201 })
  } catch (err) {
    console.error('Collections POST error:', err)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
