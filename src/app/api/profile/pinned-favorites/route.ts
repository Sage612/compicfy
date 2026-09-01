import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAX_PINNED = 3

// PUT — replace the full ordered set of pinned favorite recommendation ids.
// Always sends the complete array (not incremental add/remove) since the
// UI is a drag/pick grid where the whole set is edited at once — matches
// how ReadingListDetail's drag-reorder already persists a full order rather
// than per-item move operations.
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const recommendationIds = body?.recommendation_ids

    if (!Array.isArray(recommendationIds)) {
      return NextResponse.json({ error: 'recommendation_ids must be an array' }, { status: 400 })
    }
    if (recommendationIds.length > MAX_PINNED) {
      return NextResponse.json({ error: `You can pin up to ${MAX_PINNED} favorites` }, { status: 400 })
    }

    // Item #5 gate: pinning multiple favorites is Pro/Patron only. Free
    // users keep the existing single pinned_recommendation_id feature
    // untouched — this endpoint only governs the NEW multi-pin grid.
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_pro, pro_expires_at, is_patron, patron_expires_at, role')
      .eq('id', user.id)
      .single() as { data: any }

    const isAdmin = ['admin', 'moderator'].includes(profile?.role ?? '')
    const isPro   = isAdmin || (profile?.is_pro &&
      (!profile?.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
    const isPatron = isAdmin || (profile?.is_patron &&
      (!profile?.patron_expires_at || new Date(profile.patron_expires_at) > new Date()))

    if (recommendationIds.length > 0 && !isPro && !isPatron) {
      return NextResponse.json({
        error:   'pro_feature_required',
        message: 'Pinning favorite comics to your profile is a Pro feature. Upgrade to pin up to 3.',
      }, { status: 403 })
    }

    // Ownership check — every id must be either something the user saved,
    // or one of their own recommendations. Prevents pinning an arbitrary
    // comic that has no relationship to this user at all.
    if (recommendationIds.length > 0) {
      const [{ data: savedRows }, { data: ownRecs }] = await Promise.all([
        supabase.from('saves').select('recommendation_id').eq('user_id', user.id).in('recommendation_id', recommendationIds),
        supabase.from('recommendations').select('id').eq('user_id', user.id).in('id', recommendationIds),
      ])

      const validIds = new Set([
        ...(savedRows ?? []).map((r: any) => r.recommendation_id),
        ...(ownRecs ?? []).map((r: any) => r.id),
      ])

      const invalid = recommendationIds.filter((id: string) => !validIds.has(id))
      if (invalid.length > 0) {
        return NextResponse.json({
          error:   'invalid_pin_selection',
          message: 'You can only pin comics you\'ve saved or recommended yourself.',
        }, { status: 400 })
      }
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ pinned_favorite_ids: recommendationIds })
      .eq('id', user.id)

    if (updateError) {
      console.error('[pinned-favorites/PUT] error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ pinned_favorite_ids: recommendationIds })

  } catch (err) {
    console.error('[pinned-favorites/PUT] unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update pinned favorites' },
      { status: 500 }
    )
  }
}