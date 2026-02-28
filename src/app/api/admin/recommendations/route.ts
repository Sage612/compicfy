import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/utils/admin'

export async function GET(request: Request) {
  try {
    const { error, status, supabase } = await requireAdmin()
    if (error) return NextResponse.json({ error }, { status })

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') ?? 'pending'
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = 20
    const offset = (page - 1) * limit

    let query = supabase!
      .from('recommendations')
      .select('*', { count: 'exact' })  // ← no join first
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (filter === 'pending') query = query.eq('is_approved', false).is('rejection_reason', null)
    else if (filter === 'approved') query = query.eq('is_approved', true)
    else if (filter === 'rejected') query = query.not('rejection_reason', 'is', null)
    else if (filter === 'featured') query = query.eq('is_featured', true)
    else if (filter === 'appeals') query = query.eq('appeal_status', 'pending')

    const { data, error: fetchError, count } = await query

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    return NextResponse.json({
      recommendations: data,
      total: count,
      hasMore: (count ?? 0) > offset + limit
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}