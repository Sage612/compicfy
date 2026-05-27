import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/user/SettingsForm'
import { Settings } from 'lucide-react'
import type { Profile } from '@/types/database.types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings | Pro' }

export default async function ProReaderSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Header with icon */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 border border-border">
          <Settings size={20} className="text-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your profile and preferences</p>
        </div>
      </div>

      <SettingsForm profile={profile as Profile} userId={user.id} isPro={true} />
    </div>
  )
}