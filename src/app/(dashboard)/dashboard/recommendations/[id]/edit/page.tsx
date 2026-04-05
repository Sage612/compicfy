import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { EditRecommendationForm } from '@/components/recommendations/EditRecommendationForm'
import { Pencil } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Edit Recommendation' }

export default async function EditRecommendationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch the recommendation — must belong to this user
  const { data: rec } = await (supabase as any)
    .from('recommendations')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!rec) notFound()

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
          <Pencil size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Edit Recommendation</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Changes will require re-approval before going live
          </p>
        </div>
      </div>

      {/* Re-approval notice */}
      <div className="flex gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
        <span className="text-amber-500 text-base shrink-0">⚠️</span>
        <p className="text-xs text-amber-600 leading-relaxed">
          Editing this recommendation will reset its approval status. It will be hidden from the
          public browse page until reviewed again by our team.
        </p>
      </div>

      <EditRecommendationForm recommendation={rec} userId={user.id} />
    </div>
  )
}