import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProAnalyticsClient } from '@/components/pro/ProAnalyticsClient'
import type { Metadata } from 'next'

// Inline image proxy helper to route external covers safely
const proxyCover = (url: string | null): string => {
  if (!url) return ''
  if (url.startsWith('/') || url.startsWith('blob:')) return url
  return \/api/proxy/image?url=\\
}

export const metadata: Metadata = { title: 'Analytics | Pro' }

export default async function ProCreatorAnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: recommendations },
    { data: analytics },
  ] = await Promise.all([
    supabase
      .from('recommendations')
      .select('id, title, cover_url, type, upvotes, downvotes, save_count, view_count, review_count, score, created_at')
      .eq('user_id', user.id)
      .eq('is_approved', true)
      .order('score', { ascending: false }),
    (supabase as any)
      .from('recommendation_analytics')
      .select('recommendation_id, date, views, saves, upvotes, downvotes')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(500),
  ])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <ProAnalyticsClient
        recommendations={recommendations ?? []}
        analytics={analytics ?? []}
      />
    </div>
  )
}