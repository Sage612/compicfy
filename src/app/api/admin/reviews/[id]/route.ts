import { NextResponse } from 'next/server'
import { requireAdmin, logAction } from '@/lib/utils/admin'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, status, user, supabase } = await requireAdmin()
  if (error) return NextResponse.json({ error }, { status })
  const db = supabase as any

  const { data: review } = await db.from('reviews').select('content, user_id').eq('id', id).single()
  await db.from('reviews').delete().eq('id', id)
  await logAction(db, user!.id, 'deleted review', 'review', id, id, {
    content_preview: review?.content?.slice(0, 100),
  })
  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, status, user, supabase } = await requireAdmin()
  if (error) return NextResponse.json({ error }, { status })
  const db = supabase as any

  const body = await request.json()
  const { data, error: updateError } = await db.from('reviews').update({ is_approved: body.is_approved }).eq('id', id).select().single()
  if (updateError) return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  await logAction(db, user!.id, body.is_approved ? 'approved review' : 'hidden review', 'review', id, id)
  return NextResponse.json({ review: data })
}