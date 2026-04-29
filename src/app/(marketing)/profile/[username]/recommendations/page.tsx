import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Layers } from 'lucide-react'
import type { Recommendation } from '@/types/database.types'
import type { Metadata } from 'next'
import { ProAvatar } from '@/components/pro/ProAvatar'
import { ProBadge } from '@/components/pro/ProBadge'
import { VerifiedBadge } from '@/components/pro/VerifiedBadge'
import { ProfileRecsClient } from '@/components/profile/ProfileRecsClient'

interface Props {
  params:       Promise<{ username: string }>
  searchParams: Promise<{
    q?:      string
    type?:   string
    genre?:  string
    status?: string
    sort?:   string
  }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return {
    title:       `@${username}'s Recommendations · Compicfy`,
    description: `All comic recommendations shared by @${username} on Compicfy`,
  }
}

const PAGE_SIZE = 24

export default async function ProfileRecsPage({ params, searchParams }: Props) {
  const { username } = await params
  const sp           = await searchParams
  const supabase     = await createClient()

  // ── Fetch profile ──
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, is_pro, pro_expires_at, role, verified_recommender')
    .eq('username', username.toLowerCase())
    .single()

  if (!profileData) notFound()

  const profile     = profileData as any
  const isPro       = !!(profile.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
  const isAdmin     = profile.role === 'admin'
  const displayName = profile.display_name || profile.username
  const initials    = displayName.slice(0, 2).toUpperCase()

  // ── Total unfiltered count ──
  const { count: totalCount } = await supabase
    .from('recommendations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profile.id)
    .eq('is_approved', true)
    .not('content_rating', 'in', '("adult","mature")')

  // ── Initial filtered data ──
  let query = (supabase as any)
    .from('recommendations')
    .select('*', { count: 'exact' })
    .eq('user_id', profile.id)
    .eq('is_approved', true)
    .not('content_rating', 'in', '("adult","mature")')

  if (sp.q)      query = query.or(`title.ilike.%${sp.q}%,author.ilike.%${sp.q}%,artist.ilike.%${sp.q}%`)
  if (sp.type)   query = query.eq('type', sp.type)
  if (sp.genre)  query = query.contains('genres', [sp.genre])
  if (sp.status) query = query.eq('status', sp.status)

  const sort = sp.sort ?? 'recent'
  if      (sort === 'top')      query = query.order('score',       { ascending: false })
  else if (sort === 'votes')    query = query.order('upvotes',     { ascending: false })
  else if (sort === 'trending') query = query.order('daily_votes', { ascending: false })
  else                          query = query.order('created_at',  { ascending: false })

  query = query.range(0, PAGE_SIZE - 1)

  const { data: recData, count: filteredCount } = await query
  const items = (recData ?? []) as Recommendation[]

  const showGold = isPro && !isAdmin

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

      {/* ── Back link ── */}
      <Link
        href={`/profile/${profile.username}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group w-fit"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to @{profile.username}
      </Link>

      {/* ── Profile hero card ── */}
      <div className={`relative rounded-2xl border overflow-hidden ${showGold ? 'border-amber-500/30' : 'border-border'} bg-card`}>
        <div className={`h-16 bg-gradient-to-br ${showGold ? 'from-amber-400/20 via-orange-500/10 to-transparent' : 'from-primary/20 via-violet-500/10 to-transparent'}`} />

        <div className="px-5 pb-5 -mt-8 flex items-end gap-4">
          <ProAvatar
            src={profile.avatar_url}
            fallback={initials}
            size="lg"
            isPro={isPro}
            isAdmin={isAdmin}
            className="border-4 border-card shadow-lg shrink-0"
          />

          <div className="flex-1 min-w-0 pb-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black truncate">{displayName}</h1>
              <ProBadge role={profile.role} isPro={isPro} />
              {profile.verified_recommender && <VerifiedBadge />}
            </div>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            {profile.bio && (
              <p className="text-xs text-muted-foreground line-clamp-1 max-w-md hidden sm:block">
                {profile.bio}
              </p>
            )}
          </div>

          {/* Comic count pill */}
          <div className="shrink-0 pb-1">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${showGold ? 'bg-amber-500/5 border-amber-500/20' : 'bg-primary/5 border-primary/15'}`}>
              <Layers size={14} className={showGold ? 'text-amber-500' : 'text-primary'} />
              <div className="text-right">
                <p className={`text-base font-black leading-none ${showGold ? 'text-amber-500' : 'text-primary'}`}>
                  {totalCount ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">comics</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section header ── */}
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-lg font-black">All Recommendations</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Everything @{profile.username} has shared
          </p>
        </div>
        <div className={`h-px flex-1 bg-gradient-to-r ${showGold ? 'from-amber-500/30' : 'from-primary/30'} to-transparent`} />
      </div>

      <ProfileRecsClient
        username={profile.username}
        userId={profile.id}
        initialItems={items}
        initialTotal={filteredCount ?? 0}
        currentFilters={{
          q:      sp.q      ?? '',
          type:   sp.type   ?? '',
          genre:  sp.genre  ?? '',
          status: sp.status ?? '',
          sort:   sort,
        }}
      />
    </div>
  )
}