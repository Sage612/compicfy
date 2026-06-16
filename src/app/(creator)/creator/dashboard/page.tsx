import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  BookOpen, Users, ThumbsUp, Eye, Bookmark,
  ArrowRight, Plus, Link as LinkIcon, Settings,
  Star, MessageSquare, TrendingUp, ExternalLink,
  Palette, ChevronRight,
} from 'lucide-react'
import { formatDate, formatNumber, timeAgo } from '@/lib/utils/format'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Creator Dashboard' }

export default async function CreatorDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  if (!profileData) redirect('/login')
  const profile = profileData as any

  const [
    { data: works, count: worksCount },
    { count: followersCount },
    { data: recentReviews },
  ] = await Promise.all([
    supabase
      .from('recommendations')
      .select('id, title, cover_url, type, upvotes, save_count, view_count, review_count, score, created_at, is_approved', { count: 'exact' })
      .eq('user_id', user.id)
      .order('score', { ascending: false })
      .limit(5),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
    supabase
      .from('reviews')
      .select('id, content, rating, created_at, recommendation_id, profiles!reviews_user_id_fkey(username, avatar_url), recommendations(title)')
      .in('recommendation_id',
        await supabase.from('recommendations').select('id').eq('user_id', user.id)
          .then(r => (r.data ?? []).map((x: any) => x.id))
      )
      .order('created_at', { ascending: false })
      .limit(4),
  ])

  const totalUpvotes  = (works ?? []).reduce((sum: number, w: any) => sum + (w.upvotes ?? 0), 0)
  const totalViews    = (works ?? []).reduce((sum: number, w: any) => sum + (w.view_count ?? 0), 0)
  const totalSaves    = (works ?? []).reduce((sum: number, w: any) => sum + (w.save_count ?? 0), 0)
  const initials      = (profile.display_name || profile.username).slice(0, 2).toUpperCase()
  const hasLinks      = profile.patreon_url || profile.kickstarter_url || profile.comic_url

  const stats = [
    { label: 'Works Submitted', value: worksCount ?? 0,   icon: BookOpen,      bg: 'bg-teal-500/10',   text: 'text-teal-500',   href: '/creator/dashboard/works'    },
    { label: 'Followers',       value: followersCount ?? 0, icon: Users,       bg: 'bg-violet-500/10', text: 'text-violet-500', href: '/creator/dashboard/audience' },
    { label: 'Total Upvotes',   value: totalUpvotes,       icon: ThumbsUp,     bg: 'bg-emerald-500/10',text: 'text-emerald-500',href: '/creator/dashboard/works'    },
    { label: 'Total Views',     value: totalViews,         icon: Eye,          bg: 'bg-blue-500/10',   text: 'text-blue-500',   href: '/creator/dashboard/works'    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* Creator welcome banner — teal/cyan theme */}
      <div className="relative overflow-hidden rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-transparent p-6 md:p-8">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-cyan-500/10 blur-xl pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-full bg-teal-500/30 blur-sm" />
            <Avatar className="relative h-16 w-16 border-2 border-teal-500/40">
              <AvatarImage src={profile.avatar_url ? `/api/image-proxy?url=${encodeURIComponent(profile.avatar_url)}` : undefined} />
              <AvatarFallback className="text-xl bg-teal-500 text-white font-bold">{initials}</AvatarFallback>
            </Avatar>
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black truncate">{profile.display_name || profile.username}</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/25">
                <Palette size={9} />
                Creator
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Creating since {formatDate(profile.member_since)}
            </p>
            {profile.bio && (
              <p className="text-xs text-muted-foreground line-clamp-1">{profile.bio}</p>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            <Link href="/creator/dashboard/settings">
              <Button variant="outline" size="sm" className="gap-1.5 border-teal-500/30 hover:border-teal-500/60">
                <Settings size={13} />
                Settings
              </Button>
            </Link>
            <Link href="/creator/dashboard/works/new">
              <Button size="sm" className="gap-1.5 bg-teal-500 hover:bg-teal-600 border-0 text-white">
                <Plus size={13} />
                Add Work
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Support links alert — prominent if not set */}
      {!hasLinks && (
        <div className="flex items-start gap-4 p-4 rounded-2xl border border-teal-500/30 bg-teal-500/5">
          <div className="w-9 h-9 rounded-xl bg-teal-500/15 flex items-center justify-center shrink-0">
            <LinkIcon size={16} className="text-teal-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-teal-700 dark:text-teal-400">Add your creator links</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Let readers support you directly. Add your Patreon, Kickstarter, or comic URL.
            </p>
          </div>
          <Link href="/creator/dashboard/links">
            <Button size="sm" variant="outline" className="shrink-0 border-teal-500/30 text-teal-600 hover:bg-teal-500/10 gap-1.5">
              Add Links <ArrowRight size={12} />
            </Button>
          </Link>
        </div>
      )}

      {/* Stats */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map(({ label, value, icon: Icon, bg, text, href }) => (
            <Link
              key={label}
              href={href}
              className="group relative overflow-hidden p-4 rounded-2xl border border-border bg-card hover:border-teal-500/40 hover:shadow-lg transition-all duration-200"
            >
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon size={18} className={text} />
              </div>
              <p className="text-2xl font-black tabular-nums">{formatNumber(value)}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
              <ArrowRight size={12} className="absolute bottom-4 right-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </div>
      </div>

      {/* My Works */}
      {works && works.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Your Works</h2>
            <Link href="/creator/dashboard/works" className="text-xs text-teal-500 hover:underline flex items-center gap-1">
              Manage all <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {(works as any[]).map((work: any) => (
              <div key={work.id} className="group flex items-center gap-3 p-3 rounded-2xl border border-border bg-card hover:border-teal-500/30 transition-colors">
                <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                  {work.cover_url
                    ? <img src={`/api/image-proxy?url=${encodeURIComponent(work.cover_url)}`} alt={work.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><BookOpen size={12} className="text-muted-foreground opacity-40" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black line-clamp-1">{work.title}</p>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold capitalize ${
                      work.is_approved ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      {work.is_approved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 text-[10px] text-muted-foreground shrink-0">
                  <span className="flex items-center gap-1"><ThumbsUp size={9} className="text-emerald-500" />{work.upvotes}</span>
                  <span className="flex items-center gap-1"><Eye size={9} className="text-blue-500" />{formatNumber(work.view_count)}</span>
                  <span className="flex items-center gap-1"><Bookmark size={9} className="text-violet-500" />{work.save_count}</span>
                </div>
                <Link href={`/comic/${work.id}`}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                    <ExternalLink size={12} className="text-muted-foreground" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {works && works.length === 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-teal-500/30 bg-teal-500/5 p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/15 flex items-center justify-center mx-auto">
            <BookOpen size={24} className="text-teal-500" />
          </div>
          <div>
            <p className="font-black text-sm">Share your first work</p>
            <p className="text-xs text-muted-foreground mt-1">
              Submit a comic you created and let the community discover it.
            </p>
          </div>
          <Link href="/creator/dashboard/works/new">
            <Button size="sm" className="gap-1.5 bg-teal-500 hover:bg-teal-600 border-0 text-white">
              <Plus size={13} />Submit Your Work
            </Button>
          </Link>
        </div>
      )}

      {/* Recent reviews on your works */}
      {recentReviews && recentReviews.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Reviews on Your Works</h2>
          <div className="space-y-2">
            {(recentReviews as any[]).map((review: any) => (
              <div key={review.id} className="p-3 rounded-2xl border border-border bg-card space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={review.profiles?.avatar_url ? `/api/image-proxy?url=${encodeURIComponent(review.profiles.avatar_url)}` : undefined} />
                      <AvatarFallback className="text-[9px] bg-muted">
                        {review.profiles?.username?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-semibold truncate">@{review.profiles?.username}</span>
                    {review.rating && (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Star key={i} size={9} className="fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(review.created_at)}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{review.content}</p>
                <p className="text-[10px] text-teal-500 font-semibold">on "{review.recommendations?.title}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Creator links */}
      {hasLinks && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Your Support Links</h2>
            <Link href="/creator/dashboard/links" className="text-xs text-teal-500 hover:underline flex items-center gap-1">
              Edit <ChevronRight size={12} />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.comic_url && (
              <a href={profile.comic_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-teal-500/30 bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-semibold hover:bg-teal-500/20 transition-colors"
              >
                <BookOpen size={12} />Read My Comic
              </a>
            )}
            {profile.patreon_url && (
              <a href={profile.patreon_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-600 text-xs font-semibold hover:bg-orange-500/20 transition-colors"
              >
                🎨 Patreon
              </a>
            )}
            {profile.kickstarter_url && (
              <a href={profile.kickstarter_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-green-500/30 bg-green-500/10 text-green-600 text-xs font-semibold hover:bg-green-500/20 transition-colors"
              >
                🚀 Kickstarter
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


