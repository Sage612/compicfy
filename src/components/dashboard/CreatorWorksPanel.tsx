import Link from 'next/link'
import {
  BookOpen, Users, ThumbsUp, Eye, Bookmark, ExternalLink,
  Star, ChevronRight, Target, BarChart2, Flame,
} from 'lucide-react'
import { formatNumber, timeAgo } from '@/lib/utils/format'
import { FREE_LIMITS } from '@/lib/utils/constants'
import { ProUpsellCard } from './ProUpsellCard'

type Work = {
  id: string
  title: string
  cover_url: string | null
  upvotes: number
  view_count: number
  save_count: number
  review_count?: number
  is_approved: boolean
}

type Review = {
  id: string
  content: string
  rating: number | null
  created_at: string
  profiles?: { username?: string | null; avatar_url?: string | null } | null
  recommendations?: { title?: string } | null
}

interface Props {
  works:              Work[]
  worksCount:         number
  followersCount:     number
  followingCount:     number
  totalUpvotes:       number
  totalViews:         number
  totalSaves:         number
  isPro:              boolean
  dashboardPrefix:    string // '' or '/pro'
  hasLinks:           boolean
  links: { comic_url?: string | null; patreon_url?: string | null; kickstarter_url?: string | null }
  recentReviews?:     Review[]
  avgRating?:         number | null
  // Pro-only extras
  last30Views?:       number
  last30Saves?:       number
  last30Upvotes?:     number
  profileViewsMonth?: number
  profileViewsTotal?: number
  newFollowersMonth?: number
}

function proxyCover(url: string | null) {
  if (!url) return ''
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border p-4 space-y-2">
      <div className="flex items-center gap-1.5 text-muted-foreground/60">
        <Icon size={14} />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-medium tabular-nums leading-none">{value}</p>
    </div>
  )
}

