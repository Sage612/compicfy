import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/user/SettingsForm'
import { Settings } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
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

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-600 to-zinc-800 dark:from-zinc-500 dark:to-zinc-700 flex items-center justify-center shadow-lg">
            <Settings size={16} className="text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Settings</h1>
        </div>
        <p className="text-muted-foreground text-sm pl-0.5">
          Manage your profile and account preferences
        </p>
      </div>

      <SettingsForm profile={profile} userId={user.id} />
    </div>
  )
}