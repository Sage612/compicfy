import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { EditRecommendationForm } from '@/components/recommendations/EditRecommendationForm'
import { Crown } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Edit Recommendation Pro' }

export default async function ProEditRecommendationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_pro, pro_expires_at')
    .eq('id', user.id)
    .single() as { data: any }

  const isPro =
    profile?.role === 'admin' ||
    (profile?.is_pro &&
      (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))

  if (!isPro) redirect('/pricing?reason=pro_required')

  // Must belong to this user
  const { data: rec } = await supabase
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
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
          <Crown size={17} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Edit Recommendation</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
             Changes require re-approval before going live
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