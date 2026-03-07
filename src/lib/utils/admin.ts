import { createClient } from '@/lib/supabase/server'

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401, user: null, supabase }

  const { data: profile } = (await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()) as { data: { role: string } | null }

  if (!profile || !['admin', 'moderator'].includes(profile.role)) {
    return { error: 'Forbidden', status: 403, user: null, supabase }
  }

  return { error: null, status: 200, user, supabase }
}

export async function logAction(
  supabase: any,
  adminId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  targetLabel: string,
  details: Record<string, any> = {}
) {
  try {
    await supabase.from('activity_logs').insert({
      user_id: adminId,
      action,
      entity_type: targetType,
      entity_id: targetId,
      details: { ...details, target_label: targetLabel },
    })
  } catch (err) {
    // Non-fatal — don't let logging crash the main action
    console.error('logAction error (non-fatal):', err)
  }
}