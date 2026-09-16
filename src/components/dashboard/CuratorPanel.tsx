import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  ThumbsUp, Eye, Bookmark, MessageSquare, ChevronRight,
  Plus, FileEdit, AlertCircle, ExternalLink, Target, Zap,
  BarChart2, Download, Trophy,
} from 'lucide-react'
import { formatNumber } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { FREE_LIMITS } from '@/lib/utils/constants'
import { ProUpsellCard } from './ProUpsellCard'

type Submission = {
  id:               string
  title:            string
  cover_url:        string | null
  is_approved:      boolean
  is_draft:         boolean
  rejection_reason: string | null
  upvotes:          number
  save_count:       number
  view_count:       number
  review_count:     number
}

interface Props {
  submissions:       Submission[]
  monthlyCount:      number
  isPro:             boolean
  dashboardPrefix:   string // '' for free, '/pro' for pro — matches existing route split
  // Pro-only — omit/leave undefined entirely for free curators
  leaderboardRank?:  number | null
  viewsThisMonth?:   number
}

function proxyCover(url: string | null) {
  if (!url) return ''
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

export function CuratorPanel({
  submissions, monthlyCount, isPro, dashboardPrefix, leaderboardRank, viewsThisMonth,
}: Props) {
  const drafts    = submissions.filter(s => s.is_draft)
  const rejected  = submissions.filter(s => !s.is_draft && !s.is_approved && s.rejection_reason)
  const live      = submissions.filter(s => !s.is_draft && s.is_approved)
  const pending   = submissions.filter(s => !s.is_draft && !s.is_approved && !s.rejection_reason)

  const recPct = isPro ? 0 : Math.min((monthlyCount / FREE_LIMITS.recommendations_per_month) * 100, 100)

  const proTools = isPro ? [
    { href: `${dashboardPrefix}/reader/dashboard/analytics`,   icon: BarChart2, label: 'Analytics',     desc: 'See your rec performance' },
    { href: `${dashboardPrefix}/reader/dashboard/analytics`,   icon: Eye,       label: 'Profile Views', desc: `${viewsThisMonth ?? 0} this month` },
    { href: `${dashboardPrefix}/reader/dashboard/export`,      icon: Download,  label: 'Export',        desc: 'Download as CSV or PDF' },
    { href: `${dashboardPrefix}/reader/dashboard/leaderboard`, icon: Trophy,    label: 'Leaderboard',   desc: leaderboardRank ? `Rank #${leaderboardRank}` : 'See your rank' },
  ] : []

  return (
    <div className="space-y-6">
      {/* Pro tools — only for Pro curators */}
      {isPro && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {proTools.map(({ href, icon: Icon, label, desc }) => (
            <Link key={label} href={href}
              className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 transition-colors"
            >
              <Icon size={14} className="text-amber-500 mb-1.5" />
              <p className="text-xs font-bold leading-tight">{label}</p>
              <p className="text-[10px] text-muted-foreground truncate">{desc}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Limit tracker — only meaningful for free curators */}
      {!isPro && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={13} className="text-muted-foreground" />
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Submission Limit</span>
            </div>
            <Link href="/pricing">
              <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1 border-amber-500/30 text-amber-600 hover:bg-amber-500/10">
                <Zap size={9} />Upgrade
              </Button>
            </Link>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Recs this month</span>
              <span className={cn('text-[10px] font-semibold tabular-nums', recPct >= 80 ? 'text-amber-500' : 'text-muted-foreground')}>
                {monthlyCount} / {FREE_LIMITS.recommendations_per_month}
              </span>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-700', recPct >= 90 ? 'bg-amber-500' : 'bg-violet-500')}
                style={{ width: `${recPct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Rejected — surfaced first since these need action */}
      {rejected.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle size={13} className="text-red-500" />Needs Attention
          </h2>
          {rejected.map(s => (
            <div key={s.id} className="p-3 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-1">
              <p className="text-xs font-black">{s.title}</p>
              <p className="text-[11px] text-muted-foreground">{s.rejection_reason}</p>
            </div>
          ))}
        </div>
      )}

      {/* Drafts */}
      {drafts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <FileEdit size={13} />Drafts
          </h2>
          {drafts.map(s => (
            <Link key={s.id} href={`${dashboardPrefix}/reader/dashboard/recommendations/new?draft=${s.id}`}
              className="flex items-center gap-3 p-3 rounded-2xl border border-dashed border-border bg-card/50 hover:border-primary/30 transition-colors"
            >
              <span className="text-xs font-black flex-1 truncate">{s.title || 'Untitled draft'}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">Continue editing</span>
              <ChevronRight size={13} className="text-muted-foreground/40 shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {/* Pending review */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pending Review</h2>
          {pending.map(s => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-2xl border border-amber-500/20 bg-amber-500/5">
              <span className="text-xs font-black flex-1 truncate">{s.title}</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 shrink-0">⏳ Pending</span>
            </div>
          ))}
        </div>
      )}

      {/* Live submissions — performance */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Your Recommendations</h2>
          <Link href={`${dashboardPrefix}/reader/dashboard/recommendations/new`}>
            <Button size="sm" className="h-7 text-xs gap-1"><Plus size={12} />New</Button>
          </Link>
        </div>
        {live.length > 0 ? (
          <div className="space-y-2">
            {live.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card">
                <div className="w-9 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                  {s.cover_url && <img src={proxyCover(s.cover_url)} alt={s.title} className="w-full h-full object-cover" />}
                </div>
                <p className="text-xs font-black flex-1 truncate">{s.title}</p>
                <div className="hidden sm:flex gap-3 text-[10px] text-muted-foreground shrink-0">
                  <span className="flex items-center gap-1"><ThumbsUp size={9} className="text-emerald-500" />{s.upvotes}</span>
                  <span className="flex items-center gap-1"><Eye size={9} className="text-blue-500" />{formatNumber(s.view_count)}</span>
                  <span className="flex items-center gap-1"><Bookmark size={9} className="text-violet-500" />{s.save_count}</span>
                  <span className="flex items-center gap-1"><MessageSquare size={9} className="text-amber-500" />{s.review_count}</span>
                </div>
                <Link href={`/comic/${s.id}`}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0"><ExternalLink size={11} className="text-muted-foreground" /></Button>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground p-4 rounded-2xl border border-dashed border-border text-center">
            No approved recommendations yet.
          </p>
        )}
      </div>

      {/* Pro upsell — free curators only */}
      {!isPro && (
        <ProUpsellCard
          title="Unlock Pro Curator"
          features={['Unlimited follows', 'Performance analytics', 'CSV/PDF export', 'Leaderboard rank', 'Priority review queue']}
          ctaLabel="Upgrade to Pro Curator"
        />
      )}
    </div>
  )
}