import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RecsClient } from '@/components/recommendations/RecsClient'
import { PageShell } from '@/components/dashboard/PageHeader'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Recommendations' }

export default async function ReaderRecommendationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: recs } = await supabase
    .from('recommendations')
    .select('id, title, cover_url, type, is_approved, is_draft, draft_saved_at, upvotes, downvotes, view_count, review_count, save_count, created_at, updated_at, rejection_reason, appeal_status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <PageShell>
      <RecsClient
        initialRecs={(recs as any[]) ?? []}
        userId={user.id}
        newRecHref="/reader/dashboard/recommendations/new"
        editBasePath="/reader/dashboard/recommendations"
        isPro={false}
      />
    </PageShell>
  )
}