import { NextResponse } from 'next/server'
import { requireAdmin, logAction } from '@/lib/utils/admin'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendBannedEmail, sendUnbannedEmail, sendAppealResolvedEmail } from '@/lib/email/send'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, status, user, supabase } = await requireAdmin()
  if (error) return NextResponse.json({ error }, { status })

  const body = await request.json()
  const { action, reason, role } = body

  const { data: target } = (await supabase!
  .from('profiles')
  .select('username, role')
  .eq('id', id)
  .single()) as { data: { username: string; role: string } | null }

  let updates: Record<string, any> = {}
  let logMsg = ''

  switch (action) {
    case 'ban':
      updates = {
        is_banned: true,
        ban_reason: reason,
        banned_at: new Date().toISOString(),
        banned_by: user!.id,
      }
      logMsg = 'banned user'
      break
    case 'unban':
      updates = {
        is_banned: false,
        ban_reason: null,
        banned_at: null,
        banned_by: null,
        appeal_status: 'none',
      }
      logMsg = 'unbanned user'
      break
    case 'change_role':
      if (!['user', 'moderator', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
      updates = { role }
      logMsg = `changed user role to ${role}`
      break
    case 'resolve_appeal':
      updates = {
        appeal_status: body.appeal_status,
        is_banned: body.appeal_status !== 'approved',
      }
      logMsg = `${body.appeal_status} ban appeal`
      break
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { data, error: updateError } = await (supabase as any)!
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    console.error('Update error:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await logAction(supabase!, user!.id, logMsg, 'user', id, target?.username ?? id, {
    reason,
    action,
    role,
  })

  // Send notifications + emails
  if (['ban', 'unban', 'resolve_appeal'].includes(action)) {
    const messages: Record<string, string> = {
      ban: `Your account has been suspended. Reason: ${reason}`,
      unban: 'Your account suspension has been lifted.',
      resolve_appeal: `Your ban appeal has been ${body.appeal_status}.`,
    }

    await (supabase as any)!.from('notifications').insert({
      user_id: id,
      type: `account_${action}`,
      title: messages[action],
      data: { reason },
    })

    // Get email via service client (bypasses RLS)
    try {
      const service = getServiceClient()
      const { data: authUser } = await service.auth.admin.getUserById(id)
      const email = authUser?.user?.email

      if (email && target?.username) {
        if (action === 'ban') await sendBannedEmail(email, target.username, reason)
        if (action === 'unban') await sendUnbannedEmail(email, target.username)
        if (action === 'resolve_appeal') {
          await sendAppealResolvedEmail(email, target.username, 'ban', body.appeal_status)
        }
      }
    } catch (emailError) {
      console.error('Email error (non-fatal):', emailError)
    }
  }

  return NextResponse.json({ user: data })
}