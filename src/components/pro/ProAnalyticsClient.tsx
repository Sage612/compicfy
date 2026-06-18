'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BarChart2, Eye, Bookmark, ThumbsUp,
  TrendingUp, BookOpen, ArrowUpRight, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber, formatDate } from '@/lib/utils/format'

function proxyCover(url: string | null | undefined): string {
  if (!url) return "" // Returning an empty string satisfies the 'string' requirement
  if (url.startsWith('data:')) return url
  if (url.startsWith('/')) return url
  if (url.includes('/api/image-proxy')) return url

  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

interface Rec {
  id:           string
  title:        string
  cover_url:    string | null
  type:         string
  upvotes:      number
  downvotes:    number
  save_count:   number
  view_count:   number
  review_count: number
  score:        number
  created_at:   string
}

interface AnalyticsRow {
  recommendation_id: string
  date:              string
  views:             number
  saves:             number
  upvotes:           number
  downvotes:         number
}

interface Props {
  recommendations: Rec[]
  analytics:       AnalyticsRow[]
}

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-teal-500/10 text-teal-500 border-teal-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
}

// ── Quality Score ─────────────────────────────────────────────────
// Computed privately per recommendation — shown only to the owner
// Formula:
//   Save rate   (saves  / views) × 40  — strongest signal: saved = real interest
//   Vote ratio  (ups    / total) × 35  — community quality signal
//   Review rate (reviews / views) × 25 — engagement depth
// Minimum 10 views required for a valid score

interface QualityScore {
  score:     number   // 0–100
  grade:     string   // A+, A, B, C, D, F
  label:     string   // human label
  color:     string   // tailwind text colour
  bg:        string   // tailwind bg colour
  saveRate:  number   // 0–1
  voteRatio: number   // 0–1
  reviewRate: number  // 0–1
}

function computeQualityScore(rec: Rec): QualityScore | null {
  if (rec.view_count < 10) return null  // not enough data

  const saveRate   = Math.min(rec.save_count   / rec.view_count,   1)
  const totalVotes = rec.upvotes + rec.downvotes
  const voteRatio  = totalVotes > 0 ? rec.upvotes / totalVotes : 0.5
  const reviewRate = Math.min(rec.review_count / rec.view_count, 1)

  const raw = (saveRate * 40) + (voteRatio * 35) + (reviewRate * 25)
  const score = Math.min(Math.round(raw * 100), 100)

  let grade: string
  let label: string
  let color: string
  let bg:    string

  if (score >= 85) { grade = 'A+'; label = 'Exceptional';   color = 'text-emerald-500'; bg = 'bg-emerald-500/10' }
  else if (score >= 70) { grade = 'A';  label = 'Excellent';    color = 'text-emerald-400'; bg = 'bg-emerald-500/10' }
  else if (score >= 55) { grade = 'B';  label = 'Good';          color = 'text-primary';     bg = 'bg-primary/10'    }
  else if (score >= 40) { grade = 'C';  label = 'Average';       color = 'text-amber-500';   bg = 'bg-amber-500/10'  }
  else if (score >= 25) { grade = 'D';  label = 'Below average'; color = 'text-orange-500';  bg = 'bg-orange-500/10' }
  else                  { grade = 'F';  label = 'Needs work';    color = 'text-red-500';     bg = 'bg-red-500/10'    }

  return { score, grade, label, color, bg, saveRate, voteRatio, reviewRate }
}

function QualityBadge({ rec }: { rec: Rec }) {
  const qs = computeQualityScore(rec)

  if (!qs) {
    return (
      <span className="text-[9px] text-muted-foreground/50 font-medium px-1.5 py-0.5 rounded border border-dashed border-border">
        —
      </span>
    )
  }

  return (
    <span
      title={`Quality Score: ${qs.score}/100 — ${qs.label}`}
      className={cn(
        'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-black border',
        qs.bg,
        qs.color,
        'border-current/20'
      )}
    >
      {qs.grade}
    </span>
  )
}

