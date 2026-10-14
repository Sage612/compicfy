import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RecommendationForm } from '@/components/recommendations/RecommendationForm'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PageShell, PageHeader } from '@/components/dashboard/PageHeader'

export const metadata: Metadata = { title: 'Submit Your Work' }

export default async function CreatorNewWorkPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <PageShell>
      <PageHeader
        eyebrow="Creator"
        title="Submit your work"
        subtitle="Add your comic so the community can discover it."
        backHref="/creator/dashboard/works"
        backLabel="Works"
      />
      <Suspense fallback={<div className="h-96 bg-muted/30 animate-pulse rounded-xl" />}>
        <RecommendationForm userId={user.id} />
      </Suspense>
    </PageShell>
  )
}
