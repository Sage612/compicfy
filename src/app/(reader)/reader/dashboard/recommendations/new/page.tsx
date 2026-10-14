import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RecommendationForm } from '@/components/recommendations/RecommendationForm'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PageShell, PageHeader } from '@/components/dashboard/PageHeader'

export const metadata: Metadata = { title: 'Submit Recommendation' }

export default async function ReaderNewRecPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <PageShell>
      <PageHeader
        eyebrow="Curator"
        title="Submit a recommendation"
        subtitle="Share a comic you love with the community."
        backHref="/reader/dashboard/recommendations"
        backLabel="Recommendations"
      />
      <Suspense fallback={<div className="h-96 bg-muted/30 animate-pulse rounded-xl" />}>
        <RecommendationForm userId={user.id} />
      </Suspense>
    </PageShell>
  )
}
