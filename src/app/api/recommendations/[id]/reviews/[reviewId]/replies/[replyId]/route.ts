import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; reviewId: string; replyId: string }> }
) {
  try {
    const { replyId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isStaff = profile?.role === 'admin' || profile?.role === 'moderator'

    // RLS also enforces this (author or staff only), but checking here
    // first lets us return a clear 403 instead of a generic delete
    // failure when RLS silently blocks an unauthorized attempt.
    let query = (supabase as any).from('review_replies').delete().eq('id', replyId)
    if (!isStaff) {
      query = query.eq('user_id', user.id)
    }

    const { error, count } = await query.select('id', { count: 'exact' })

    if (error) {
      console.error('Reply delete error:', error)
      return NextResponse.json({ error: 'Failed to delete reply' }, { status: 500 })
    }

    if (!count) {
      return NextResponse.json({ error: 'Reply not found or not authorized to delete it' }, { status: 403 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Reply delete unexpected error:', err)
    return NextResponse.json({ error: 'Failed to delete reply' }, { status: 500 })
  }
}