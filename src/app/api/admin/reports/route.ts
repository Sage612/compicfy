import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/utils/admin'

export async function GET(request: Request) {
  const { error, status, supabase } = await requireAdmin()
  if (error) return NextResponse.json({ error }, { status })

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get('filter') ?? 'pending'

  let query = supabase!
    .from('reports')
    .select('*, profiles!reports_reporter_id_fkey(username, avatar_url)', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filter !== 'all') query = query.eq('status', filter)

  const { data, error: fetchError, count } = await query
  if (fetchError) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })

  return NextResponse.json({ reports: data, total: count })
}