import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { DAILY_LIMITS, FREE_LIMITS, GLOBAL_DAILY_CAP } from './constants'
import type {
  Database,
  DailySubmissionCount,
  GlobalDailyStats,
} from '@/types/database.types'

// ── Profile shape used across enforce functions ───────────────────────────────
interface ProfileRecord {
  total_saves:    number | null
  is_pro:         boolean
  pro_expires_at: string | null
  role:           'admin' | 'moderator' | 'user'
}

interface ProfileStats {
  total_recommendations: number | null
  total_votes_received:  number | null
  total_reviews:         number | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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
  userId:  string,
  feature: string
): Promise<{ allowed: boolean; error?: NextResponse }> {
  const supabase = await createClient()

  const { data } = await (supabase.rpc as any)('has_feature_access', {
    p_user_id: userId,
    p_feature: feature,
  })

  if (!data) {
    return {
      allowed: false,
      error: NextResponse.json(
        { error: 'Pro feature', message: 'This feature requires a Pro subscription.', upgrade_url: '/pricing' },
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
export async function enforceDailyRecLimit(
  userId: string
): Promise<{ allowed: boolean; remaining: number; error?: NextResponse }> {
  const supabase = await createClient()

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('is_pro, pro_expires_at, role, total_saves')
    .eq('id', userId)
    .single()

  const profile = profileRaw as {
    is_pro:         boolean
    pro_expires_at: string | null
    role:           'admin' | 'moderator' | 'user'
    total_saves:    number | null
  } | null

  if (!profile) {
    return {
      allowed:   false,
      remaining: 0,
      error: NextResponse.json({ error: 'Profile not found' }, { status: 404 }),
    }
  }

  const typedProfile: ProfileRecord = {
    total_saves:    profile.total_saves,
    is_pro:         profile.is_pro,
    pro_expires_at: profile.pro_expires_at,
    role:           profile.role,
  }

  if (isAdmin(typedProfile)) return { allowed: true, remaining: Infinity }

  const dailyLimit = isEffectivelyPro(typedProfile) ? DAILY_LIMITS.pro : DAILY_LIMITS.free
  const today      = new Date().toISOString().split('T')[0]

  const { data: existingRaw } = await supabase
    .from('daily_submission_counts')
    .select('count')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  const existing     = existingRaw as Pick<DailySubmissionCount, 'count'> | null
  const currentCount = existing?.count ?? 0

  if (currentCount >= dailyLimit) {
    return {
      allowed:   false,
      remaining: 0,
      error: NextResponse.json(
        {
          error:       'Daily limit reached',
          message:     isEffectivelyPro(typedProfile)
            ? `You've reached your ${dailyLimit} submissions for today. Resets at midnight.`
            : `Free users can submit ${dailyLimit} recommendations per day. Upgrade to Pro for up to ${DAILY_LIMITS.pro}/day.`,
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
export async function incrementDailyCount(userId: string): Promise<void> {
  const supabase = await createClient()
  const today    = new Date().toISOString().split('T')[0]

  await (supabase.rpc as any)('increment_daily_submission_count', {
    p_user_id: userId,
    p_date:    today,
  })
}

// ── checkGlobalDailyCap ───────────────────────────────────────────────────────
export async function checkGlobalDailyCap(): Promise<{
  isPeakHour: boolean
  totalToday: number
  capReached: boolean
}> {
  const supabase = await createClient()
  const today    = new Date().toISOString().split('T')[0]

  const { data: rawData } = await supabase
    .from('global_daily_stats')
    .select('total_submissions, peak_hour_triggered')
    .eq('date', today)
    .single()

  const data      = rawData as Pick<GlobalDailyStats, 'total_submissions' | 'peak_hour_triggered'> | null
  const total     = data?.total_submissions   ?? 0
  const triggered = data?.peak_hour_triggered ?? false
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

  await (supabase.rpc as any)('increment_global_daily_count', { p_date: today })
}

// ── getUserContributionScore ──────────────────────────────────────────────────
export async function getUserContributionScore(userId: string): Promise<number> {
  const supabase = await createClient()

  const [
    { data: profileRaw },
    { count: reviewCount },
    { count: reportCount },
  ] = await Promise.all([
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

  const profile = profileRaw as ProfileStats | null
  if (!profile) return 0

  return (
    (profile.total_recommendations ?? 0) * 50  +
    (profile.total_votes_received  ?? 0) * 150 +
    (reviewCount                   ?? 0) * 10  +
    (reportCount                   ?? 0) * 10
  )
}

// ── enforceSaveLimit ──────────────────────────────────────────────────────────
export async function enforceSaveLimit(
  userId: string
): Promise<{ allowed: boolean; error?: NextResponse }> {
  const supabase = await createClient()

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('total_saves, is_pro, pro_expires_at, role')
    .eq('id', userId)
    .single()

  const profile = profileRaw as ProfileRecord | null

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

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('total_saves, is_pro, pro_expires_at, role')
    .eq('id', userId)
    .single()

  const profile = profileRaw as ProfileRecord | null

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
export async function enforceCollectionLimit(
  userId: string
): Promise<{ allowed: boolean; error?: NextResponse }> {
  const supabase = await createClient()

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('total_saves, is_pro, pro_expires_at, role')
    .eq('id', userId)
    .single()

  const profile = profileRaw as ProfileRecord | null

  if (!profile) {
    return {
      allowed: false,
      error: NextResponse.json({ error: 'Profile not found' }, { status: 404 }),
    }
  }

  if (isEffectivelyPro(profile)) return { allowed: true }

  const { count } = await (supabase as any)
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