function QualityDetail({ rec }: { rec: Rec }) {
  const qs = computeQualityScore(rec)

  if (!qs) {
    return (
      <p className="text-xs text-muted-foreground">
        Quality score requires at least 10 views. This recommendation has {rec.view_count} so far.
      </p>
    )
  }

  const bars = [
    { label: 'Save rate',    value: qs.saveRate,   pct: Math.round(qs.saveRate * 100),   weight: 40, color: 'bg-rose-500',   tip: 'Saves per view — strongest signal of genuine interest' },
    { label: 'Vote ratio',   value: qs.voteRatio,  pct: Math.round(qs.voteRatio * 100),  weight: 35, color: 'bg-emerald-500', tip: 'Upvotes as % of all votes' },
    { label: 'Review rate',  value: qs.reviewRate, pct: Math.round(qs.reviewRate * 100), weight: 25, color: 'bg-primary',     tip: 'Reviews per view — engagement depth' },
  ]

  return (
    <div className="space-y-4">

      {/* Score display */}
      <div className="flex items-center gap-4">
        <div className={cn('w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border', qs.bg, 'border-current/20')}>
          <span className={cn('text-2xl font-black leading-none', qs.color)}>{qs.grade}</span>
        </div>
        <div>
          <p className={cn('text-lg font-black', qs.color)}>{qs.score}/100 — {qs.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Based on {formatNumber(rec.view_count)} views · private metric, only you can see this
          </p>
        </div>
      </div>

      {/* Breakdown bars */}
      <div className="space-y-2.5">
        {bars.map(({ label, pct, weight, color, tip }) => (
          <div key={label} className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground font-medium" title={tip}>{label}</span>
              <span className="text-muted-foreground">{pct}% <span className="opacity-50">× {weight}pts</span></span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', color)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Tips based on grade */}
      {qs.score < 55 && (
        <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground space-y-1">
          <p className="font-bold text-foreground">How to improve</p>
          {qs.saveRate < 0.02 && <p>→ Add a cover image — recs with covers get saved 3× more often</p>}
          {qs.voteRatio < 0.6  && <p>→ Improve your description — be specific about why it's worth reading</p>}
          {qs.reviewRate < 0.01 && <p>→ Share the link — reviews tend to come from direct traffic</p>}
        </div>
      )}
    </div>
  )
}

export function ProAnalyticsClient({ recommendations, analytics }: Props) {
  const [selectedRec, setSelectedRec] = useState<string | null>(null)

  const totalViews = recommendations.reduce((a, r) => a + r.view_count, 0)
  const totalSaves = recommendations.reduce((a, r) => a + r.save_count, 0)
  const totalVotes = recommendations.reduce((a, r) => a + r.upvotes, 0)
  const totalScore = recommendations.reduce((a, r) => a + r.score, 0)

  // Average quality score across recs with enough data
  const scoredRecs  = recommendations.map(r => computeQualityScore(r)).filter(Boolean) as QualityScore[]
  const avgQuality  = scoredRecs.length
    ? Math.round(scoredRecs.reduce((a, s) => a + s.score, 0) / scoredRecs.length)
    : null

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <BarChart2 size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm">Your recommendation performance</p>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Views',   value: totalViews,  icon: Eye,       color: 'text-blue-500',    bg: 'bg-blue-500/10'    },
          { label: 'Total Saves',   value: totalSaves,  icon: Bookmark,  color: 'text-rose-500',    bg: 'bg-rose-500/10'    },
          { label: 'Total Upvotes', value: totalVotes,  icon: ThumbsUp,  color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Total Score',   value: totalScore,  icon: TrendingUp, color: 'text-violet-500', bg: 'bg-violet-500/10'  },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="p-4 rounded-2xl border border-border bg-card space-y-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', bg)}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-black tabular-nums">{formatNumber(value)}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Average quality score — shown when at least 1 scored rec exists */}
      {avgQuality !== null && (
        <div className="flex items-center gap-4 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5">
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black">
              Average Quality Score: <span className="text-amber-500">{avgQuality}/100</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Across {scoredRecs.length} recommendation{scoredRecs.length !== 1 ? 's' : ''} with enough data.
              Click any rec below to see its breakdown.
            </p>
          </div>
        </div>
      )}

      {/* Rec table */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          All Recommendations ({recommendations.length})
        </h2>

        {recommendations.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-border">
            <BookOpen size={28} className="text-muted-foreground opacity-40 mx-auto mb-3" />
            <p className="font-black text-sm">No approved recommendations yet</p>
            <p className="text-xs text-muted-foreground mt-1">Submit recommendations to see analytics here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recommendations.map((rec) => (
              <div key={rec.id}>
                <div
                  className={cn(
                    'group flex gap-3 p-3 rounded-2xl border bg-card cursor-pointer transition-all duration-150',
                    selectedRec === rec.id
                      ? 'border-amber-500/40 bg-amber-500/5 rounded-b-none border-b-0'
                      : 'border-border hover:border-primary/30'
                  )}
                  onClick={() => setSelectedRec(selectedRec === rec.id ? null : rec.id)}
                >
                  {/* Cover */}
                  <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                    {rec.cover_url ? (
                      <img src={proxyCover(rec.cover_url)} alt={rec.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={12} className="text-muted-foreground opacity-40" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-black line-clamp-1">{rec.title}</p>
                      <Link
                        href={`/comic/${rec.id}`}
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto"
                        onClick={e => e.stopPropagation()}
                      >
                        <ArrowUpRight size={12} className="text-muted-foreground" />
                      </Link>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border capitalize', TYPE_COLORS[rec.type] ?? 'bg-muted text-muted-foreground border-border')}>
                        {rec.type}
                      </span>
                      <QualityBadge rec={rec} />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <span className="items-center gap-1 hidden sm:flex"><Eye size={10} className="text-blue-500" />{formatNumber(rec.view_count)}</span>
                    <span className="flex items-center gap-1"><ThumbsUp size={10} className="text-emerald-500" />{rec.upvotes}</span>
                    <span className="flex items-center gap-1"><Bookmark size={10} className="text-rose-500" />{rec.save_count}</span>
                    <span className="flex items-center gap-1 font-black text-amber-500">
                      {rec.score > 0 ? '+' : ''}{rec.score}
                    </span>
                  </div>
                </div>

                {/* Inline detail panel — renders directly below the clicked card */}
                {selectedRec === rec.id && (
                  <div className="border border-t-0 border-amber-500/40 bg-amber-500/5 rounded-b-2xl p-4 space-y-4">

                    {/* Quality Score breakdown */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <Sparkles size={10} className="text-amber-500" />
                        Quality Score
                      </p>
                      <QualityDetail rec={rec} />
                    </div>

                    {/* Daily analytics */}
                    {(() => {
                      const recAnalytics = analytics
                        .filter(a => a.recommendation_id === rec.id)
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .slice(-30)

                      if (recAnalytics.length === 0) return (
                        <p className="text-xs text-muted-foreground border-t border-amber-500/20 pt-3">
                          No daily analytics data yet. Data starts tracking from today.
                        </p>
                      )

                      return (
                        <div className="space-y-2 border-t border-amber-500/20 pt-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Last 30 Days</p>
                          <div className="space-y-1.5">
                            {recAnalytics.map((row) => (
                              <div key={row.date} className="flex items-center gap-3 text-xs">
                                <span className="text-muted-foreground w-20 shrink-0">{formatDate(row.date)}</span>
                                <div className="flex gap-3">
                                  <span className="flex items-center gap-1"><Eye size={9} className="text-blue-500" />{row.views}</span>
                                  <span className="flex items-center gap-1"><ThumbsUp size={9} className="text-emerald-500" />{row.upvotes}</span>
                                  <span className="flex items-center gap-1"><Bookmark size={9} className="text-rose-500" />{row.saves}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
