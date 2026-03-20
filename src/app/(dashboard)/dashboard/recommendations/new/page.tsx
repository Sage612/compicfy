import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RecommendationForm } from '@/components/recommendations/RecommendationForm'
import { Sparkles } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Submit a Recommendation' }

interface Props {
  searchParams: Promise<{ title?: string }>
}

export default async function NewRecommendationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles size={16} className="text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Submit a Recommendation</h1>
        </div>
        <p className="text-muted-foreground text-sm pl-0.5">
          Share a comic you love with the Compicfy community
        </p>
      </div>

  <RecommendationForm userId={user.id} />
    </div>
  )
}