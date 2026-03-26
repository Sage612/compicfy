import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ThemesClient } from '@/components/pro/ThemesClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Profile Themes | Pro' }

export default async function ThemesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_pro, pro_expires_at, profile_theme')
    .eq('id', user.id)
    .single() as { data: any }

  const isPro = profile?.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date())
  if (!isPro && profile?.role !== 'admin') redirect('/pricing?reason=pro_required')

  return <ThemesClient currentTheme={profile?.profile_theme ?? 'default'} userId={user.id} />
}