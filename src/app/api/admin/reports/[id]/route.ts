import { NextResponse } from 'next/server'
import { requireAdmin, logAction } from '@/lib/utils/admin'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, status, user, supabase } = await requireAdmin()
  if (error) return NextResponse.json({ error }, { status })

  const { status: reportStatus, resolution_note } = await request.json()

  const db = supabase as any

const { data, error: updateError } = await db
  .from('reports')
  .update({
    status: reportStatus,
    resolved_by: user!.id,
    resolved_at: new Date().toISOString(),
    resolution_note,
  })
  .eq('id', id)
  .select()
  .single()

  if (updateError) return NextResponse.json({ error: 'Failed to update' }, { status: 500 })

 await logAction(db, user!.id, `${reportStatus} report`, 'report', id, id, { resolution_note })

  return NextResponse.json({ report: data })
}