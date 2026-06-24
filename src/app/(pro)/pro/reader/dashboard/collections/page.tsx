import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CollectionsClient } from '@/components/collections/CollectionsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Collections' }

export default async function ProReaderCollectionsPage() {
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

  // Pro users have no collection limit — no upsell banner needed
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <CollectionsClient
        userId={user.id}
        isProUser={isPro}
        ownOnly
        basePath="/pro/reader/dashboard/collections"
        savedCollectionIds={[]}
      />
    </div>
  )
}