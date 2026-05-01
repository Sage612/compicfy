import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/utils/requireRole'
import { logAction } from '@/lib/utils/admin'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireRole(false)
  if (auth.error) return auth.error

  const { user, supabase } = auth
  const db = supabase as any

  const body = await request.json()
  const { status, resolution_note } = body

  if (!['resolved', 'dismissed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { data, error } = await db
    .from('reports')                          // ← correct table (was 'reviews' before)
    .update({
      status,
      resolution_note: resolution_note ?? null,
      resolved_by:     user!.id,
      resolved_at:     new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Report update error:', error)
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 })
  }

  await logAction(db, user!.id, `report ${status}`, 'report', id, id, {
    status,
    resolution_note,
  })

  return NextResponse.json({ report: data })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireRole(false)
  if (auth.error) return auth.error

  const { user, supabase } = auth
  const db = supabase as any

  await db.from('reports').delete().eq('id', id)
  await logAction(db, user!.id, 'deleted report', 'report', id, id)

  return NextResponse.json({ success: true })
}