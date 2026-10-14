import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProAnalyticsClient } from '@/components/pro/ProAnalyticsClient'
import { PageShell } from '@/components/dashboard/PageHeader'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Analytics | Pro' }

export default async function ProCreatorAnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: recommendations },
    { data: analytics },
  ] = await Promise.all([
    supabase
      .from('recommendations')
      .select('id, title, cover_url, type, upvotes, downvotes, save_count, view_count, review_count, score, created_at')
      .eq('user_id', user.id)
      .eq('is_approved', true)
      .order('score', { ascending: false }),
    (supabase as any)
      .from('recommendation_analytics')
      .select('recommendation_id, date, views, saves, upvotes, downvotes')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(500),
  ])

  return (
    <PageShell>
      <ProAnalyticsClient
        recommendations={(recommendations ?? []).map(r => ({
          ...r,
          upvotes:      r.upvotes      ?? 0,
          downvotes:    r.downvotes    ?? 0,
          save_count:   r.save_count   ?? 0,
          view_count:   r.view_count   ?? 0,
          review_count: r.review_count ?? 0,
          score:        r.score        ?? 0,
          created_at:   r.created_at   ?? '',
        }))}
        analytics={analytics ?? []}
        backHref="/pro/reader/dashboard"
        isPro
      />
    </PageShell>
  )
}
