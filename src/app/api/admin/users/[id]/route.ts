import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/utils/requireRole'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendBannedEmail, sendUnbannedEmail, sendAppealResolvedEmail } from '@/lib/email/send'
import { logAction } from '@/lib/utils/admin'

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
  const auth = await requireRole(true) // admin only
  if (auth.error) return auth.error

  const { user, supabase } = auth
  const body = await request.json()
  const { action, reason, role, duration_hours } = body

  const { data: target } = (await supabase!
    .from('profiles')
    .select('username, role')
    .eq('id', id)
    .single()) as { data: { username: string; role: string } | null }

  let updates: Record<string, any> = {}
  let logMsg = ''

  switch (action) {

    // ── Permanent ban ──────────────────────────────────────────────
    case 'ban':
      updates = {
        is_banned:      true,
        ban_reason:     reason,
        banned_at:      new Date().toISOString(),
        banned_by:      user!.id,
        // Clear any suspension when doing a permanent ban
        is_suspended:        false,
        suspended_until:     null,
        suspension_reason:   null,
      }
      logMsg = 'banned user'
      break

    // ── Temporary suspension ───────────────────────────────────────
    // duration_hours: how many hours to suspend for (e.g. 1, 6, 24, 72, 168)
    case 'suspend': {
      const hours = Number(duration_hours)
      if (!hours || hours <= 0) {
        return NextResponse.json({ error: 'duration_hours must be a positive number' }, { status: 400 })
      }
      const suspendedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
      updates = {
        is_suspended:      true,
        suspended_until:   suspendedUntil,
        suspension_reason: reason,
        // Don't touch is_banned — they can be both (ban takes precedence in middleware)
      }
      logMsg = `suspended user for ${hours}h`
      break
    }

    // ── Lift suspension early ──────────────────────────────────────
    case 'unsuspend':
      updates = {
        is_suspended:      false,
        suspended_until:   null,
        suspension_reason: null,
      }
      logMsg = 'lifted user suspension'
      break

    // ── Permanent unban ────────────────────────────────────────────
    case 'unban':
      updates = {
        is_banned:       false,
        ban_reason:      null,
        banned_at:       null,
        banned_by:       null,
        appeal_status:   'none',
        // Also clear suspension in case they had both
        is_suspended:    false,
        suspended_until: null,
        suspension_reason: null,
      }
      logMsg = 'unbanned user'
      break

    // ── Role change ────────────────────────────────────────────────
    case 'change_role':
      if (!['user', 'moderator', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
      updates = { role }
      logMsg = `changed user role to ${role}`
      break

    // ── Resolve ban appeal ─────────────────────────────────────────
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

  // Use service client to bypass RLS for all profile updates
  const service = getServiceClient()
  const { data, error: updateError } = await service
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
    duration_hours,
  })

  // Notifications + emails
  const notifyActions = ['ban', 'unban', 'resolve_appeal', 'suspend', 'unsuspend']
  if (notifyActions.includes(action)) {
    const messages: Record<string, string> = {
      ban:        `Your account has been permanently banned. Reason: ${reason}`,
      suspend:    `Your account has been suspended for ${duration_hours}h. Reason: ${reason}`,
      unsuspend:  'Your account suspension has been lifted.',
      unban:      'Your account ban has been lifted.',
      resolve_appeal: `Your ban appeal has been ${body.appeal_status}.`,
    }

    await (supabase as any)!.from('notifications').insert({
      user_id: id,
      type:    `account_${action}`,
      title:   messages[action] ?? `Account action: ${action}`,
      data:    { reason, duration_hours },
    })

    try {
      const { data: authUser } = await service.auth.admin.getUserById(id)
      const email = authUser?.user?.email

      if (email && target?.username) {
        if (action === 'ban')    await sendBannedEmail(email, target.username, reason)
        if (action === 'unban')  await sendUnbannedEmail(email, target.username)
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireRole(true)
  if (auth.error) return auth.error

  const { user, supabase } = auth

  if (id === user!.id) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
  }

  try {
    const { data: target } = (await supabase!
      .from('profiles')
      .select('username')
      .eq('id', id)
      .single()) as { data: { username: string } | null }

  const service = getServiceClient()

    // Delete from auth.users first — this cascades to profiles
    const { error: deleteAuthError } = await service.auth.admin.deleteUser(id)

    if (deleteAuthError) {
      // If auth delete fails, try direct profile delete as fallback
      console.error('Auth delete error:', deleteAuthError)
      const { error: profileDeleteError } = await service
        .from('profiles')
        .delete()
        .eq('id', id)

      if (profileDeleteError) {
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
      }
    }

    await logAction(supabase!, user!.id, 'deleted user', 'user', id, target?.username ?? id, {})

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete user error:', err)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}