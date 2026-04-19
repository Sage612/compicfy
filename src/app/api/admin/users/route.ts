import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/utils/requireRole'

export async function GET(request: Request) {
  const auth = await requireRole(true)
  if (auth.error) return auth.error

  const { supabase } = auth
  const { searchParams } = new URL(request.url)
  const q      = searchParams.get('q')      ?? ''
  const filter = searchParams.get('filter') ?? 'all'
  const page   = parseInt(searchParams.get('page') ?? '1')
  const limit  = 20
  const offset = (page - 1) * limit

  let query = supabase!
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('member_since', { ascending: false })
    .range(offset, offset + limit - 1)

  if (q)                    query = query.ilike('username', `%${q}%`)
  if (filter === 'banned')    query = query.eq('is_banned', true)
  if (filter === 'admin')     query = query.eq('role', 'admin')
  if (filter === 'moderator') query = query.eq('role', 'moderator')

  // Suspended: is_suspended = true AND suspended_until is either null
  // (indefinite) or still in the future (not yet expired)
  if (filter === 'suspended') {
    query = query
      .eq('is_suspended', true)
      .or(`suspended_until.is.null,suspended_until.gt.${new Date().toISOString()}`)
  }

  const { data, error: fetchError, count } = await query
  if (fetchError) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })

  return NextResponse.json({ users: data, total: count, hasMore: (count ?? 0) > offset + limit })
}