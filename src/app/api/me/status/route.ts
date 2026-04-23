import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Profile } from '@/types/database.types'

// GET /api/me/status
// Returns the current user's suspension/ban state.
// Used by the suspended page to detect early lifts without a full page reload.
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ authenticated: false })
    }

    const { data: profile } = await (supabase
      .from('profiles')
      .select('is_banned, ban_reason, is_suspended, suspended_until, suspension_reason')
      .eq('id', user.id)
      .single()) as { data: Pick<Profile, 'is_banned' | 'ban_reason' | 'is_suspended' | 'suspended_until' | 'suspension_reason'> | null }

    if (!profile) {
      return NextResponse.json({ authenticated: true, is_suspended: false, is_banned: false })
    }

    // Check if suspension has naturally expired
    const suspendedUntil   = profile.suspended_until ? new Date(profile.suspended_until) : null
    const isStillSuspended = profile.is_suspended && (!suspendedUntil || suspendedUntil > new Date())

    // Auto-clear expired suspensions while we're here
    if (profile.is_suspended && suspendedUntil && suspendedUntil <= new Date()) {
      await (supabase
        .from('profiles') as any)
        .update({ is_suspended: false, suspended_until: null, suspension_reason: null })
        .eq('id', user.id)
    }

    return NextResponse.json({
      authenticated:    true,
      is_banned:        profile.is_banned ?? false, // This is what the BanWatchdog looks for
      ban_reason:       profile.ban_reason ?? null,
      is_suspended:     isStillSuspended,
      suspended_until:  profile.suspended_until  ?? null,
      suspension_reason: profile.suspension_reason ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 })
  }
}