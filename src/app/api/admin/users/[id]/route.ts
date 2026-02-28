import { NextResponse } from 'next/server'
import { requireAdmin, logAction } from '@/lib/utils/admin'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, status, user, supabase } = await requireAdmin()
  if (error) return NextResponse.json({ error }, { status })
const db = supabase as any  
  const body = await request.json()
  const { action, reason, role } = body

 const { data: target } = await db.from('profiles').select('username, role').eq('id', id).single()

  let updates: Record<string, any> = {}
  let logMsg = ''

  switch (action) {
    case 'ban':
      updates = { is_banned: true, ban_reason: reason, banned_at: new Date().toISOString(), banned_by: user!.id }
      logMsg = 'banned user'
      break
    case 'unban':
      updates = { is_banned: false, ban_reason: null, banned_at: null, banned_by: null, appeal_status: 'none' }
      logMsg = 'unbanned user'
      break
    case 'change_role':
      updates = { role }
      logMsg = `changed user role to ${role}`
      break
    case 'resolve_appeal':
      updates = { appeal_status: body.appeal_status, is_banned: body.appeal_status !== 'approved' }
      logMsg = `${body.appeal_status} ban appeal`
      break
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

 const { data, error: updateError } = await db.from('profiles').update(updates).eq('id', id).select().single()

  if (updateError) return NextResponse.json({ error: 'Failed to update' }, { status: 500 })

  await logAction(db, user!.id, logMsg, 'user', id, target?.username ?? id, { reason, action, role })

  // Notify user
  if (['ban', 'unban', 'resolve_appeal'].includes(action)) {
    const messages: Record<string, string> = {
      ban: `Your account has been suspended. Reason: ${reason}`,
      unban: 'Your account suspension has been lifted.',
      resolve_appeal: `Your ban appeal has been ${body.appeal_status}.`,
    }
    await db.from('notifications').insert.insert({
      user_id: id,
      type: `account_${action}`,
      title: messages[action],
      data: { reason },
    })
  }

  return NextResponse.json({ user: data })
}