import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SavedComicsClient, type SavedItem } from '@/components/user/SavedComicsClient'
import { PageShell } from '@/components/dashboard/PageHeader'
import type { Recommendation } from '@/types/app.types'
import type { Metadata } from 'next'
import { hasUnlimitedPerks } from '@/lib/access'
import { FREE_LIMITS } from '@/lib/utils/constants'

export const metadata: Metadata = { title: 'Saved Comics' }

export default async function ReaderSavedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_pro, pro_expires_at, is_patron, patron_expires_at')
    .eq('id', user.id)
    .single() as { data: any }

  const isPro = profile ? hasUnlimitedPerks(profile) : false

  const { data: saves } = await supabase
    .from('saves')
    .select('recommendation_id, created_at, recommendations(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const items: SavedItem[] = (saves ?? [])
    .map((s: any) => ({
      saved_at: s.created_at as string,
      rec: (Array.isArray(s.recommendations) ? s.recommendations[0] : s.recommendations) as Recommendation,
    }))
    .filter(i => !!i.rec)

  return (
    <PageShell width="wide">
      <SavedComicsClient
        initialItems={items}
        userId={user.id}
        isPro={isPro}
        saveLimit={FREE_LIMITS.saves}
        backHref="/reader/dashboard"
      />
    </PageShell>
  )
}