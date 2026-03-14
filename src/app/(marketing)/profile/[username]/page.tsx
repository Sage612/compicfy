import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  CalendarDays, BookOpen, Star, ThumbsUp,
  Shield, Globe, BookMarked, Lock,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import type { Profile, Recommendation } from '@/types/database.types'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ username: string }>
}

type RecPreview = Pick<Recommendation, 'id' | 'title' | 'cover_url' | 'upvotes' | 'type' | 'genres' | 'content_rating'>

interface ReadingList {
  id: string
  name: string
  description: string | null
  is_public: boolean
  item_count: number
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return { title: `@${username}` }
}

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-violet-500/10 text-violet-500 border-violet-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
}

const ROLE_STYLES: Record<string, { badge: string; icon: boolean }> = {
  admin:     { badge: 'bg-primary/10 text-primary border-primary/20',      icon: true  },
  moderator: { badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20',   icon: false },
  user:      { badge: 'bg-muted text-muted-foreground border-border',       icon: false },
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()

  // Get viewer identity
  const { data: { user: viewer } } = await supabase.auth.getUser()

  let viewerRole: string | null = null
  if (viewer) {
    const { data: vp } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', viewer.id)
      .single()
    viewerRole = (vp as any)?.role ?? 'user'
  }

  // Get profile being viewed
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .single()

  if (!profileData) notFound()

  const profile = profileData as Profile

  const isOwner = viewer?.id === profile.id
  const isPrivileged = isOwner || viewerRole === 'admin' || viewerRole === 'moderator'

  // Build recommendation query:
  // - Privileged viewers (owner / admin / mod) see everything including adult
  // - Everyone else sees only all_ages and teen
  let recQuery = supabase
    .from('recommendations')
    .select('id, title, cover_url, upvotes, type, genres, content_rating')
    .eq('user_id', profile.id)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(6)

  if (!isPrivileged) {
    recQuery = recQuery.not('content_rating', 'in', '("adult","mature")')
  }

  const { data: recData } = await recQuery
  const recommendations = (recData ?? []) as RecPreview[]

  // Public reading lists
  const { data: listsData } = await supabase
    .from('reading_lists')
    .select('id, name, description, is_public')
    .eq('user_id', profile.id)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(6)

  // Get item counts for each list
  const lists: ReadingList[] = await Promise.all(
    (listsData ?? []).map(async (list: any) => {
      const { count } = await supabase
        .from('reading_list_items')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', list.id)
      return { ...list, item_count: count ?? 0 }
    })
  )

  const initials = (profile.display_name || profile.username).slice(0, 2).toUpperCase()
  const roleStyle = ROLE_STYLES[profile.role] ?? ROLE_STYLES.user
  const hasAdultRecs = recommendations.some(
    r => r.content_rating === 'adult' || r.content_rating === 'mature'
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">

      {/* ── Profile card ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="h-24 bg-gradient-to-br from-primary/20 via-violet-500/10 to-transparent" />
        <div className="px-6 pb-6 -mt-12 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <Avatar className="h-20 w-20 border-4 border-card ring-2 ring-border shadow-lg shrink-0">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-xl font-black bg-gradient-to-br from-primary to-violet-500 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 space-y-1.5 sm:pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black truncate">
                  {profile.display_name || profile.username}
                </h1>
                {profile.role !== 'user' && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${roleStyle.badge}`}>
                    {roleStyle.icon && <Shield size={10} />}
                    {profile.role}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
          </div>

          {profile.bio && (
            <p className="text-sm leading-relaxed text-muted-foreground max-w-lg">{profile.bio}</p>
          )}

          <div className="flex flex-wrap gap-4">
            {[
              { icon: BookOpen, value: profile.total_recommendations, label: 'recommendations' },
              { icon: Star,     value: profile.total_reviews,          label: 'reviews'         },
              { icon: ThumbsUp, value: profile.total_votes_received,   label: 'votes received'  },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Icon size={13} className="text-primary/60" />
                <span><strong className="text-foreground font-black">{value ?? 0}</strong> {label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays size={13} className="text-primary/60" />
              <span>Joined {formatDate(profile.member_since)}</span>
            </div>
          </div>

          {profile.favorite_genres?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.favorite_genres.map((genre: string) => (
                <Badge key={genre} variant="secondary" className="text-xs rounded-full">
                  {genre}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Recommendations ── */}
      {recommendations.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black">Recent Recommendations</h2>
            <div className="h-0.5 flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
            {isPrivileged && hasAdultRecs && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 shrink-0">
                Includes 18+
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {recommendations.map((rec) => {
              const typeStyle = TYPE_COLORS[rec.type] ?? 'bg-muted text-muted-foreground border-border'
              const isAdult = rec.content_rating === 'adult' || rec.content_rating === 'mature'
              return (
                <Link
                  key={rec.id}
                  href={`/comic/${rec.id}`}
                  className="group block rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all duration-200"
                >
                  <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                    {rec.cover_url ? (
                      <img
                        src={rec.cover_url}
                        alt={rec.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={28} className="text-muted-foreground opacity-30" />
                      </div>
                    )}
                    {rec.upvotes > 0 && (
                      <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold">
                        ↑ {rec.upvotes}
                      </div>
                    )}
                    {isAdult && isPrivileged && (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-destructive/80 text-white text-[9px] font-black">
                        18+
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-1.5">
                    <p className="text-xs font-black truncate">{rec.title}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${typeStyle}`}>
                      {rec.type}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      ) : (
        <div className="text-center py-14 rounded-2xl border border-dashed border-border space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <BookOpen size={22} className="text-muted-foreground opacity-40" />
          </div>
          <div>
            <p className="font-black text-sm">No recommendations yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              @{profile.username} hasn't shared any recommendations yet.
            </p>
          </div>
        </div>
      )}

      {/* ── Public Reading Lists ── */}
      {lists.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black">Reading Lists</h2>
            <div className="h-0.5 flex-1 bg-gradient-to-r from-teal-500/40 to-transparent" />
            <span className="text-xs text-muted-foreground shrink-0">{lists.length} public</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {lists.map((list) => (
              <Link
                key={list.id}
                href={`/lists/${list.id}`}
                className="group relative p-4 rounded-2xl border border-border bg-card hover:border-teal-500/40 hover:shadow-md transition-all duration-200 space-y-3"
              >
                {/* List header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500/20 to-cyan-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                      <BookMarked size={14} className="text-teal-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate group-hover:text-teal-600 transition-colors">
                        {list.name}
                      </p>
                      {list.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {list.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Globe size={12} className="text-emerald-500 shrink-0 mt-1" />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <BookOpen size={11} className="text-teal-500/60" />
                    <span>
                      <strong className="text-foreground font-black">{list.item_count}</strong>{' '}
                      comic{list.item_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-teal-600 group-hover:translate-x-0.5 transition-transform">
                    View →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}