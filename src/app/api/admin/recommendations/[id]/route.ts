import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/utils/requireRole'
import { logAction } from '@/lib/utils/admin'
import { createClient } from '@/lib/supabase/server'
import { sendApprovedEmail, sendRejectedEmail, sendAppealResolvedEmail } from '@/lib/email/send'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { notifyFollowersOfNewPost } from '@/lib/utils/followerNotify'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data, error } = await supabase.from('recommendations').select('*').eq('id', id).single()
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
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

  const { user, role, supabase } = auth
  const body = await request.json()
  const { action } = body

  // Feature/unfeature is admin-only
  if ((action === 'feature' || action === 'unfeature') && role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required to feature recommendations' }, { status: 403 })
  }

  // ── Plain field edit (no action key) ────────────────────────────────
  if (!action) {
    const allowedFields = [
      'title', 'description', 'type', 'status', 'genres', 'themes',
      'content_warnings', 'content_rating', 'official_platforms',
      'official_links', 'author', 'artist', 'publisher', 'cover_url',
      'banner_url', 'why_recommend', 'chapter_count', 'year_released',
      'alternative_titles', 'more_info_link',
      // External IDs used by the automated id-checker cron, plus the
      // lock list that tells the cron which of them to leave alone.
      // These were previously missing here, so the admin edit form's
      // ID fields and the "Lock" toggle were silently dropped on save.
      'mangaupdates_id', 'mangadex_id', 'anilist_id', 'mal_id',
      'id_locked_fields',
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
      .from('recommendations').update(updates as any).eq('id', id).select().single()
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    await logAction(supabase!, user!.id, 'edited recommendation', 'recommendation', id, (data as any).title, {})
    return NextResponse.json({ recommendation: data })
  }

  // ── Action-based updates ─────────────────────────────────────────────
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

      updates = {
        is_featured:    true,
        featured_at:    new Date().toISOString(),
        carousel_until: body.carousel_until ?? null, // null = no expiry
      }
      logMsg = 'featured recommendation'
      break

    case 'unfeature':
      updates = {
        is_featured:    false,
        carousel_until: null,
      }
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

    case 'verify_more_info':
      updates = {
        more_info_link_source:      'admin_approved',
        more_info_link_verified_at: new Date().toISOString(),
      }
      logMsg = 'verified more info link'
      break

    case 'reject_more_info':
      updates = {
        more_info_link:             null,
        more_info_link_source:      null,
        more_info_link_verified_at: null,
      }
      logMsg = 'rejected more info link'
      break

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { data, error: updateError } = await (supabase! as any)
    .from('recommendations').update(updates as any).eq('id', id).select().single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  await logAction(supabase!, user!.id, logMsg, 'recommendation', id, (data as any).title, { action, reason: body.reason })

  // Return carousel_until so the client can update the badge immediately
  const responseData = { recommendation: data, carousel_until: (data as any).carousel_until ?? null }

  if (['approve', 'reject', 'resolve_appeal'].includes(action)) {
    try {
      const recTitle  = (data as any).title as string
      const recUserId = (data as any).user_id as string

      const notifTitle: Record<string, string> = {
        approve:        `Your recommendation "${recTitle}" has been approved! 🎉`,
        reject:         `Your recommendation "${recTitle}" was not approved.`,
        resolve_appeal: `Your appeal for "${recTitle}" has been ${body.appeal_status}.`,
      }
      const pushBody: Record<string, string> = {
        approve:        'Tap to view your published recommendation.',
        reject:         body.reason ? `Reason: ${body.reason}` : 'Tap for details.',
        resolve_appeal: `Appeal outcome: ${body.appeal_status}.`,
      }

      const { error: notifError } = await supabase!.from('notifications').insert({
        user_id: recUserId,
        type:    'system',
        title:   notifTitle[action],
        content: pushBody[action],
        should_push: true,
        data:    { recommendation_id: id, action, reason: body.reason ?? null },
      } as any)
      if (notifError) console.error('Notification insert error:', notifError)

      const recJustBecameVisible =
        action === 'approve' ||
        (action === 'resolve_appeal' && body.appeal_status === 'approved')

      if (recJustBecameVisible) {
        const { data: submitterProfile } = await supabase!
          .from('profiles')
          .select('username')
          .eq('id', recUserId)
          .single()

        notifyFollowersOfNewPost(
          supabase,
          id,
          recTitle,
          recUserId,
          (submitterProfile as any)?.username ?? 'someone'
        ).catch(console.error)
      }

      const service = getServiceClient()
      const { data: authUser } = await service.auth.admin.getUserById(recUserId)
      const email = authUser?.user?.email
      const { data: profile } = await supabase!.from('profiles').select('username').eq('id', recUserId).single()

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
      console.error('Notification/email/push error (non-fatal):', notifError)
    }
  }

  return NextResponse.json(responseData)
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
    const { data: rec } = await supabase!.from('recommendations').select('title').eq('id', id).single()
    const { error: deleteError } = await supabase!.from('recommendations').delete().eq('id', id)
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
    await logAction(supabase!, user!.id, 'deleted recommendation', 'recommendation', id, (rec as any)?.title ?? id, {})
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete recommendation' }, { status: 500 })
  }
}
