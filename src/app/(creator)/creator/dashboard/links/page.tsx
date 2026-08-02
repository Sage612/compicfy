import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreatorLinksClient } from '@/components/creator/CreatorLinksClient'
import { Link as LinkIcon } from 'lucide-react'
import { isAdmin as isAdminCheck, isProUser } from '@/lib/access'
import type { Metadata } from 'next'

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
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Creator Links</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add your links so readers can find and support your work directly from your profile.
        </p>
      </div>
      <CreatorLinksClient
        userId={user.id}
        initialValues={{
          comic_url:       profile.comic_url,
          patreon_url:     profile.patreon_url,
          kickstarter_url: profile.kickstarter_url,
        }}
        isPro={isPro}
      />
    </div>
  )
}