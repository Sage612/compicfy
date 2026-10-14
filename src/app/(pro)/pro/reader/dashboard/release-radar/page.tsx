import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReleaseRadar } from '@/components/recommendations/ReleaseRadar'
import { isProUser } from '@/lib/access'
import { PageShell } from '@/components/dashboard/PageHeader'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Release Radar | ComPicfy Pro',
}

export default async function ProReleaseRadarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_pro, pro_expires_at, is_patron, patron_expires_at, role')
    .eq('id', user.id)
    .single()

  const isPro = profile ? isProUser(profile as any) : false

  // Computed for real rather than hardcoded true — if a lapsed-Pro user
  // still lands on this route before any redirect logic elsewhere kicks
  // in, they should see the same gated view the free route would show
  // them, not a false sense of Pro access.
  return (
    <PageShell width="narrow">
      <ReleaseRadar isPro={isPro} backHref="/pro/reader/dashboard" />
    </PageShell>
  )
}