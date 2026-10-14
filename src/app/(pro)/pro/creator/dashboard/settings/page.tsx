import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/user/SettingsForm'
import type { Profile } from '@/types/app.types'
import type { Metadata } from 'next'
import { PageShell, PageHeader } from '@/components/dashboard/PageHeader'

export const metadata: Metadata = { title: 'Creator Settings' }

export default async function ProCreatorSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  return (
    <PageShell width="narrow">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Manage your creator profile and preferences."
        backHref="/pro/creator/dashboard"
        backLabel="Dashboard"
        isPro
      />
      <SettingsForm profile={profile as Profile} userId={user.id} isPro={true} defaultSection="creator-links" />
    </PageShell>
  )
}
