import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { DAILY_LIMITS, FREE_LIMITS, GLOBAL_DAILY_CAP } from './constants'

interface ProfileRecord {
  total_saves:    number | null
  is_pro:         boolean
  pro_expires_at: string | null
  role:           'admin' | 'moderator' | 'user'
}

// ── Helper: resolve effective pro status ──────────────────────────────────────
function isEffectivelyPro(profile: ProfileRecord): boolean {
  if (['admin', 'moderator'].includes(profile.role)) return true
  if (!profile.is_pro) return false
  if (!profile.pro_expires_at) return true
  return new Date(profile.pro_expires_at) > new Date()
}

function isAdmin(profile: ProfileRecord): boolean {
  return ['admin', 'moderator'].includes(profile.role)
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

// ── enforceRecLimit (monthly) ─────────────────────────────────────────────────
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

// ── enforceDailyRecLimit ──────────────────────────────────────────────────────
// Free = 2/day, Pro = 10/day, Admin = unlimited
export async function enforceDailyRecLimit(
  userId: string
): Promise<{ allowed: boolean; remaining: number; error?: NextResponse }> {
  const supabase = await createClient()

  const { data: profile } = (await supabase
    .from('profiles')
    .select('is_pro, pro_expires_at, role')
    .eq('id', userId)
    .single()) as { data: ProfileRecord | null }

  if (!profile) {
    return {
      allowed:   false,
      remaining: 0,
      error: NextResponse.json({ error: 'Profile not found' }, { status: 404 }),
    }
  }

  // Admins/mods have no daily limit
  if (isAdmin(profile)) return { allowed: true, remaining: Infinity }

  const dailyLimit = isEffectivelyPro(profile) ? DAILY_LIMITS.pro : DAILY_LIMITS.free
  const today      = new Date().toISOString().split('T')[0]

  // Get or create today's count for this user
  const { data: existing } = await supabase
    .from('daily_submission_counts')
    .select('count')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  const currentCount = (existing as any)?.count ?? 0

  if (currentCount >= dailyLimit) {
    return {
      allowed:   false,
      remaining: 0,
      error: NextResponse.json(
        {
          error:       'Daily limit reached',
          message:     isEffectivelyPro(profile)
            ? `You've reached your ${dailyLimit} submissions for today. Your limit resets at midnight.`
            : `Free users can submit ${dailyLimit} recommendations per day. Upgrade to Pro for up to ${DAILY_LIMITS.pro} per day.`,
          upgrade_url: '/pricing',
          daily_limit: dailyLimit,
          used:        currentCount,
        },
        { status: 429 }
      ),
    }
  }

  return { allowed: true, remaining: dailyLimit - currentCount }
}

// ── incrementDailyCount ───────────────────────────────────────────────────────
// Call this AFTER a successful insert
export async function incrementDailyCount(userId: string): Promise<void> {
  const supabase = await createClient()
  const today    = new Date().toISOString().split('T')[0]

  // Cast .rpc to any to bypass the outdated schema type check
  await (supabase.rpc as any)('increment_daily_submission_count', {
    p_user_id: userId,
    p_date:    today,
  })
}


// ── checkGlobalDailyCap ───────────────────────────────────────────────────────
// Returns whether we're in peak hour mode
export async function checkGlobalDailyCap(): Promise<{
  isPeakHour:  boolean
  totalToday:  number
  capReached:  boolean
}> {
  const supabase = await createClient()
  const today    = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('global_daily_stats')
    .select('total_submissions, peak_hour_triggered')
    .eq('date', today)
    .single()

  const total      = (data as any)?.total_submissions    ?? 0
  const triggered  = (data as any)?.peak_hour_triggered  ?? false
  const capReached = total >= GLOBAL_DAILY_CAP

  return {
    isPeakHour: triggered || capReached,
    totalToday: total,
    capReached,
  }
}

// ── incrementGlobalCount ──────────────────────────────────────────────────────
export async function incrementGlobalCount(): Promise<void> {
  const supabase = await createClient()
  const today    = new Date().toISOString().split('T')[0]

  // Cast .rpc to any to bypass the outdated schema type check
  await (supabase.rpc as any)('increment_global_daily_count', { 
    p_date: today 
  })
}


// ── getUserContributionScore ──────────────────────────────────────────────────
// Higher score = more trusted = drafts auto-cleared during peak hour
// Score breakdown:
//   approved recs   × 50
//   reviews written × 10
//   upvotes received× 150
//   accurate flags  × 10  (resolved reports)
export async function getUserContributionScore(userId: string): Promise<number> {
  const supabase = await createClient()

  const [{ data: profile }, { count: reviewCount }, { count: reportCount }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('total_recommendations, total_votes_received, total_reviews')
        .eq('id', userId)
        .single(),
      supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('reporter_id', userId)
        .eq('status', 'resolved'),
    ])

  const p = profile as any
  if (!p) return 0

  const score =
    (p.total_recommendations ?? 0) * 50 +
    (p.total_votes_received  ?? 0) *  150 +
    (reviewCount             ?? 0) *  10 +
    (reportCount             ?? 0) *  10

  return score
}

// ── enforceSaveLimit ──────────────────────────────────────────────────────────
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

// ── enforceCollectionLimit ────────────────────────────────────────────────────
// Free users limited to 3 collections
export async function enforceCollectionLimit(
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
    .from('collections')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if ((count ?? 0) >= FREE_LIMITS.collections) {
    return {
      allowed: false,
      error: NextResponse.json(
        {
          error:       'Collection limit reached',
          message:     `Free users can create up to ${FREE_LIMITS.collections} collections. Upgrade to Pro for unlimited collections.`,
          upgrade_url: '/pricing',
        },
        { status: 403 }
      ),
    }
  }

  return { allowed: true }
}