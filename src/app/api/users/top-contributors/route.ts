import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '6'), 20)

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, total_recommendations, total_votes_received, role, is_pro, pro_expires_at')
      .eq('is_banned', false)
      .not('role', 'eq', 'admin')         // exclude admins from the list
      .gt('total_recommendations', 0)      // must have at least 1 rec
      .order('total_recommendations', { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json({ users: data ?? [] })
  } catch (err) {
    console.error('[top-contributors] error:', err)
    return NextResponse.json({ users: [] }, { status: 500 })
  }
}