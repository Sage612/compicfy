import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RecommendationForm } from '@/components/recommendations/RecommendationForm'
import { Suspense } from 'react'
import { BookOpen } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Submit Recommendation' }

export default async function ReaderNewRecPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
            Submit a Recommendation
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Share a comic you love with the community.
          </p>
        </div>
      </div>
      <Suspense fallback={<div className="h-96 bg-muted/30 animate-pulse rounded-2xl" />}>
        <RecommendationForm userId={user.id} />
      </Suspense>
    </div>
  )
}