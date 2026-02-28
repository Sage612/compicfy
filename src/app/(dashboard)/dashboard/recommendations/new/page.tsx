import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RecommendationForm } from '@/components/recommendations/RecommendationForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function NewRecommendationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Submit a Recommendation</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Share a comic you love with the Compicfy community
        </p>
      </div>
      <RecommendationForm userId={user.id} />
    </div>
  )
}