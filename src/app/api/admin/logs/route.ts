import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/utils/admin'

export async function GET(request: Request) {
  const { error, status, supabase } = await requireAdmin()
  if (error) return NextResponse.json({ error }, { status })

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

  // Normalise column names for frontend
  const logs = data?.map((log: any) => ({
    ...log,
    target_type: log.entity_type,
    target_id: log.entity_id,
  })) ?? []

  return NextResponse.json({ logs, total: count, hasMore: (count ?? 0) > offset + limit })
}