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

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
          <BookOpen size={20} className="text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
            Submit a Recommendation
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
            <Sparkles size={11} className="text-amber-500 shrink-0" />
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