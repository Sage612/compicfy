import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { EditRecommendationForm } from '@/components/recommendations/EditRecommendationForm'
import type { Metadata } from 'next'
import { PageShell, PageHeader } from '@/components/dashboard/PageHeader'

export const metadata: Metadata = { title: 'Edit Work' }

export default async function CreatorEditWorkPage({ params }: { params: Promise<{ id: string }> }) {
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
        eyebrow="Creator"
        title="Edit work"
        subtitle="Changes will require re-approval."
        backHref="/creator/dashboard/works"
        backLabel="Works"
      />
      <EditRecommendationForm recommendation={rec} userId={user.id} />
    </PageShell>
  )
}
