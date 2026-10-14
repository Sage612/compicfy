import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreatorLinksClient } from '@/components/creator/CreatorLinksClient'
import { isAdmin as isAdminCheck, isProUser, canAccessProDashboard } from '@/lib/access'
import type { Metadata } from 'next'
import { PageShell, PageHeader } from '@/components/dashboard/PageHeader'

export const metadata: Metadata = { title: 'Creator Links · Pro' }

export default async function ProCreatorLinksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('comic_url, patreon_url, kickstarter_url, is_pro, pro_expires_at, is_patron, patron_expires_at, role')
    .eq('id', user.id)
    .single() as { data: any }

  if (!profile) redirect('/login')

  const isAdmin = isAdminCheck(profile)
  const isPro   = isProUser(profile)

  if (!canAccessProDashboard(profile)) redirect('/pricing?reason=pro_required')

  return (
    <PageShell width="narrow">
      <PageHeader
        eyebrow="Creator"
        title="Creator links"
        subtitle="Let readers find and support your work directly from your profile."
        backHref="/pro/creator/dashboard"
        backLabel="Dashboard"
        isPro
      />
      <CreatorLinksClient
        userId={user.id}
        initialValues={{
          comic_url:       profile.comic_url,
          patreon_url:     profile.patreon_url,
          kickstarter_url: profile.kickstarter_url,
        }}
        isPro={isPro}
      />
    </PageShell>
  )
}
