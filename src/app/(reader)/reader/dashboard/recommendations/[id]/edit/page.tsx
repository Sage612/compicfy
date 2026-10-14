import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { EditRecommendationForm } from '@/components/recommendations/EditRecommendationForm'
import type { Metadata } from 'next'
import { PageShell, PageHeader } from '@/components/dashboard/PageHeader'

export const metadata: Metadata = { title: 'Edit Recommendation' }

export default async function ReaderEditRecPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rec } = await supabase
    .from('recommendations')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!rec) notFound()

  return (
    <PageShell>
      <PageHeader
        eyebrow="Curator"
        title="Edit recommendation"
        subtitle="Changes will require re-approval."
        backHref="/reader/dashboard/recommendations"
        backLabel="Recommendations"
      />
      <EditRecommendationForm recommendation={rec} userId={user.id} />
    </PageShell>
  )
}
