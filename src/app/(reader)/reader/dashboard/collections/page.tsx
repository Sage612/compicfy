import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CollectionsClient } from '@/components/collections/CollectionsClient'
import { UpgradeBanner } from '@/components/pro/UpgradeBanner'
import { PageShell } from '@/components/dashboard/PageHeader'
import { FREE_LIMITS } from '@/lib/utils/constants'
import type { Metadata } from 'next'
import { hasUnlimitedPerks } from '@/lib/access'

export const metadata: Metadata = { title: 'My Collections' }

export default async function ReaderCollectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_pro, pro_expires_at, is_patron, patron_expires_at')
    .eq('id', user.id)
    .single() as { data: any }

  const isPro = profile ? hasUnlimitedPerks(profile) : false

  const { count } = await (supabase as any)
    .from('collections')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const collectionCount = count ?? 0
  const limit           = FREE_LIMITS.collections
  const showBanner      = !isPro && collectionCount >= limit - 1

  return (
    <PageShell>
      {showBanner && (
        <UpgradeBanner
          current={collectionCount}
          limit={limit}
          feature="collections"
          message={
            collectionCount >= limit
              ? `You've reached your free collection limit`
              : `You're close to your free collection limit`
          }
          dismissible
        />
      )}

      <CollectionsClient
        userId={user.id}
        isProUser={isPro}
        ownOnly
        basePath="/reader/dashboard/collections"
        savedCollectionIds={[]}
        showMobileCreate  // signals component to show create button on mobile too
        backHref="/reader/dashboard"
        backLabel="Dashboard"
      />
    </PageShell>
  )
}
