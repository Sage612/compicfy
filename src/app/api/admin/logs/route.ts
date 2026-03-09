import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/utils/requireRole'

export async function GET(request: Request) {
  const auth = await requireRole(true) // admin only
  if (auth.error) return auth.error

  const { supabase } = auth
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 50
  const offset = (page - 1) * limit

  const { data, error: fetchError, count } = await supabase!
    .from('activity_logs')
    .select('*, profiles(username, avatar_url)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (fetchError) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })

  const logs = data?.map((log: any) => ({
    ...log,
    target_type: log.entity_type,
    target_id: log.entity_id,
  })) ?? []

  return NextResponse.json({ logs, total: count, hasMore: (count ?? 0) > offset + limit })
}