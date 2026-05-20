import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const FREE_COLLECTION_LIMIT = 3

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const userId   = searchParams.get('user_id')
    const contains = searchParams.get('contains') // recommendation_id
    const page     = parseInt(searchParams.get('page')  ?? '1')
    const limit    = parseInt(searchParams.get('limit') ?? '12')
    const offset   = (page - 1) * limit

    // ── Special: return only the current user's collections that contain a given comic ──
    if (contains) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ collections: [] })

      const { data, error } = await (supabase as any)
        .from('collections')
        .select(`
          id, title,
          collection_items!inner(recommendation_id)
        `)
        .eq('user_id', user.id)
        .eq('collection_items.recommendation_id', contains)

      if (error) throw error

      return NextResponse.json({ collections: data ?? [] })
    }

    // ── Normal listing ──
    let query = (supabase as any)
      .from('collections')
      .select(`
        *,
        profiles!collections_user_id_fkey(username, display_name, avatar_url, is_pro, role),
        collection_items(count)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // If fetching own collections (dashboard / AddToCollectionButton), skip is_published filter
    if (userId) {
      query = query.eq('user_id', userId)
    } else {
      // Public discovery — only published
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Show own (published + draft) + others' published
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_pro, pro_expires_at')
      .eq('id', user.id)
      .single()

    const isProOrAdmin = (profile as any)?.role === 'admin' ||
      ((profile as any)?.is_pro &&
        (!(profile as any)?.pro_expires_at ||
          new Date((profile as any).pro_expires_at) > new Date()))

    if (!isProOrAdmin) {
      const { count } = await (supabase as any)
        .from('collections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if ((count ?? 0) >= FREE_COLLECTION_LIMIT) {
        return NextResponse.json(
          {
            error:   'limit_reached',
            message: `Free users can create up to ${FREE_COLLECTION_LIMIT} collections. Upgrade to Pro for unlimited.`,
          },
          { status: 403 }
        )
      }
    }

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