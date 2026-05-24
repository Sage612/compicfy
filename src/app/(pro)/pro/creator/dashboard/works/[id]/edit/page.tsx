import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { EditRecommendationForm } from '@/components/recommendations/EditRecommendationForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Edit Work' }

export default async function ProCreatorEditWorkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rec } = await supabase.from('recommendations').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!rec) notFound()

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Edit Work</h1>
        <p className="text-sm text-muted-foreground mt-1">Changes will require re-approval.</p>
      </div>
      <EditRecommendationForm recommendation={rec} userId={user.id} />
    </div>
  )
}
