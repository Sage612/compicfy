import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CollectionsClient } from '@/components/collections/CollectionsClient'
import { PageShell } from '@/components/dashboard/PageHeader'
import type { Metadata } from 'next'
import { hasUnlimitedPerks } from '@/lib/access'

export const metadata: Metadata = { title: 'My Collections' }

export default async function ProReaderCollectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_pro, pro_expires_at, is_patron, patron_expires_at')
    .eq('id', user.id)
    .single() as { data: any }

  const isPro = profile ? hasUnlimitedPerks(profile) : false

  return (
    <PageShell>
      <CollectionsClient
        userId={user.id}
        isProUser={isPro}
        ownOnly
        basePath="/pro/reader/dashboard/collections"
        savedCollectionIds={[]}
        showMobileCreate
        backHref="/pro/reader/dashboard"
        backLabel="Dashboard"
        isPro
      />
    </PageShell>
  )
}
