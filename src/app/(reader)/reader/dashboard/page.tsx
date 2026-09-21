import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting'
import { ContinueReadingHero } from '@/components/dashboard/ContinueReadingHero'
import { ReaderStatsSection } from '@/components/dashboard/ReaderStatsSection'
import { MonthlyGoalPrompt } from '@/components/dashboard/MonthlyGoalPrompt'
import { MonthlyReaderSection } from '@/components/dashboard/MonthlyReaderSection'
import { ReadingCalendarSection } from '@/components/dashboard/ReadingCalendarSection'
import { CompletedSeriesSection } from '@/components/dashboard/CompletedSeriesSection'
import { ActiveBakesSection } from '@/components/dashboard/ActiveBakesSection'
import { NotificationsFeedSection } from '@/components/dashboard/NotificationsFeedSection'
import { ListsCollectionsShelf } from '@/components/dashboard/ListsCollectionsShelf'
import { SavedComicsSection } from '@/components/dashboard/SavedComicsSection'
import { CircleSection } from '@/components/dashboard/CircleSection'
import { ProfileCompletionBanner } from '@/components/dashboard/ProfileCompletionBanner'
import { ProUpsellCard } from '@/components/dashboard/ProUpsellCard'
import { DashboardViewTabs } from '@/components/dashboard/DashboardViewTabs'
import { CuratorPanel } from '@/components/dashboard/CuratorPanel'
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

  const monthStartStr = startOfMonth.toISOString().slice(0, 10)
  const lastMonthStartStr = startOfLastMonth.toISOString().slice(0, 10)
  const calendarStartStr = new Date(Date.now() - 112 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

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
    { data: curatorSubmissions },
    { data: monthlyActivity },
    { data: lastMonthActivity },
    { data: allTimeActivity },
    { count: completedCount },
    { data: bakes },
    { data: notifications },
    { count: unreadCount },
    { data: rawCalendarActivity },
    { data: typeActivityRows },
    { data: completedItems },
    { data: savedItems },
    { data: myReadingLists },
    { data: myCollections },
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
    supabase.from('recommendations')
      .select('id, title, cover_url, is_approved, is_draft, rejection_reason, upvotes, save_count, view_count, review_count')
      .eq('user_id', user.id)
      .eq('is_own_work', false)
      .order('created_at', { ascending: false }),
    supabase.from('reading_activity')
      .select('chapters_read')
      .eq('user_id', user.id)
      .gte('activity_date', monthStartStr),
    supabase.from('reading_activity')
      .select('chapters_read')
      .eq('user_id', user.id)
      .gte('activity_date', lastMonthStartStr)
      .lt('activity_date', monthStartStr),
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
    // Reading Calendar — full 16-week lookback window
    supabase.from('reading_activity')
      .select('activity_date, chapters_read')
      .eq('user_id', user.id)
      .gte('activity_date', calendarStartStr),
    // This month's chapters by type — real, not all-time (reading_activity.type
    // exists as of add_reading_activity_type_tracking.sql)
    supabase.from('reading_activity')
      .select('type, chapters_read')
      .eq('user_id', user.id)
      .gte('activity_date', monthStartStr),
    // Completed series with real covers
    myListIds.length > 0
      ? supabase.from('reading_list_items')
          .select('id, recommendations(id, title, cover_url, type)')
          .in('list_id', myListIds)
          .eq('status', 'completed')
          .order('updated_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
    // Saved comics with real covers
    supabase.from('saves')
      .select('id, recommendations(id, title, cover_url, type, chapter_count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6),
    // Lists shelf — item counts; covers fetched separately below
    supabase.from('reading_lists')
      .select('id, name, reading_list_items(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(2),
    // Collections shelf
    (supabase as any).from('collections')
      .select('id, name, collection_items(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(2),
  ])

  // ── Reading source links — for ContinueReadingHero's source-aware Continue
  // button. Compicfy isn't a reading platform, so "Continue reading" must
  // point at wherever the user actually reads this comic, not an internal page. ──
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

  // ── Lists & Collections shelf — cover thumbnails (item counts came back as
  // nested count objects above, covers need one more targeted pass) ──
  const listIds = (myReadingLists ?? []).map((l: any) => l.id)
  const collectionIds = (myCollections ?? []).map((c: any) => c.id)

  const [{ data: listCovers }, { data: collectionCovers }] = await Promise.all([
    listIds.length > 0
      ? supabase.from('reading_list_items')
          .select('list_id, recommendations(cover_url)')
          .in('list_id', listIds)
      : Promise.resolve({ data: [] }),
    collectionIds.length > 0
      ? (supabase as any).from('collection_items')
          .select('collection_id, recommendations(cover_url)')
          .in('collection_id', collectionIds)
      : Promise.resolve({ data: [] }),
  ])

  const coversByList = new Map<string, string[]>()
  for (const row of (listCovers ?? []) as any[]) {
    const url = row.recommendations?.cover_url
    if (!url) continue
    const arr = coversByList.get(row.list_id) ?? []
    if (arr.length < 3) arr.push(url)
    coversByList.set(row.list_id, arr)
  }
  const coversByCollection = new Map<string, string[]>()
  for (const row of (collectionCovers ?? []) as any[]) {
    const url = row.recommendations?.cover_url
    if (!url) continue
    const arr = coversByCollection.get(row.collection_id) ?? []
    if (arr.length < 3) arr.push(url)
    coversByCollection.set(row.collection_id, arr)
  }

  const shelfEntries = [
    ...(myReadingLists ?? []).map((l: any) => ({
      id: l.id, name: l.name, kind: 'list' as const,
      itemCount: l.reading_list_items?.[0]?.count ?? 0,
      covers: coversByList.get(l.id) ?? [],
      href: `/reader/dashboard/lists/${l.id}`,
    })),
    ...(myCollections ?? []).map((c: any) => ({
      id: c.id, name: c.name, kind: 'collection' as const,
      itemCount: c.collection_items?.[0]?.count ?? 0,
      covers: coversByCollection.get(c.id) ?? [],
      href: `/collections/${c.id}`, // TODO confirm this route once collections have a real detail page
    })),
  ]

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
  const monthlyGoal       = profile.monthly_reading_goal ?? 50

  const activityByDate: Record<string, number> = {}
  for (const row of (rawCalendarActivity ?? []) as any[]) {
    activityByDate[row.activity_date] = (activityByDate[row.activity_date] ?? 0) + (row.chapters_read ?? 0)
  }

  const chaptersByType = new Map<string, number>()
  for (const row of (typeActivityRows ?? []) as any[]) {
    if (!row.type) continue // pre-migration rows have no type recorded — expected, not a bug
    chaptersByType.set(row.type, (chaptersByType.get(row.type) ?? 0) + (row.chapters_read ?? 0))
  }
  const typeBreakdown = [...chaptersByType.entries()]
    .map(([type, chapters]) => ({ type, chapters }))
    .sort((a, b) => b.chapters - a.chapters)

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

      <MonthlyGoalPrompt userId={user.id} currentGoal={monthlyGoal} />

      <ReaderStatsSection
        savedCount={savedCount ?? 0}
        listsCount={listsCount ?? 0}
        reviewCount={reviewCount ?? 0}
        allTimeChapters={allTimeChapters}
        monthlyChapters={monthlyChapters}
        lastMonthChapters={lastMonthChapters}
        completedCount={completedCount ?? 0}
        currentStreak={profile.current_streak ?? 0}
        monthlyGoal={monthlyGoal}
        savedHref="/reader/dashboard/saved"
        listsHref="/reader/dashboard/lists"
        reviewsHref="/reader/dashboard/reviews"
      />

      <MonthlyReaderSection
        userId={user.id}
        monthlyChapters={monthlyChapters}
        lastMonthChapters={lastMonthChapters}
        initialGoal={monthlyGoal}
        typeBreakdown={typeBreakdown}
      />

      <ReadingCalendarSection activityByDate={activityByDate} />

      <CompletedSeriesSection items={completedItems ?? []} />

      <ActiveBakesSection bakes={bakesWithProgress} />

      <NotificationsFeedSection
        notifications={notifications ?? []}
        unreadCount={unreadCount ?? 0}
        notificationsHref="/reader/dashboard/notifications"
      />

      <ListsCollectionsShelf entries={shelfEntries} allHref="/reader/dashboard/lists" />

      <SavedComicsSection items={savedItems ?? []} allHref="/reader/dashboard/saved" />

      <CircleSection
        items={feedItems}
        isFollowingNobody={(followingCount ?? 0) === 0}
        feedHref="/feed"
        discoverHref="/feed?tab=discover"
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