import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/utils/admin'

export async function GET(request: Request) {
  const { error, status, supabase } = await requireAdmin()
  if (error) return NextResponse.json({ error }, { status })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  const filter = searchParams.get('filter') ?? 'all'
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 20
  const offset = (page - 1) * limit

  let query = supabase!
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('member_since', { ascending: false })
    .range(offset, offset + limit - 1)

  if (q) query = query.ilike('username', `%${q}%`)
  if (filter === 'banned') query = query.eq('is_banned', true)
  if (filter === 'admin') query = query.eq('role', 'admin')
  if (filter === 'moderator') query = query.eq('role', 'moderator')

  const { data, error: fetchError, count } = await query
  if (fetchError) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })

  return NextResponse.json({ users: data, total: count, hasMore: (count ?? 0) > offset + limit })
}