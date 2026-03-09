import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Returns the current user + profile, or a 401/403 response.
 * Pass `adminOnly: true` to restrict to admins only (not mods).
 */
export async function requireRole(adminOnly = false) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role

  if (!['admin', 'moderator'].includes(role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  if (adminOnly && role !== 'admin') {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  }

  return { user, role, supabase }
}