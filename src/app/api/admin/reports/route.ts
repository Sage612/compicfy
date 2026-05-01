import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/utils/requireRole'

export async function GET(request: Request) {
  const auth = await requireRole(false)
  if (auth.error) return auth.error

  const { supabase } = auth
  const { searchParams } = new URL(request.url)
  const filter = searchParams.get('filter') ?? 'pending'

  let query = (supabase as any)
    .from('reports')
    .select(`
      *,
      reporter:profiles!reports_reporter_id_fkey(
        id, username, display_name, avatar_url
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filter !== 'all') query = query.eq('status', filter)

  const { data: reports, error: fetchError, count } = await query
  if (fetchError) {
    console.error('Reports fetch error:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }

  // ── Fetch the actual reported content for each report ──────────────
  // We batch by entity_type to minimise round trips
  const recIds  = [...new Set((reports ?? []).filter((r: any) => r.entity_type === 'recommendation').map((r: any) => r.entity_id))]
  const revIds  = [...new Set((reports ?? []).filter((r: any) => r.entity_type === 'review').map((r: any) => r.entity_id))]
  const userIds = [...new Set((reports ?? []).filter((r: any) => r.entity_type === 'user').map((r: any) => r.entity_id))]

  const [recsRes, revsRes, usersRes] = await Promise.all([
    recIds.length > 0
      ? (supabase as any).from('recommendations').select('id, title, cover_url, type, user_id, profiles!recommendations_user_id_fkey(username)').in('id', recIds)
      : { data: [] },
    revIds.length > 0
      ? (supabase as any).from('reviews').select('id, content, rating, user_id, profiles!reviews_user_id_fkey(username)').in('id', revIds)
      : { data: [] },
    userIds.length > 0
      ? (supabase as any).from('profiles').select('id, username, display_name, avatar_url').in('id', userIds)
      : { data: [] },
  ])

  // Build lookup maps
  const recMap:  Record<string, any> = {}
  const revMap:  Record<string, any> = {}
  const userMap: Record<string, any> = {}

  ;(recsRes.data  ?? []).forEach((r: any) => { recMap[r.id]  = r })
  ;(revsRes.data  ?? []).forEach((r: any) => { revMap[r.id]  = r })
  ;(usersRes.data ?? []).forEach((r: any) => { userMap[r.id] = r })

  // Attach content to each report
  const enriched = (reports ?? []).map((report: any) => {
    let content = null
    if (report.entity_type === 'recommendation') content = recMap[report.entity_id]  ?? null
    if (report.entity_type === 'review')         content = revMap[report.entity_id]  ?? null
    if (report.entity_type === 'user')           content = userMap[report.entity_id] ?? null
    return { ...report, content }
  })

  return NextResponse.json({ reports: enriched, total: count })
}