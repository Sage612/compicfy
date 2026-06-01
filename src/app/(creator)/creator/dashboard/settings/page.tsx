import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/user/SettingsForm'
import type { Profile } from '@/types/database.types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Creator Settings' }

export default async function CreatorSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const isAdmin = ['admin', 'moderator'].includes((profile as any).role ?? '')
  const isPro   = isAdmin || ((profile as any).is_pro &&
    (!(profile as any).pro_expires_at || new Date((profile as any).pro_expires_at) > new Date()))

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Manage your creator profile and preferences.</p>
      </div>
      <SettingsForm profile={profile as Profile} userId={user.id} isPro={isPro} defaultSection="creator-links" />
    </div>
  )
}
