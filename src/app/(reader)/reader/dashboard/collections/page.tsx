import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CollectionsClient } from '@/components/collections/CollectionsClient'
import { UpgradeBanner } from '@/components/pro/UpgradeBanner'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Collections' }

const FREE_COLLECTION_LIMIT = 3

export default async function ReaderCollectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_pro, pro_expires_at')
    .eq('id', user.id)
    .single() as { data: any }

  const isAdmin = ['admin', 'moderator'].includes(profile?.role ?? '')
  const isPro   = isAdmin || (
    profile?.is_pro &&
    (!profile?.pro_expires_at || new Date(profile.pro_expires_at) > new Date())
  )

  // Count collections for upsell banner (server-side, no flash)
  const { count: collectionCount } = await (supabase as any)
    .from('collections')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const count       = collectionCount ?? 0
  const showBanner  = !isPro && count >= FREE_COLLECTION_LIMIT
  const nearLimit   = !isPro && count >= FREE_COLLECTION_LIMIT - 1

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-0">
      {/* Pro upsell — shown when at or near the free collection limit */}
      {(showBanner || nearLimit) && (
        <div className="mb-6">
          <UpgradeBanner
            current={count}
            limit={FREE_COLLECTION_LIMIT}
            feature="collections"
            message={
              showBanner
                ? `You've reached your free collection limit`
                : `You're close to your free collection limit`
            }
            dismissible
          />
        </div>
      )}

      {/* CollectionsClient in ownOnly mode — fetches user's own collections via API */}
      <CollectionsClient
        userId={user.id}
        isProUser={isPro}
        ownOnly
        basePath="/reader/dashboard/collections"
        savedCollectionIds={[]}
      />
    </div>
  )
}