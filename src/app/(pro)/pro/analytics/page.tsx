import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProAnalyticsClient } from '@/components/pro/ProAnalyticsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Analytics | Pro' }

export default async function ProAnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_pro, pro_expires_at')
    .eq('id', user.id)
    .single() as { data: any }

  const isPro = profile?.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date())
  if (!isPro && profile?.role !== 'admin') redirect('/pricing?reason=pro_required')

  const { data: recs } = await supabase
    .from('recommendations')
    .select('id, title, cover_url, type, upvotes, downvotes, save_count, view_count, review_count, score, created_at')
    .eq('user_id', user.id)
    .eq('is_approved', true)
    .order('score', { ascending: false })

  const { data: analytics } = await supabase
    .from('recommendation_analytics')
    .select('*')
    .in('recommendation_id', (recs ?? []).map((r: any) => r.id))
    .order('date', { ascending: false })
    .limit(300)

  return (
    <ProAnalyticsClient
      recommendations={recs ?? []}
      analytics={analytics ?? []}
    />
  )
}