import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RecsClient } from '@/components/recommendations/RecsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Works' }

export default async function CreatorWorksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: recs } = await supabase
    .from('recommendations')
    .select('id, title, cover_url, type, is_approved, upvotes, downvotes, view_count, review_count, save_count, created_at, updated_at, rejection_reason, appeal_status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <RecsClient
        initialRecs={(recs as any[]) ?? []}
        userId={user.id}
        newRecHref="/creator/dashboard/works/new"
        editRecHref={(id) => `/creator/dashboard/works/${id}/edit`}
        isPro={false}
        accentColor="teal"
      />
    </div>
  )
}