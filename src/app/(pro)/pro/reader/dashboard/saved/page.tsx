import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SavedComicsClient, type SavedItem } from '@/components/user/SavedComicsClient'
import { PageShell } from '@/components/dashboard/PageHeader'
import type { Recommendation } from '@/types/app.types'
import type { Metadata } from 'next'
import { FREE_LIMITS } from '@/lib/utils/constants'

export const metadata: Metadata = { title: 'Saved Comics | Pro' }

export default async function ProReaderSavedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
        isPro
        saveLimit={FREE_LIMITS.saves}
        backHref="/pro/reader/dashboard"
      />
    </PageShell>
  )
}