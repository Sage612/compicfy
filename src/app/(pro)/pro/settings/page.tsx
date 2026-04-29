import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/user/SettingsForm'
import { Settings, Crown } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings | Pro' }

export default async function ProSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profileData) redirect('/login')
  const profile = profileData as any

  const isPro =
    profile.role === 'admin' ||
    (profile.is_pro &&
      (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-600 to-zinc-800 dark:from-zinc-500 dark:to-zinc-700 flex items-center justify-center shadow-lg">
            <Settings size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Settings</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Crown size={11} className="text-amber-500 fill-amber-500" />
              <span className="text-xs text-amber-600 font-semibold">Pro</span>
            </div>
          </div>
        </div>
        <p className="text-muted-foreground text-sm pl-0.5">
          Manage your profile and account preferences
        </p>
      </div>
      <SettingsForm profile={profile} userId={user.id} isPro={isPro} />
    </div>
  )
}