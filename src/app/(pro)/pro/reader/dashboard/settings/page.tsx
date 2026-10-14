import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/user/SettingsForm'
import { PageShell, PageHeader } from '@/components/dashboard/PageHeader'
import type { Profile } from '@/types/app.types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings | Pro' }

export default async function ProReaderSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const isPro = true

  return (
    <PageShell width="narrow">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Manage your profile and preferences."
        backHref="/pro/reader/dashboard"
        backLabel="Dashboard"
        isPro={isPro}
      />
      <SettingsForm profile={profile as Profile} userId={user.id} isPro={isPro} />
    </PageShell>
  )
}