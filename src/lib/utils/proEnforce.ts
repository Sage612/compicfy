import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Interface for the user profile record to fix 'never' errors
interface ProfileRecord {
  total_saves: number | null
  is_pro: boolean
  role: 'admin' | 'moderator' | 'user'
}

// Server-side Pro enforcement for API routes
export async function enforceProFeature(
  userId: string,
  feature: string
): Promise<{ allowed: boolean; error?: NextResponse }> {
  const supabase = await createClient()

  const { data } = await (supabase as any)
    .rpc('has_feature_access', {
      p_user_id: userId,
      p_feature: feature,
    })

  if (!data) {
    return {
      allowed: false,
      error: NextResponse.json(
        {
          error: 'Pro feature',
          message: 'This feature requires a Pro subscription.',
          upgrade_url: '/pricing',
        },
        { status: 403 }
      ),
    }
  }

  return { allowed: true }
}

// Check if user can submit recommendation
export async function enforceRecLimit(
  userId: string
): Promise<{ allowed: boolean; error?: NextResponse }> {
  const supabase = await createClient()

  // Cast rpc to any to fix the 'argument not assignable to undefined' error
  const { data } = await (supabase.rpc as any)('can_submit_recommendation', { 
    p_user_id: userId 
  })

  if (!data) {
    return {
      allowed: false,
      error: NextResponse.json(
        {
          error: 'Monthly limit reached',
          message: 'You have reached your 30 recommendations per month limit. Upgrade to Pro for unlimited submissions.',
          upgrade_url: '/pricing',
        },
        { status: 403 }
      ),
    }
  }

  return { allowed: true }
}

// Check if user can save more comics
export async function enforceSaveLimit(
  userId: string
): Promise<{ allowed: boolean; error?: NextResponse }> {
  const supabase = await createClient()

  // Cast the single() result to our ProfileRecord interface
  const { data: profile } = (await supabase
    .from('profiles')
    .select('total_saves, is_pro, role')
    .eq('id', userId)
    .single()) as { data: ProfileRecord | null }

  if (!profile) {
    return {
      allowed: false,
      error: NextResponse.json({ error: 'Profile not found' }, { status: 404 }),
    }
  }

  // Admins, mods, and pro users have unlimited saves
  if (['admin', 'moderator'].includes(profile.role) || profile.is_pro) {
    return { allowed: true }
  }

  // Free users limited to 50 saves
  if ((profile.total_saves ?? 0) >= 50) {
    return {
      allowed: false,
      error: NextResponse.json(
        {
          error: 'Save limit reached',
          message: 'You have reached your 50 saves limit. Upgrade to Pro for unlimited saves.',
          upgrade_url: '/pricing',
        },
        { status: 403 }
      ),
    }
  }

  return { allowed: true }
}

// Check if user can create more reading lists
export async function enforceListLimit(
  userId: string
): Promise<{ allowed: boolean; error?: NextResponse }> {
  const supabase = await createClient()

  // Cast the single() result to our ProfileRecord interface
  const { data: profile } = (await supabase
    .from('profiles')
    .select('is_pro, role')
    .eq('id', userId)
    .single()) as { data: ProfileRecord | null }

  if (!profile) {
    return {
      allowed: false,
      error: NextResponse.json({ error: 'Profile not found' }, { status: 404 }),
    }
  }

  // Admins, mods, and pro users have unlimited lists
  if (['admin', 'moderator'].includes(profile.role) || profile.is_pro) {
    return { allowed: true }
  }

  // Count existing lists
  const { count } = await supabase
    .from('reading_lists')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if ((count ?? 0) >= 3) {
    return {
      allowed: false,
      error: NextResponse.json(
        {
          error: 'List limit reached',
          message: 'You can create up to 3 reading lists on the free plan. Upgrade to Pro for unlimited lists.',
          upgrade_url: '/pricing',
        },
        { status: 403 }
      ),
    }
  }

  return { allowed: true }
}