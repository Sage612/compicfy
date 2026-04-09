import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { Button } from '@/components/ui/button'
import {
  BookOpen, ArrowLeft, Search, X, SlidersHorizontal,
} from 'lucide-react'
import type { Recommendation } from '@/types/database.types'
import type { Metadata } from 'next'
import { ProAvatar } from '@/components/pro/ProAvatar'
import { ProBadge } from '@/components/pro/ProBadge'
import { ProfileRecsClient } from '@/components/profile/ProfileRecsClient'

interface Props {
  params:       Promise<{ username: string }>
  searchParams: Promise<{ type?: string; genre?: string; status?: string; sort?: string; q?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return {
    title:       `@${username}'s Recommendations`,
    description: `All comic recommendations shared by @${username} on Compicfy`,
  }
}

const PAGE_SIZE = 24

export default async function ProfileRecsPage({ params, searchParams }: Props) {
  const { username }  = await params
  const sp            = await searchParams
  const supabase      = await createClient()

  // ── Fetch profile ──
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, is_pro, pro_expires_at, role, verified_recommender')
    .eq('username', username.toLowerCase())
    .single()

  if (!profileData) notFound()

  const profile = profileData as any

  const isPro   = !!(profile.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
  const isAdmin = profile.role === 'admin'

  // ── Build filtered query — always exclude adult/mature for public page ──
  let query = (supabase as any)
    .from('recommendations')
    .select('*', { count: 'exact' })
    .eq('user_id', profile.id)
    .eq('is_approved', true)
    .not('content_rating', 'in', '("adult","mature")')

  if (sp.type)   query = query.eq('type', sp.type)
  if (sp.genre)  query = query.contains('genres', [sp.genre])
  if (sp.status) query = query.eq('status', sp.status)
  if (sp.q)      query = query.ilike('title', `%${sp.q}%`)

  // Sort
  const sort = sp.sort ?? 'recent'
  if      (sort === 'recent')  query = query.order('created_at', { ascending: false })
  else if (sort === 'top')     query = query.order('score',      { ascending: false })
  else if (sort === 'votes')   query = query.order('upvotes',    { ascending: false })
  else                         query = query.order('created_at', { ascending: false })

  query = query.limit(PAGE_SIZE)

  const { data: recData, count: totalCount } = await query

  const recommendations = (recData ?? []) as Recommendation[]
  const total           = totalCount ?? 0
  const hasFilters      = !!(sp.type || sp.genre || sp.status || sp.q)

  // ── Total unfiltered count for the header badge ──
  const { count: allCount } = await (supabase as any)
    .from('recommendations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profile.id)
    .eq('is_approved', true)
    .not('content_rating', 'in', '("adult","mature")')

  const displayName = profile.display_name || profile.username
  const initials    = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

      {/* ── Back + profile header ── */}
      <div className="space-y-5">
        <Link
          href={`/profile/${profile.username}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to @{profile.username}
        </Link>

        {/* Profile identity strip */}
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
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              @{profile.username} ·{' '}
              <span className="font-semibold text-foreground">{allCount ?? 0}</span>{' '}
              recommendation{(allCount ?? 0) !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="shrink-0 hidden sm:block">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/5 border border-primary/15">
              <BookOpen size={13} className="text-primary" />
              <span className="text-xs font-bold text-primary">{allCount ?? 0} comics</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter + sort bar ── */}
      <ProfileRecsClient
        username={profile.username}
        userId={profile.id}
        initialItems={recommendations}
        initialTotal={total}
        currentFilters={{
          type:   sp.type   ?? '',
          genre:  sp.genre  ?? '',
          status: sp.status ?? '',
          sort:   sp.sort   ?? 'recent',
          q:      sp.q      ?? '',
        }}
      />
    </div>
  )
}