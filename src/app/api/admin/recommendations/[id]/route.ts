import { NextResponse } from 'next/server'
import { requireAdmin, logAction } from '@/lib/utils/admin'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, status, user, supabase } = await requireAdmin()
  if (error) return NextResponse.json({ error }, { status })

  const body = await request.json()
  const { action, reason, appeal_status, ...updateData } = body

  let updates: Record<string, any> = { ...updateData, updated_at: new Date().toISOString() }
  let logMsg = ''

  // Fetch recommendation for logging
  const { data: rec } = await (supabase!
    .from('recommendations')
    .select('title, user_id')
    .eq('id', id)
    .single() as any) as { data: { title: string; user_id: string } | null }

  switch (action) {
    case 'approve':
      updates = { ...updates, is_approved: true, rejection_reason: null, rejected_at: null, rejected_by: null }
      logMsg = 'approved recommendation'
      break
    case 'reject':
      updates = { ...updates, is_approved: false, rejection_reason: reason, rejected_at: new Date().toISOString(), rejected_by: user!.id }
      logMsg = 'rejected recommendation'
      break
    case 'feature':
      updates = { ...updates, is_featured: true, featured_at: new Date().toISOString(), featured_by: user!.id }
      logMsg = 'featured recommendation'
      break
    case 'unfeature':
      updates = { ...updates, is_featured: false, featured_at: null, featured_by: null }
      logMsg = 'unfeatured recommendation'
      break
    case 'resolve_appeal':
      updates = { ...updates, appeal_status, is_approved: appeal_status === 'approved' }
      logMsg = `${appeal_status} appeal for recommendation`
      break
    default:
      logMsg = 'edited recommendation'
  }

  const { data, error: updateError } = await (supabase as any)!
  .from('recommendations')
  .update(updates)
  .eq('id', id)
  .select()
  .single()

  if (updateError) return NextResponse.json({ error: 'Failed to update' }, { status: 500 })

  await logAction(supabase!, user!.id, logMsg, 'recommendation', id, rec?.title ?? id, { reason, action })

  // Notify user
  if (['approve', 'reject', 'resolve_appeal'].includes(action) && rec?.user_id) {
    const messages: Record<string, string> = {
      approve: `Your recommendation "${rec.title}" has been approved! 🎉`,
      reject: `Your recommendation "${rec.title}" was rejected. Reason: ${reason}`,
      resolve_appeal: `Your appeal for "${rec.title}" has been ${appeal_status}.`,
    }
    await (supabase! as any).from('notifications').insert({
      user_id: rec.user_id,
      type: `recommendation_${action}`,
      title: messages[action],
      data: { recommendation_id: id },
    })
  }

  return NextResponse.json({ recommendation: data })
}