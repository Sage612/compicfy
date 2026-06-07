import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/utils/requireRole'
import { logAction } from '@/lib/utils/admin'
import { createClient } from '@/lib/supabase/server'
import { sendApprovedEmail, sendRejectedEmail, sendAppealResolvedEmail } from '@/lib/email/send'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ── Internal helper: fire-and-forget push notification ───────────────────────
// Called after inserting a DB notification so the user also gets a
// native phone/browser push if they have subscribed.
async function sendPushForUser(
  userId: string,
  title: string,
  body: string,
  url: string
) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://compicfy.com'
    await fetch(`${baseUrl}/api/push/send`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        // Pass the internal secret if one is configured
        ...(process.env.INTERNAL_API_SECRET
          ? { authorization: `Bearer ${process.env.INTERNAL_API_SECRET}` }
          : {}),
      },
      body: JSON.stringify({ user_id: userId, title, body, url }),
    })
  } catch (err) {
    // Non-fatal — log but never crash the approval flow
    console.error('sendPushForUser error (non-fatal):', err)
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('recommendations')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ recommendation: data })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const auth = await requireRole(false)
  if (auth.error) return auth.error

  const { user, supabase } = auth
  const body = await request.json()
  const { action } = body

  // ── Plain field edit (no action key) ─────────────────────────────────────
  if (!action) {
    const allowedFields = [
      'title', 'description', 'type', 'status', 'genres', 'themes',
      'content_warnings', 'content_rating', 'official_platforms',
      'official_links', 'author', 'artist', 'publisher', 'cover_url',
      'banner_url', 'why_recommend', 'chapter_count', 'year_released',
      'alternative_titles',
    ]

    const updates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (field in body) updates[field] = body[field]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const { data, error: updateError } = await (supabase! as any)
      .from('recommendations')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Edit recommendation error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await logAction(supabase!, user!.id, 'edited recommendation', 'recommendation', id, (data as any).title, {})
    return NextResponse.json({ recommendation: data })
  }

  // ── Action-based updates ──────────────────────────────────────────────────
  let updates: Record<string, any> = {}
  let logMsg = ''

  switch (action) {
    case 'approve':
      updates = {
        is_approved:      true,
        rejection_reason: null,
        reviewed_by:      user!.id,
        reviewed_at:      new Date().toISOString(),
      }
      logMsg = 'approved recommendation'
      break

    case 'reject':
      updates = {
        is_approved:      false,
        rejection_reason: body.reason,
        reviewed_by:      user!.id,
        reviewed_at:      new Date().toISOString(),
      }
      logMsg = 'rejected recommendation'
      break

    case 'feature':
      updates = { is_featured: true, featured_at: new Date().toISOString() }
      logMsg = 'featured recommendation'
      break

    case 'unfeature':
      updates = { is_featured: false }
      logMsg = 'unfeatured recommendation'
      break

    case 'resolve_appeal':
      updates = {
        appeal_status: body.appeal_status,
        is_approved:   body.appeal_status === 'approved',
        ...(body.appeal_status === 'approved' ? { rejection_reason: null } : {}),
      }
      logMsg = `${body.appeal_status} recommendation appeal`
      break

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { data, error: updateError } = await (supabase! as any)
    .from('recommendations')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    console.error('Action update error:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await logAction(
    supabase!, user!.id, logMsg, 'recommendation', id,
    (data as any).title, { action, reason: body.reason }
  )

  // ── Notification + email + push ───────────────────────────────────────────
  // Only fire for actions that directly affect the submitter
  if (['approve', 'reject', 'resolve_appeal'].includes(action)) {
    try {
      const recTitle  = (data as any).title as string
      const recUserId = (data as any).user_id as string

      // Human-readable messages for each action
      const notifTitle: Record<string, string> = {
        approve:        `Your recommendation "${recTitle}" has been approved! 🎉`,
        reject:         `Your recommendation "${recTitle}" was not approved.`,
        resolve_appeal: `Your appeal for "${recTitle}" has been ${body.appeal_status}.`,
      }

      // Push body text (shorter, shown in OS notification tray)
      const pushBody: Record<string, string> = {
        approve:        'Tap to view your published recommendation.',
        reject:         body.reason ? `Reason: ${body.reason}` : 'Tap for details.',
        resolve_appeal: `Appeal outcome: ${body.appeal_status}.`,
      }

      // ── 1. Insert DB notification (in-app bell) ───────────────────────────
      // Use 'system' type so it satisfies the DB enum constraint.
      // The specific action detail lives in the data JSONB column.
      const { error: notifError } = await supabase!
        .from('notifications')
        .insert({
          user_id: recUserId,
          type:    'system',           // valid enum value
          title:   notifTitle[action],
          data:    {
            recommendation_id: id,
            action,
            reason: body.reason ?? null,
          },
        } as any)

      if (notifError) {
        console.error('Notification insert error:', notifError)
      }

      // ── 2. Fire push notification (phone/browser tray) ────────────────────
      // This is what was missing before — the DB insert alone never
      // triggers a native push. We call /api/push/send explicitly.
      await sendPushForUser(
        recUserId,
        notifTitle[action],
        pushBody[action],
        `/comic/${id}`
      )

      // ── 3. Send email ─────────────────────────────────────────────────────
      const service = getServiceClient()
      const { data: authUser } = await service.auth.admin.getUserById(recUserId)
      const email = authUser?.user?.email

      const { data: profile } = await supabase!
        .from('profiles')
        .select('username')
        .eq('id', recUserId)
        .single()

      if (email && (profile as any)?.username) {
        if (action === 'approve') {
          await sendApprovedEmail(email, (profile as any).username, recTitle, id)
        } else if (action === 'reject') {
          await sendRejectedEmail(email, (profile as any).username, recTitle, body.reason ?? 'No reason provided', id)
        } else if (action === 'resolve_appeal') {
          await sendAppealResolvedEmail(email, (profile as any).username, 'recommendation', body.appeal_status, recTitle)
        }
      }
    } catch (notifError) {
      // Non-fatal — never let notification failure block the approval response
      console.error('Notification/email/push error (non-fatal):', notifError)
    }
  }

  return NextResponse.json({ recommendation: data })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireRole(true)
  if (auth.error) return auth.error

  const { user, supabase } = auth

  try {
    const { data: rec } = await supabase!
      .from('recommendations')
      .select('title')
      .eq('id', id)
      .single()

    const { error: deleteError } = await supabase!
      .from('recommendations')
      .delete()
      .eq('id', id)

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

    await logAction(supabase!, user!.id, 'deleted recommendation', 'recommendation', id, (rec as any)?.title ?? id, {})
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete recommendation' }, { status: 500 })
  }
}