export function CreatorWorksPanel({
  works, worksCount, followersCount, followingCount, totalUpvotes, totalViews, totalSaves,
  isPro, dashboardPrefix, hasLinks, links, recentReviews = [], avgRating,
  last30Views, last30Saves, last30Upvotes, profileViewsMonth, profileViewsTotal, newFollowersMonth,
}: Props) {
  const workPct   = isPro ? 0 : Math.min((worksCount / FREE_LIMITS.recommendations_per_month) * 100, 100)
  const followPct = isPro ? 0 : Math.min((followingCount / FREE_LIMITS.follows) * 100, 100)

  const followerMilestones = [10, 50, 100, 500, 1000, 5000]
  const nextFollowerMilestone = followerMilestones.find(m => m > followersCount) ?? 5000
  const followerMilestonePct = Math.min((followersCount / nextFollowerMilestone) * 100, 100)

  const topWork = [...works].sort((a, b) => (b.upvotes + b.save_count) - (a.upvotes + a.save_count))[0]

  return (
    <div className="space-y-6">
      {/* Limits (free) or quick nav (pro) */}
      {isPro ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Link href={`${dashboardPrefix}/creator/dashboard/analytics`} className="p-3 rounded-xl border border-border hover:border-foreground/20 transition-colors">
            <BarChart2 size={14} className="text-muted-foreground/60 mb-1.5" />
            <p className="text-xs font-medium">Analytics</p>
          </Link>
          <Link href={`${dashboardPrefix}/creator/dashboard/audience`} className="p-3 rounded-xl border border-border hover:border-foreground/20 transition-colors">
            <Users size={14} className="text-muted-foreground/60 mb-1.5" />
            <p className="text-xs font-medium">Audience</p>
          </Link>
          <Link href={`${dashboardPrefix}/creator/dashboard/links`} className="p-3 rounded-xl border border-border hover:border-foreground/20 transition-colors">
            <ExternalLink size={14} className="text-muted-foreground/60 mb-1.5" />
            <p className="text-xs font-medium">Links</p>
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground/60">
              <Target size={13} />
              <span className="text-xs">Free plan limits</span>
            </div>
            <Link href="/pricing" className="text-xs font-medium hover:underline">Upgrade</Link>
          </div>
          {[
            { label: 'Works submitted', current: worksCount,    limit: FREE_LIMITS.recommendations_per_month, pct: workPct },
            { label: 'Following',       current: followingCount, limit: FREE_LIMITS.follows,                  pct: followPct },
          ].map(({ label, current, limit, pct }) => (
            <div key={label} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{label}</span>
                <span className="tabular-nums">{current} / {limit}</span>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-foreground/70" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Link href={`${dashboardPrefix}/creator/dashboard/works`}>
          <StatCard icon={BookOpen} label="Works" value={String(worksCount)} />
        </Link>
        <Link href={`${dashboardPrefix}/creator/dashboard/audience`}>
          <StatCard icon={Users} label="Followers" value={formatNumber(followersCount)} />
        </Link>
        <StatCard icon={ThumbsUp} label="Total upvotes" value={formatNumber(totalUpvotes)} />
        <StatCard icon={Eye} label={isPro ? 'Views (30d)' : 'Views'} value={formatNumber(isPro ? (last30Views ?? 0) : totalViews)} />
      </div>

      {/* Pro: 30-day pulse */}
      {isPro && (
        <div>
          <h2 className="font-dashboard-serif text-xl mb-3 flex items-center gap-2">
            <Flame size={16} className="text-muted-foreground/60" />30-day pulse
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={Eye} label="Views" value={formatNumber(last30Views ?? 0)} />
            <StatCard icon={Bookmark} label="Saves" value={formatNumber(last30Saves ?? 0)} />
            <StatCard icon={ThumbsUp} label="Upvotes" value={formatNumber(last30Upvotes ?? 0)} />
          </div>
        </div>
      )}

      {/* Pro: audience snapshot */}
      {isPro && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border p-4 space-y-1">
            <p className="text-xs text-muted-foreground/60">Audience</p>
            <p className="text-2xl font-medium tabular-nums">{formatNumber(followersCount)}</p>
            <p className="text-xs text-muted-foreground">
              {(newFollowersMonth ?? 0) > 0 ? `+${newFollowersMonth} this month` : 'Total followers'}
            </p>
          </div>
          <div className="rounded-2xl border border-border p-4 space-y-1">
            <p className="text-xs text-muted-foreground/60">Profile views</p>
            <p className="text-2xl font-medium tabular-nums">{formatNumber(profileViewsMonth ?? 0)}</p>
            <p className="text-xs text-muted-foreground">{formatNumber(profileViewsTotal ?? 0)} total</p>
          </div>
        </div>
      )}

      {/* Engagement rate (pro) */}
      {isPro && (
        <div className="rounded-2xl border border-border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground/60">Engagement rate</span>
            <span className="text-lg font-medium tabular-nums">{totalViews > 0 ? ((totalSaves / totalViews) * 100).toFixed(1) : '0.0'}%</span>
          </div>
          <p className="text-xs text-muted-foreground">Save rate across all works · {formatNumber(totalViews)} views, {formatNumber(totalSaves)} saves</p>
        </div>
      )}

      {/* Follower milestone */}
      <div className="rounded-2xl border border-border p-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Follower milestone</span>
          <span className="tabular-nums text-muted-foreground">{formatNumber(followersCount)} / {formatNumber(nextFollowerMilestone)}</span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-foreground/70 transition-all duration-700" style={{ width: `${followerMilestonePct}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">{nextFollowerMilestone - followersCount} more to reach {formatNumber(nextFollowerMilestone)}</p>
      </div>

      {/* Top performing work */}
      {topWork && (
        <div>
          <h2 className="font-dashboard-serif text-xl mb-3">Top performing work</h2>
          <Link href={`/comic/${topWork.id}`} className="flex items-center gap-3 p-3 rounded-2xl border border-border hover:border-foreground/20 transition-colors">
            <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
              {topWork.cover_url && <img src={proxyCover(topWork.cover_url)} alt={topWork.title} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{topWork.title}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><ThumbsUp size={10} />{formatNumber(topWork.upvotes)}</span>
                <span className="flex items-center gap-1"><Eye size={10} />{formatNumber(topWork.view_count)}</span>
                <span className="flex items-center gap-1"><Bookmark size={10} />{formatNumber(topWork.save_count)}</span>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Review sentiment (pro) */}
      {isPro && avgRating != null && (
        <div className="rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-dashboard-serif text-xl">Review sentiment</h2>
            <span className="text-sm tabular-nums flex items-center gap-1"><Star size={12} />{avgRating.toFixed(1)} / 5</span>
          </div>
          <p className="text-xs text-muted-foreground">{recentReviews.length} recent review{recentReviews.length === 1 ? '' : 's'} shown below</p>
        </div>
      )}

      {/* Works list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-dashboard-serif text-xl">Your works</h2>
          <Link href={`${dashboardPrefix}/creator/dashboard/works`} className="text-xs font-medium hover:underline flex items-center gap-1">
            Manage all <ChevronRight size={11} />
          </Link>
        </div>
        {works.length > 0 ? (
          <div className="space-y-2">
            {works.map(work => (
              <div key={work.id} className="flex items-center gap-3 p-3 rounded-2xl border border-border">
                <div className="w-9 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                  {work.cover_url && <img src={proxyCover(work.cover_url)} alt={work.title} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{work.title}</p>
                  <p className="text-xs text-muted-foreground">{work.is_approved ? 'Approved' : 'Pending'}</p>
                </div>
                <div className="hidden sm:flex gap-3 text-xs text-muted-foreground shrink-0">
                  <span className="flex items-center gap-1"><ThumbsUp size={11} />{work.upvotes}</span>
                  <span className="flex items-center gap-1"><Eye size={11} />{formatNumber(work.view_count)}</span>
                  <span className="flex items-center gap-1"><Bookmark size={11} />{work.save_count}</span>
                </div>
                <Link href={`/comic/${work.id}`} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                  <ExternalLink size={13} />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground p-4 rounded-2xl border border-dashed border-border text-center">
            Submit a comic you created and let the community discover it.
          </p>
        )}
      </div>

      {/* Recent reviews */}
      {recentReviews.length > 0 && (
        <div>
          <h2 className="font-dashboard-serif text-xl mb-3">Recent reviews</h2>
          <div className="space-y-2">
            {recentReviews.map(review => (
              <div key={review.id} className="p-3 rounded-2xl border border-border space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">@{review.profiles?.username ?? 'someone'}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(review.created_at)}</span>
                </div>
                {review.rating && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={10} className={i < review.rating! ? 'fill-foreground text-foreground' : 'text-muted-foreground/20'} />
                    ))}
                  </div>
                )}
                <p className="text-sm text-muted-foreground line-clamp-2">{review.content}</p>
                {review.recommendations?.title && (
                  <p className="text-xs text-muted-foreground">on "{review.recommendations.title}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Links */}
      {hasLinks && (
        <div>
          <h2 className="font-dashboard-serif text-xl mb-3">Your links</h2>
          <div className="flex flex-wrap gap-2">
            {links.comic_url && (
              <a href={links.comic_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm hover:border-foreground/30 transition-colors">
                <BookOpen size={12} />Read my comic
              </a>
            )}
            {links.patreon_url && (
              <a href={links.patreon_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm hover:border-foreground/30 transition-colors">
                Patreon
              </a>
            )}
            {links.kickstarter_url && (
              <a href={links.kickstarter_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm hover:border-foreground/30 transition-colors">
                Kickstarter
              </a>
            )}
          </div>
        </div>
      )}

      {/* Free: upsell / Pro: status footer */}
      {!isPro ? (
        <ProUpsellCard
          title="Unlock Pro Creator"
          features={['Deep analytics', 'Audience insights', 'Milestone tracking', 'Review sentiment', 'Priority review']}
          ctaLabel="Upgrade to Pro Creator"
        />
      ) : null}
    </div>
  )
}