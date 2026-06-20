import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreatorLinksClient } from '@/components/creator/CreatorLinksClient'
import { Link as LinkIcon } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Creator Links' }

export default async function CreatorLinksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('comic_url, patreon_url, kickstarter_url, is_pro, pro_expires_at, role')
    .eq('id', user.id)
    .single() as { data: any }

  if (!profile) redirect('/login')

  const isAdmin = ['admin', 'moderator'].includes(profile?.role ?? '')
  const isPro   = isAdmin || (profile?.is_pro &&
    (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
          <LinkIcon size={16} className="text-teal-500" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight">Creator Links</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Let readers find and support your work directly.
          </p>
        </div>
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