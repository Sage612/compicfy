import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { entity_type, entity_id, reason, details } = body

  // Validate required fields
  if (!entity_type || !entity_id || !reason) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Validate entity_type is allowed
  const allowedTypes = ['recommendation', 'review', 'user', 'comment']
  if (!allowedTypes.includes(entity_type)) {
    return NextResponse.json({ error: 'Invalid entity_type' }, { status: 400 })
  }

  // Prevent duplicate reports from same user on same entity
  const { data: existing } = await (supabase as any)
    .from('reports')
    .select('id')
    .eq('reporter_id', user.id)
    .eq('entity_id', entity_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Already reported' }, { status: 409 })
  }

  const { error: insertError } = await (supabase as any)
    .from('reports')
    .insert({
      reporter_id: user.id,
      entity_type,
      entity_id,
      reason,
      details: details ?? null,
      status: 'pending',
    })

  if (insertError) {
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}