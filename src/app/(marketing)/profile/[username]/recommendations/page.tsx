import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import type { Recommendation } from '@/types/database.types'
import type { Metadata } from 'next'
import { ProAvatar } from '@/components/pro/ProAvatar'
import { ProBadge } from '@/components/pro/ProBadge'
import { VerifiedBadge } from '@/components/pro/VerifiedBadge'
import { FilterBar } from '@/components/recommendations/FilterBar'
import { ComicGridClient } from '@/components/recommendations/ComicGridClient'

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
    .select('id, username, display_name, avatar_url, is_pro, pro_expires_at, role, verified_recommender')
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

  // ── Params for ComicGridClient load-more calls ──
  const clientParams: Record<string, string> = { sort }
  if (sp.q)      clientParams.q      = sp.q
  if (sp.type)   clientParams.type   = sp.type
  if (sp.genre)  clientParams.genre  = sp.genre
  if (sp.status) clientParams.status = sp.status

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

      {/* ── Back link ── */}
      <Link
        href={`/profile/${profile.username}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group w-fit"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to @{profile.username}
      </Link>

      {/* ── Profile identity card ── */}
      <div className="flex items-center gap-4 p-5 rounded-2xl border border-border bg-card">
        <ProAvatar
          src={profile.avatar_url}
          fallback={initials}
          size="md"
          isPro={isPro}
          isAdmin={isAdmin}
          className="shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-black truncate">{displayName}</h1>
            <ProBadge role={profile.role} isPro={isPro} />
            {profile.verified_recommender && <VerifiedBadge />}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            @{profile.username}
          </p>
        </div>
        <div className="shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/5 border border-primary/15">
            <BookOpen size={13} className="text-primary" />
            <span className="text-xs font-bold text-primary">
              {totalCount ?? 0} comic{(totalCount ?? 0) !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* ── Filter bar — exact same component browse uses ── */}
      <FilterBar adult={false} />

      {/* ── Grid — exact same component browse uses ── */}
      <ComicGridClient
        initialItems={items}
        initialTotal={filteredCount ?? 0}
        searchParams={clientParams}
        apiPath={`/api/profile/${profile.username}/recommendations`}
      />

    </div>
  )
}