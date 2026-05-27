import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RecommendationForm } from '@/components/recommendations/RecommendationForm'
import { Suspense } from 'react'
import { BookOpen, Sparkles } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Submit Recommendation | Pro' }

export default async function ProReaderNewRecPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Header with icon */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
          <BookOpen size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Submit a Recommendation</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Sparkles size={12} className="text-amber-500" />
            Unlimited submissions on Pro
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="h-96 bg-muted/30 animate-pulse rounded-2xl" />}>
        <RecommendationForm userId={user.id} />
      </Suspense>
    </div>
  )
}