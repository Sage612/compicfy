import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { recommendationPatchSchema } from '@/lib/utils/validators'

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
      .eq('is_approved', true)
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
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch the existing recommendation — owner check
    const { data: existing } = await (supabase as any)
      .from('recommendations')
      .select('user_id, title')
      .eq('id', id)
      .single()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Only the owner can edit (admins handled separately via admin routes)
    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Partial parse — only validate fields that are sent.
    // FIX: previously this called `recommendationSchema.partial()`, but
    // recommendationSchema is wrapped in `.superRefine()` (ZodEffects),
    // which has no `.partial()` method — that call threw on every single
    // PATCH request, landing in the catch block below as a bare 500.
    // recommendationPatchSchema is built correctly: `.partial()` applied to
    // the base object BEFORE refinement, then re-refined so official_links
    // (if sent) still gets validated against the domain whitelist.
    const parsed = recommendationPatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Editing always resets approval — needs re-review
    const { data: updated, error } = await (supabase as any)
      .from('recommendations')
      .update({
        ...data,
        // Clear approval — editing requires re-review
        is_approved:      false,
        is_featured:      false,
        rejection_reason: null,
        appeal_status:    'none',
        reviewed_by:      null,
        reviewed_at:      null,
        updated_at:       new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ recommendation: updated })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch the existing recommendation — owner check
    const { data: existing } = await (supabase as any)
      .from('recommendations')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('recommendations')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ deleted: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
