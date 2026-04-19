import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ── Limits ────────────────────────────────────────────────────────────────────
// Single source of truth — update here and it propagates to all enforce fns.
// These match the DB function can_submit_recommendation and the pricing page.
export const FREE_LIMITS = {
  recommendations_per_month: 50,
  saves:                     100,
  lists:                     5,
} as const

interface ProfileRecord {
  total_saves: number | null
  is_pro:      boolean
  pro_expires_at: string | null
  role:        'admin' | 'moderator' | 'user'
}

// ── Helper: resolve effective pro status ──────────────────────────────────────
function isEffectivelyPro(profile: ProfileRecord): boolean {
  if (['admin', 'moderator'].includes(profile.role)) return true
  if (!profile.is_pro) return false
  if (!profile.pro_expires_at) return true
  return new Date(profile.pro_expires_at) > new Date()
}

// ── enforceProFeature ─────────────────────────────────────────────────────────
export async function enforceProFeature(
  userId: string,
  feature: string
): Promise<{ allowed: boolean; error?: NextResponse }> {
  const supabase = await createClient()

  const { data } = await (supabase as any).rpc('has_feature_access', {
    p_user_id: userId,
    p_feature: feature,
  })

  if (!data) {
    return {
      allowed: false,
      error: NextResponse.json(
        {
          error:       'Pro feature',
          message:     'This feature requires a Pro subscription.',
          upgrade_url: '/pricing',
        },
        { status: 403 }
      ),
    }
  }

  return { allowed: true }
}

// ── enforceRecLimit ───────────────────────────────────────────────────────────
// Calls the DB function which checks recommendation_count_this_month < 50
export async function enforceRecLimit(
  userId: string
): Promise<{ allowed: boolean; error?: NextResponse }> {
  const supabase = await createClient()

  const { data } = await (supabase.rpc as any)('can_submit_recommendation', {
    p_user_id: userId,
  })

  if (!data) {
    return {
      allowed: false,
      error: NextResponse.json(
        {
          error:       'Monthly limit reached',
          message:     `You have reached your ${FREE_LIMITS.recommendations_per_month} recommendations per month limit. Upgrade to Pro for unlimited submissions.`,
          upgrade_url: '/pricing',
        },
        { status: 403 }
      ),
    }
  }

  return { allowed: true }
}

// ── enforceSaveLimit ──────────────────────────────────────────────────────────
// Free users limited to 100 saves
export async function enforceSaveLimit(
  userId: string
): Promise<{ allowed: boolean; error?: NextResponse }> {
  const supabase = await createClient()

  const { data: profile } = (await supabase
    .from('profiles')
    .select('total_saves, is_pro, pro_expires_at, role')
    .eq('id', userId)
    .single()) as { data: ProfileRecord | null }

  if (!profile) {
    return {
      allowed: false,
      error: NextResponse.json({ error: 'Profile not found' }, { status: 404 }),
    }
  }

  if (isEffectivelyPro(profile)) return { allowed: true }

  if ((profile.total_saves ?? 0) >= FREE_LIMITS.saves) {
    return {
      allowed: false,
      error: NextResponse.json(
        {
          error:       'Save limit reached',
          message:     `You have reached your ${FREE_LIMITS.saves} saves limit. Upgrade to Pro for unlimited saves.`,
          upgrade_url: '/pricing',
        },
        { status: 403 }
      ),
    }
  }

  return { allowed: true }
}

// ── enforceListLimit ──────────────────────────────────────────────────────────
// Free users limited to 5 reading lists
export async function enforceListLimit(
  userId: string
): Promise<{ allowed: boolean; error?: NextResponse }> {
  const supabase = await createClient()

  const { data: profile } = (await supabase
    .from('profiles')
    .select('is_pro, pro_expires_at, role')
    .eq('id', userId)
    .single()) as { data: ProfileRecord | null }

  if (!profile) {
    return {
      allowed: false,
      error: NextResponse.json({ error: 'Profile not found' }, { status: 404 }),
    }
  }

  if (isEffectivelyPro(profile)) return { allowed: true }

  const { count } = await supabase
    .from('reading_lists')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if ((count ?? 0) >= FREE_LIMITS.lists) {
    return {
      allowed: false,
      error: NextResponse.json(
        {
          error:       'List limit reached',
          message:     `You can create up to ${FREE_LIMITS.lists} reading lists on the free plan. Upgrade to Pro for unlimited lists.`,
          upgrade_url: '/pricing',
        },
        { status: 403 }
      ),
    }
  }

  return { allowed: true }
}