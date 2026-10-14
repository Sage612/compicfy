import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/user/SettingsForm'
import { isAdmin as isAdminCheck, isProUser } from '@/lib/access'
import type { Profile } from '@/types/app.types'
import type { Metadata } from 'next'
import { PageShell, PageHeader } from '@/components/dashboard/PageHeader'

export const metadata: Metadata = { title: 'Creator Settings' }

export default async function CreatorSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const isAdmin = isAdminCheck(profile as { role: string })
  const isPro   = isProUser(profile as { role: string; is_pro: boolean | null; pro_expires_at: string | null })

  return (
    <PageShell width="narrow">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Manage your creator profile and preferences."
        backHref="/creator/dashboard"
        backLabel="Dashboard"
      />
      <SettingsForm profile={profile as Profile} userId={user.id} isPro={isPro} defaultSection="creator-links" />
    </PageShell>
  )
}
