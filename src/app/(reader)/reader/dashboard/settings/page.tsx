import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/user/SettingsForm'
import type { Profile } from '@/types/app.types'
import type { Metadata } from 'next'
import { hasUnlimitedPerks } from '@/lib/access'

export const metadata: Metadata = { title: 'Settings' }

export default async function ReaderSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const isPro = hasUnlimitedPerks(profile as any)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile and preferences.</p>
      </div>
      <SettingsForm profile={profile as Profile} userId={user.id} isPro={isPro} />
    </div>
  )
}
