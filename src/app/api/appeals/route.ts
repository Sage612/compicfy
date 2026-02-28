import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { type, target_id, appeal_text } = await request.json()

    if (!appeal_text?.trim()) {
      return NextResponse.json({ error: 'Appeal text required' }, { status: 400 })
    }
    const db = supabase as any

    if (type === 'recommendation') {
  const { error } = await db
    .from('recommendations')
    .update({
      appeal_text,
      appeal_status: 'pending',
      appeal_submitted_at: new Date().toISOString(),
    })
    .eq('id', target_id)
    .eq('user_id', user.id)
  if (error) throw error
} else if (type === 'ban') {
  const { error } = await db
    .from('profiles')
    .update({
      appeal_text,
      appeal_status: 'pending',
    })
    .eq('id', user.id)
    .eq('is_banned', true)
  if (error) throw error
}

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to submit appeal' }, { status: 500 })
  }
}