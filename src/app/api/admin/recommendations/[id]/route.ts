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
  const auth = await requireRole(false) // admin + mod
  if (auth.error) return auth.error

  const { user, supabase } = auth
  const body = await request.json()
  const { action } = body

  // Direct field edit — admin only
  if (!action) {
    const adminAuth = await requireRole(true)
    if (adminAuth.error) return adminAuth.error

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
    updates.updated_at = new Date().toISOString()

    const { data, error: updateError } = await (supabase as any)!
      .from('recommendations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    await logAction(supabase!, user!.id, 'edited recommendation', 'recommendation', id, data.title, {})
    return NextResponse.json({ recommendation: data })
  }

  // Action-based updates
  let updates: Record<string, any> = {}
  let logMsg = ''

  switch (action) {
    case 'approve':
      updates = {
        is_approved: true,
        rejection_reason: null,
        reviewed_by: user!.id,
        reviewed_at: new Date().toISOString(),
      }
      logMsg = 'approved recommendation'
      break
    case 'reject':
      updates = {
        is_approved: false,
        rejection_reason: body.reason,
        reviewed_by: user!.id,
        reviewed_at: new Date().toISOString(),
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
        is_approved: body.appeal_status === 'approved',
        rejection_reason: body.appeal_status === 'approved' ? null : undefined,
      }
      logMsg = `${body.appeal_status} recommendation appeal`
      break
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { data, error: updateError } = await (supabase as any)!
    .from('recommendations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  await logAction(supabase!, user!.id, logMsg, 'recommendation', id, data.title, { action, reason: body.reason })

  // Send notification + email to rec owner
  if (['approve', 'reject', 'resolve_appeal'].includes(action)) {
    try {
      const notifMessages: Record<string, string> = {
        approve: `Your recommendation "${data.title}" has been approved! 🎉`,
        reject: `Your recommendation "${data.title}" was not approved.`,
        resolve_appeal: `Your appeal for "${data.title}" has been ${body.appeal_status}.`,
      }

      await (supabase as any)!.from('notifications').insert({
        user_id: data.user_id,
        type: `recommendation_${action}`,
        title: notifMessages[action],
        data: { recommendation_id: id, reason: body.reason },
      })

      // Send email
      const service = getServiceClient()
      const { data: authUser } = await service.auth.admin.getUserById(data.user_id)
      const email = authUser?.user?.email

      const { data: profile } = await (supabase as any)!
        .from('profiles')
        .select('username')
        .eq('id', data.user_id)
        .single()

      if (email && profile?.username) {
        if (action === 'approve') {
          await sendApprovedEmail(email, profile.username, data.title, id)
        } else if (action === 'reject') {
          await sendRejectedEmail(email, profile.username, data.title, body.reason ?? 'No reason provided', id)
        } else if (action === 'resolve_appeal') {
          await sendAppealResolvedEmail(email, profile.username, 'recommendation', body.appeal_status, data.title)
        }
      }
    } catch (notifError) {
      console.error('Notification/email error (non-fatal):', notifError)
    }
  }

  return NextResponse.json({ recommendation: data })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireRole(true) // admin only
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