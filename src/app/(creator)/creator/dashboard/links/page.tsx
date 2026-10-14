import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreatorLinksClient } from '@/components/creator/CreatorLinksClient'
import { isAdmin as isAdminCheck, isProUser } from '@/lib/access'
import type { Metadata } from 'next'
import { PageShell, PageHeader } from '@/components/dashboard/PageHeader'

export const metadata: Metadata = { title: 'Creator Links' }

export default async function CreatorLinksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('comic_url, patreon_url, kickstarter_url, is_pro, pro_expires_at, is_patron, patron_expires_at, role')
    .eq('id', user.id)
    .single() as { data: any }

  if (!profile) redirect('/login')

  const isAdmin = isAdminCheck(profile ?? { role: '' })
  const isPro   = isProUser(profile ?? { role: '', is_pro: false, pro_expires_at: null })

  return (
    <PageShell width="narrow">
      <PageHeader
        eyebrow="Creator"
        title="Creator links"
        subtitle="Let readers find and support your work directly from your profile."
        backHref="/creator/dashboard"
        backLabel="Dashboard"
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
