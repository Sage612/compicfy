import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username }     = await params
    const { searchParams } = new URL(request.url)
    const supabase         = await createClient()

    // Resolve username → id
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const page   = parseInt(searchParams.get('page')  ?? '1')
    const limit  = parseInt(searchParams.get('limit') ?? '24')
    const type   = searchParams.get('type')   ?? ''
    const genre  = searchParams.get('genre')  ?? ''
    const status = searchParams.get('status') ?? ''
    const sort   = searchParams.get('sort')   ?? 'recent'
    const q      = searchParams.get('q')      ?? ''
    const offset = (page - 1) * limit

    // Build query — always exclude adult/mature on public profile page
    let query = (supabase as any)
      .from('recommendations')
      .select('*', { count: 'exact' })
      .eq('user_id', profile.id)
      .eq('is_approved', true)
      .not('content_rating', 'in', '("adult","mature")')

    if (q)      query = query.or(`title.ilike.%${q}%,author.ilike.%${q}%,artist.ilike.%${q}%`)
    if (type)   query = query.eq('type', type)
    if (genre)  query = query.contains('genres', [genre])
    if (status) query = query.eq('status', status)

    if      (sort === 'top')    query = query.order('score',      { ascending: false })
    else if (sort === 'votes')  query = query.order('upvotes',    { ascending: false })
    else if (sort === 'trending') query = query.order('daily_votes', { ascending: false })
    else                        query = query.order('created_at', { ascending: false })

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Profile recs error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      recommendations: data ?? [],
      total:   count  ?? 0,
      page,
      limit,
      hasMore: (count ?? 0) > offset + limit,
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}