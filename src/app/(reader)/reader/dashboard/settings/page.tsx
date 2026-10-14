import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/user/SettingsForm'
import { PageShell, PageHeader } from '@/components/dashboard/PageHeader'
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
    <PageShell width="narrow">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Manage your profile and preferences."
        backHref="/reader/dashboard"
        backLabel="Dashboard"
        isPro={isPro}
      />
      <SettingsForm profile={profile as Profile} userId={user.id} isPro={isPro} />
    </PageShell>
  )
}