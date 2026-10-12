// src/app/creator/[username]/page.tsx
//
// Creator profile in the same "shrine" look as the reader profile.
// Tabs (Works / About) are instant: both panels render up front and the
// client component just toggles them.

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Recommendation } from '@/types/app.types'
import { getDashboardRoutes } from '@/lib/utils/routes'
import { isProUser, isAdmin as isAdminCheck } from '@/lib/access'
import { ShrineTabs, type ShrineTab } from '@/components/profile/shrine/ShrineTabs'
import { ProfileHero } from '@/components/profile/shrine/ProfileHero'
import {
  CreatorAboutSection, CreatorWorksSection, type CreatorLink,
} from '@/components/profile/shrine/sections'
import { compact } from '@/components/profile/shrine/util'

interface Props {
  params:       Promise<{ username: string }>
  searchParams: Promise<{ tab?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return { title: `${username} – Creator` }
}

export default async function CreatorProfilePage({ params, searchParams }: Props) {
  const { username } = await params
  const { tab: tabParam } = await searchParams

  const supabase = await createClient()
  const { data: { user: viewer } } = await supabase.auth.getUser()

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .single()

  if (!profileData) notFound()

  const userType = (profileData as any).user_type
  if (userType && userType !== 'creator') notFound()

  const profile  = profileData as any
  const isOwner  = viewer?.id === profile.id
  // isProUser()/isAdminCheck() from @/lib/access are the source of truth
  // (admin, patron, or is_pro and not expired).
  const isPro    = isProUser(profile)
  const isAdmin  = isAdminCheck(profile)
  const showGold = isPro && !isAdmin
  const initials = (profile.display_name || profile.username).slice(0, 2).toUpperCase()

  const ownerRoutes = getDashboardRoutes('creator', isPro)

  const [
    { data: works },
    { count: followersCount },
    { data: isFollowingData },
  ] = await Promise.all([
    supabase
      .from('recommendations')
      .select('*')
      .eq('user_id', profile.id)
      .eq('is_approved', true)
      .not('content_rating', 'in', '("adult","mature")')
      .order('upvotes', { ascending: false })
      .limit(12),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
    viewer && !isOwner
      ? supabase.from('follows').select('id').eq('follower_id', viewer.id).eq('following_id', profile.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const isFollowing  = !!isFollowingData
  const allWorks     = (works ?? []) as Recommendation[]
  const totalWorks   = allWorks.length
  const totalUpvotes = allWorks.reduce((s, w) => s + (w.upvotes ?? 0), 0)
  const totalReviews = allWorks.reduce((s, w) => s + ((w as any).review_count ?? 0), 0)

  const genreSet = new Set<string>()
  allWorks.forEach(w => (w.genres ?? []).forEach((g: string) => genreSet.add(g)))
  const creatorGenres = Array.from(genreSet).slice(0, 8)

  // Banner = covers of their most-loved works. No works, no banner.
  const bannerCovers = allWorks
    .map(w => w.cover_url)
    .filter((u): u is string => !!u)
    .slice(0, 3)

  const links: CreatorLink[] = []
  if (profile.patreon_url)     links.push({ kind: 'patreon',     label: 'Support on Patreon', sub: profile.patreon_url.replace(/^https?:\/\//, ''),     href: profile.patreon_url })
  if (profile.kickstarter_url) links.push({ kind: 'kickstarter', label: 'Back their book',    sub: profile.kickstarter_url.replace(/^https?:\/\//, ''), href: profile.kickstarter_url })
  if (profile.website)         links.push({ kind: 'site',        label: 'Website',            sub: profile.website.replace(/^https?:\/\//, ''),         href: profile.website })

  const kicker = creatorGenres.length > 0
    ? `Creator · ${creatorGenres.slice(0, 2).join(' · ')}`
    : 'Creator'

  const tabs: ShrineTab[] = [
    {
      id: 'works',
      label: 'Works',
      content: (
        <CreatorWorksSection
          works={allWorks}
          isOwner={isOwner}
          username={profile.username}
          newRecHref={ownerRoutes.newRec}
        />
      ),
    },
    {
      id: 'about',
      label: 'About',
      content: (
        <CreatorAboutSection
          genres={creatorGenres}
          links={links}
          isOwner={isOwner}
          username={profile.username}
        />
      ),
    },
  ]

  return (
    <div className="sh-page">
      <div className="sh-root" data-tier={showGold ? 'gold' : 'default'}>
        <ProfileHero
          variant="creator"
          profile={{ ...profile, current_streak: 0 }}
          initials={initials}
          isGhost={false}
          isOwner={isOwner}
          isPro={isPro}
          isAdmin={isAdmin}
          showGold={showGold}
          canFollow={!isOwner && !!viewer}
          isFollowing={isFollowing}
          isLoggedIn={!!viewer}
          editHref={ownerRoutes.settings}
          bannerCovers={bannerCovers}
          kicker={kicker}
          cta={profile.comic_url ? { label: 'Read their comic', href: profile.comic_url } : null}
          statItems={[
            { label: 'Followers', value: compact(followersCount ?? 0) },
            { label: 'Works',     value: String(totalWorks) },
            { label: 'Upvotes',   value: compact(totalUpvotes) },
            { label: 'Reviews',   value: compact(totalReviews) },
          ]}
        />
        <ShrineTabs tabs={tabs} initial={tabParam === 'about' ? 'about' : 'works'} />
      </div>
    </div>
  )
}