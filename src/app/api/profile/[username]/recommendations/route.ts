import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username }     = await params
    const { searchParams } = new URL(request.url)
    const supabase         = await createClient()

    // Cast to any to prevent "Property 'id' does not exist on type 'never'"
    // This happens when database types are not explicitly passed to the client
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const offset = parseInt(searchParams.get('offset') ?? '0')
    const limit  = parseInt(searchParams.get('limit')  ?? '24')
    const type   = searchParams.get('type')   ?? ''
    const genre  = searchParams.get('genre')  ?? ''
    const status = searchParams.get('status') ?? ''
    const sort   = searchParams.get('sort')   ?? 'recent'
    const q      = searchParams.get('q')      ?? ''

    let query = (supabase as any)
      .from('recommendations')
      .select('*', { count: 'exact' })
      .eq('user_id', profile.id)
      .eq('is_approved', true)
      .not('content_rating', 'in', '("adult","mature")')

    if (type)   query = query.eq('type', type)
    if (genre)  query = query.contains('genres', [genre])
    if (status) query = query.eq('status', status)
    if (q)      query = query.ilike('title', `%${q}%`)

    if      (sort === 'top')   query = query.order('score',      { ascending: false })
    else if (sort === 'votes') query = query.order('upvotes',    { ascending: false })
    else                       query = query.order('created_at', { ascending: false })

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Profile recs API error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      recommendations: data ?? [],
      total:    count ?? 0,
      hasMore: (count ?? 0) > offset + limit,
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}