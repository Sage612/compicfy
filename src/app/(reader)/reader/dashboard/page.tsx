import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting'
import { ContinueReadingHero } from '@/components/dashboard/ContinueReadingHero'
import { ReaderStatsSection } from '@/components/dashboard/ReaderStatsSection'
import { ActiveBakesSection } from '@/components/dashboard/ActiveBakesSection'
import { NotificationsFeedSection } from '@/components/dashboard/NotificationsFeedSection'
import { CircleSection } from '@/components/dashboard/CircleSection'
import { QuickAccessSection } from '@/components/dashboard/QuickAccessSection'
import { ProfileCompletionBanner } from '@/components/dashboard/ProfileCompletionBanner'
import { ProUpsellCard } from '@/components/dashboard/ProUpsellCard'
import { DashboardViewTabs } from '@/components/dashboard/DashboardViewTabs'
import { CuratorPanel } from '@/components/dashboard/CuratorPanel'
import { CurrentlyReadingSection } from '@/components/recommendations/CurrentlyReadingSection'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function ReaderDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  if (!profileData) redirect('/login')
  const profile = profileData as any

  const { data: followData } = await supabase
    .from('follows').select('following_id').eq('follower_id', user.id)
  const followingIds = (followData ?? []).map((f: any) => f.following_id)

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const startOfLastMonth = new Date(startOfMonth)
  startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1)

  // Two-step list-id pattern — the proven fix for PostgREST silently
  // ignoring nested-relation filters like .eq('reading_lists.user_id', ...).
  const { data: myLists } = await supabase
    .from('reading_lists').select('id').eq('user_id', user.id)
  const myListIds = (myLists ?? []).map((l: any) => l.id)

  const [
    { count: listsCount },
    { count: savedCount },
    { count: followingCount },
    { count: reviewCount },
    { count: monthlyRecCount },
    { data: currentlyReading },
    { data: rawFeedItems },
    { data: listsForTracker },
    { data: curatorSubmissions },
    { data: monthlyActivity },
    { data: lastMonthActivity },
    { data: allTimeActivity },
    { count: completedCount },
    { data: bakes },
    { data: notifications },
    { count: unreadCount },
  ] = await Promise.all([
    supabase.from('reading_lists').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('saves').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('recommendations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString()),
    myListIds.length > 0
      ? supabase.from('reading_list_items')
          .select('id, list_id, status, progress_chapter, last_read_at, added_at, recommendations(id, title, cover_url, type, status, author, description, chapter_count)')
          .in('list_id', myListIds)
          .eq('status', 'reading')
          .order('last_read_at', { ascending: false, nullsFirst: false })
          .limit(6)
      : Promise.resolve({ data: [] }),
    followingIds.length > 0
      ? supabase
          .from('recommendations')
          .select(`id, title, cover_url, type, created_at, user_id, profiles!recommendations_user_id_fkey(username, display_name, avatar_url)`)
          .in('user_id', followingIds)
          .eq('is_approved', true)
          .not('content_rating', 'in', '("adult","mature")')
          .order('created_at', { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] }),
    supabase.from('reading_lists').select('id, name').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('recommendations')
      .select('id, title, cover_url, is_approved, is_draft, rejection_reason, upvotes, save_count, view_count, review_count')
      .eq('user_id', user.id)
      .eq('is_own_work', false)
      .order('created_at', { ascending: false }),
    supabase.from('reading_activity')
      .select('chapters_read')
      .eq('user_id', user.id)
      .gte('activity_date', startOfMonth.toISOString().slice(0, 10)),
    supabase.from('reading_activity')
      .select('chapters_read')
      .eq('user_id', user.id)
      .gte('activity_date', startOfLastMonth.toISOString().slice(0, 10))
      .lt('activity_date', startOfMonth.toISOString().slice(0, 10)),
    supabase.from('reading_activity')
      .select('chapters_read')
      .eq('user_id', user.id),
    myListIds.length > 0
      ? supabase.from('reading_list_items')
          .select('*', { count: 'exact', head: true })
          .in('list_id', myListIds)
          .eq('status', 'completed')
      : Promise.resolve({ count: 0 }),
    supabase.from('bake_requests')
      .select('id, recommendation_id, target_chapter_count, counting_mode, chapter_count_at_bake_start, predicted_ready_at, status, recommendations(id, title, cover_url, chapter_count)')
      .eq('user_id', user.id)
      .in('status', ['active', 'fulfilled'])
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('notifications')
      .select('id, type, title, content, data, is_read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),
  ])

  // ── Reading source links — for ContinueReadingHero's source-aware Continue
  // button. Only need these for comics currently being read. ──
  const readingRecIds = (currentlyReading ?? [])
    .map((item: any) => item.recommendations?.id)
    .filter(Boolean)
  const sourceByRec = new Map<string, string>()
  if (readingRecIds.length > 0) {
    const { data: sources } = await supabase
      .from('user_comic_sources')
      .select('recommendation_id, url')
      .eq('user_id', user.id)
      .in('recommendation_id', readingRecIds)
    for (const s of (sources ?? []) as any[]) {
      sourceByRec.set(s.recommendation_id, s.url)
    }
  }
  const readingItemsWithSource = (currentlyReading ?? []).map((item: any) => ({
    ...item,
    source_url: item.recommendations?.id ? (sourceByRec.get(item.recommendations.id) ?? null) : null,
  }))

  // ── from_read bake progress — needs each bake's comic-specific read progress ──
  const fromReadRecIds = (bakes ?? [])
    .filter((b: any) => b.counting_mode === 'from_read')
    .map((b: any) => b.recommendation_id)
  const progressByRec = new Map<string, number>()
  if (fromReadRecIds.length > 0 && myListIds.length > 0) {
    const { data: progressItems } = await supabase
      .from('reading_list_items')
      .select('recommendation_id, progress_chapter')
      .in('list_id', myListIds)
      .in('recommendation_id', fromReadRecIds)
    for (const item of (progressItems ?? []) as any[]) {
      if (item.progress_chapter != null) {
        const existing = progressByRec.get(item.recommendation_id) ?? 0
        progressByRec.set(item.recommendation_id, Math.max(existing, item.progress_chapter))
      }
    }
  }
  const bakesWithProgress = (bakes ?? []).map((b: any) => ({
    ...b,
    recommendation: Array.isArray(b.recommendations) ? b.recommendations[0] : b.recommendations,
    progress_chapter: b.counting_mode === 'from_read'
      ? (progressByRec.get(b.recommendation_id) ?? null)
      : null,
  }))

  const feedItems = (rawFeedItems ?? []).map((r: any) => {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
    return { ...r, profiles: p ?? null }
  })

  const normalizedCuratorSubmissions = (curatorSubmissions ?? []).map((submission: any) => ({
    id: submission.id,
    title: submission.title ?? 'Untitled',
    cover_url: submission.cover_url ?? null,
    is_approved: Boolean(submission.is_approved),
    is_draft: Boolean(submission.is_draft),
    rejection_reason: submission.rejection_reason ?? null,
    upvotes: Number(submission.upvotes ?? 0),
    save_count: Number(submission.save_count ?? 0),
    view_count: Number(submission.view_count ?? 0),
    review_count: Number(submission.review_count ?? 0),
  }))

  const sum = (rows: any[] | null) => (rows ?? []).reduce((s: number, r: any) => s + (r.chapters_read ?? 0), 0)
  const monthlyChapters   = sum(monthlyActivity)
  const lastMonthChapters = sum(lastMonthActivity)
  const allTimeChapters   = sum(allTimeActivity)
  const recCount          = monthlyRecCount ?? 0

  const readerView = (
    <div className="space-y-8">
      <DashboardGreeting
        displayName={profile.display_name || profile.username}
        avatarUrl={profile.avatar_url ?? null}
        currentStreak={profile.current_streak ?? 0}
        monthlyChapters={monthlyChapters}
        settingsHref="/reader/dashboard/settings"
      />

      <ProfileCompletionBanner
        hasAvatar={!!profile.avatar_url}
        hasBio={!!profile.bio}
        hasWebsite={!!profile.website}
      />

      <ContinueReadingHero items={readingItemsWithSource} listsHref="/reader/dashboard/lists" />

      <ReaderStatsSection
        savedCount={savedCount ?? 0}
        listsCount={listsCount ?? 0}
        reviewCount={reviewCount ?? 0}
        allTimeChapters={allTimeChapters}
        monthlyChapters={monthlyChapters}
        lastMonthChapters={lastMonthChapters}
        completedCount={completedCount ?? 0}
        currentStreak={profile.current_streak ?? 0}
        monthlyGoal={profile.monthly_reading_goal ?? 50}
        savedHref="/reader/dashboard/saved"
        listsHref="/reader/dashboard/lists"
        reviewsHref="/reader/dashboard/reviews"
      />

      <ActiveBakesSection bakes={bakesWithProgress} />

      <NotificationsFeedSection
        notifications={notifications ?? []}
        unreadCount={unreadCount ?? 0}
        notificationsHref="/reader/dashboard/notifications"
      />

      {/* Full interactive tracker — inline chapter updates. Handles its own
          empty state, so no separate empty-state block needed here. */}
      <CurrentlyReadingSection
        initialItems={(currentlyReading ?? []).map((item: any) => ({ ...item, status: item.status ?? 'reading' }))}
        lists={listsForTracker ?? []}
        listsHref="/reader/dashboard/lists"
      />

      <CircleSection
        items={feedItems}
        isFollowingNobody={(followingCount ?? 0) === 0}
        feedHref="/feed"
        discoverHref="/feed?tab=discover"
        browseHref="/browse"
      />

      <QuickAccessSection
        feedHref="/feed"
        listsHref="/reader/dashboard/lists"
        browseHref="/browse"
      />

      <ProUpsellCard
        title="Unlock Pro Reader"
        features={['Unlimited follows & lists', 'Reading analytics', 'Priority support', 'Profile themes']}
        ctaLabel="Upgrade to Pro Reader"
      />
    </div>
  )

  const curatorView = (
    <CuratorPanel
      submissions={normalizedCuratorSubmissions}
      monthlyCount={recCount}
      isPro={false}
      dashboardPrefix=""
    />
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <DashboardViewTabs
        showCurator={!!profile.is_curator}
        readerView={readerView}
        curatorView={curatorView}
      />
    </div>
  )
}