import { createClient } from '@/lib/supabase/server'
import { CollectionsClient } from '@/components/collections/CollectionsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Collections',
  description: 'Browse curated comic collections from the Compicfy community.',
}

export default async function CollectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isProUser = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_pro, pro_expires_at')
      .eq('id', user.id)
      .single()
    isProUser = (profile as any)?.role === 'admin' ||
      ((profile as any)?.is_pro &&
        (!(profile as any)?.pro_expires_at ||
          new Date((profile as any).pro_expires_at) > new Date()))
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <CollectionsClient
        userId={user?.id ?? null}
        isProUser={isProUser}
        basePath="/collections"
      />
    </div>
  )
}