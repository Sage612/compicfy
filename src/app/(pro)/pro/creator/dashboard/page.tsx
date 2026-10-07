import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProAvatar } from '@/components/pro/ProAvatar'
import { ProBadge } from '@/components/pro/ProBadge'
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting'
import { CreatorWorksPanel } from '@/components/dashboard/CreatorWorksPanel'
import { formatDate } from '@/lib/utils/format'
import type { Metadata } from 'next'
import { isAdmin as isAdminCheck, isProUser, canAccessProDashboard } from '@/lib/access'

export const metadata: Metadata = { title: 'Pro Creator Studio' }

export default async function ProCreatorDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profileData) redirect('/login')
  const profile = profileData as any

  const isAdmin = isAdminCheck(profile)
  const isPro   = isProUser(profile)
  if (!canAccessProDashboard(profile)) redirect('/pricing?reason=pro_required')

  const workIds = await supabase
    .from('recommendations').select('id').eq('user_id', user.id)
    .then(r => (r.data ?? []).map((x: any) => x.id))

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const monthStart    = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [
    { data: works, count: worksCount },
    { count: followersCount },
    { count: followingCount },
    { count: newFollowersThisMonth },
    { count: profileViewsTotal },
    { count: profileViewsThisMonth },
    { data: recentReviews },
    { data: allReviews },
    { data: analyticsData },
  ] = await Promise.all([
    supabase
      .from('recommendations')
      .select('id, title, cover_url, upvotes, save_count, view_count, review_count, is_approved', { count: 'exact' })
      .eq('user_id', user.id)
      .order('score', { ascending: false })
      .limit(6),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id).gte('created_at', monthStart),
    (supabase as any).from('profile_views').select('*', { count: 'exact', head: true }).eq('profile_id', user.id),
    (supabase as any).from('profile_views').select('*', { count: 'exact', head: true }).eq('profile_id', user.id).gte('viewed_at', monthStart),
    workIds.length > 0
      ? supabase
          .from('reviews')
          .select('id, content, rating, created_at, profiles!reviews_user_id_fkey(username, avatar_url), recommendations(title)')
          .in('recommendation_id', workIds)
          .order('created_at', { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] }),
    workIds.length > 0
      ? supabase.from('reviews').select('rating').in('recommendation_id', workIds).not('rating', 'is', null)
      : Promise.resolve({ data: [] }),
    workIds.length > 0
      ? (supabase as any)
          .from('recommendation_analytics')
          .select('recommendation_id, date, views, saves, upvotes')
          .in('recommendation_id', workIds)
          .gte('date', thirtyDaysAgo)
          .order('date', { ascending: false })
          .limit(300)
      : Promise.resolve({ data: [] }),
  ])

  const totalUpvotes  = (works ?? []).reduce((s: number, w: any) => s + (w.upvotes ?? 0), 0)
  const totalViews    = (works ?? []).reduce((s: number, w: any) => s + (w.view_count ?? 0), 0)
  const totalSaves    = (works ?? []).reduce((s: number, w: any) => s + (w.save_count ?? 0), 0)
  const last30Views   = (analyticsData ?? []).reduce((s: number, a: any) => s + (a.views ?? 0), 0)
  const last30Saves   = (analyticsData ?? []).reduce((s: number, a: any) => s + (a.saves ?? 0), 0)
  const last30Upvotes = (analyticsData ?? []).reduce((s: number, a: any) => s + (a.upvotes ?? 0), 0)

  const ratings   = (allReviews ?? []).map((r: any) => r.rating).filter(Boolean)
  const avgRating = ratings.length > 0 ? ratings.reduce((s: number, r: number) => s + r, 0) / ratings.length : null

  const hasLinks = !!(profile.patreon_url || profile.kickstarter_url || profile.comic_url)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <DashboardGreeting
        displayName={profile.display_name || profile.username}
        avatarUrl={profile.avatar_url ?? null}
        subtitle={`${worksCount ?? 0} work${(worksCount ?? 0) === 1 ? '' : 's'} · ${followersCount ?? 0} follower${(followersCount ?? 0) === 1 ? '' : 's'}.`}
        settingsHref="/pro/creator/dashboard/settings"
        avatarSlot={
          <ProAvatar
            src={profile.avatar_url ?? undefined}
            fallback={(profile.display_name || profile.username).slice(0, 2).toUpperCase()}
            size="sm"
            isPro={isPro}
            isAdmin={isAdmin}
          />
        }
        badges={<ProBadge role={profile.role} isPro={isPro} label={isAdmin ? 'Admin' : 'Pro Creator'} />}
      />

      <CreatorWorksPanel
        works={(works ?? []) as any}
        worksCount={worksCount ?? 0}
        followersCount={followersCount ?? 0}
        followingCount={followingCount ?? 0}
        totalUpvotes={totalUpvotes}
        totalViews={totalViews}
        totalSaves={totalSaves}
        isPro={true}
        dashboardPrefix="/pro"
        hasLinks={hasLinks}
        links={{ comic_url: profile.comic_url, patreon_url: profile.patreon_url, kickstarter_url: profile.kickstarter_url }}
        recentReviews={(recentReviews ?? []) as any}
        avgRating={avgRating}
        last30Views={last30Views}
        last30Saves={last30Saves}
        last30Upvotes={last30Upvotes}
        profileViewsMonth={profileViewsThisMonth ?? 0}
        profileViewsTotal={profileViewsTotal ?? 0}
        newFollowersMonth={newFollowersThisMonth ?? 0}
      />

      {/* Pro status footer — same pattern as the pro reader dashboard */}
      <div className="rounded-2xl border border-border p-4">
        <p className="text-sm font-medium">
          {isAdmin ? 'Admin — lifetime access' : profile.pro_expires_at ? `Pro Creator until ${formatDate(profile.pro_expires_at)}` : 'Pro Creator — lifetime access'}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Analytics, milestones, sentiment tracking & priority review.
        </p>
      </div>
    </div>
  )
}