import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting'
import { CreatorWorksPanel } from '@/components/dashboard/CreatorWorksPanel'
import { Palette } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Creator Studio' }

export default async function CreatorDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profileData) redirect('/login')
  const profile = profileData as any

  const workIds = await supabase
    .from('recommendations').select('id').eq('user_id', user.id)
    .then(r => (r.data ?? []).map((x: any) => x.id))

  const [
    { data: works, count: worksCount },
    { count: followersCount },
    { count: followingCount },
    { data: recentReviews },
  ] = await Promise.all([
    supabase
      .from('recommendations')
      .select('id, title, cover_url, upvotes, save_count, view_count, review_count, is_approved', { count: 'exact' })
      .eq('user_id', user.id)
      .order('score', { ascending: false })
      .limit(6),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
    workIds.length > 0
      ? supabase
          .from('reviews')
          .select('id, content, rating, created_at, profiles!reviews_user_id_fkey(username, avatar_url), recommendations(title)')
          .in('recommendation_id', workIds)
          .order('created_at', { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [] }),
  ])

  const totalUpvotes = (works ?? []).reduce((s: number, w: any) => s + (w.upvotes ?? 0), 0)
  const totalViews   = (works ?? []).reduce((s: number, w: any) => s + (w.view_count ?? 0), 0)
  const totalSaves   = (works ?? []).reduce((s: number, w: any) => s + (w.save_count ?? 0), 0)
  const hasLinks     = !!(profile.patreon_url || profile.kickstarter_url || profile.comic_url)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <DashboardGreeting
        displayName={profile.display_name || profile.username}
        avatarUrl={profile.avatar_url ?? null}
        subtitle={`${worksCount ?? 0} work${(worksCount ?? 0) === 1 ? '' : 's'} · ${followersCount ?? 0} follower${(followersCount ?? 0) === 1 ? '' : 's'}.`}
        settingsHref="/creator/dashboard/settings"
        badges={
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-border text-muted-foreground">
            <Palette size={9} />Creator
          </span>
        }
      />

      <CreatorWorksPanel
        works={(works ?? []) as any}
        worksCount={worksCount ?? 0}
        followersCount={followersCount ?? 0}
        followingCount={followingCount ?? 0}
        totalUpvotes={totalUpvotes}
        totalViews={totalViews}
        totalSaves={totalSaves}
        isPro={false}
        dashboardPrefix=""
        hasLinks={hasLinks}
        links={{ comic_url: profile.comic_url, patreon_url: profile.patreon_url, kickstarter_url: profile.kickstarter_url }}
        recentReviews={(recentReviews ?? []) as any}
      />
    </div>
  )
}