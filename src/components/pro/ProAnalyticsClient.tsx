'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { formatNumber, formatDate } from '@/lib/utils/format'
import { PageHeader } from '@/components/dashboard/PageHeader'

function proxyCover(url: string | null | undefined): string {
  if (!url) return ''
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
  backHref?:       string
  isPro?:          boolean
}

// ── Quality Score ─────────────────────────────────────────────────
// Computed privately per recommendation — shown only to the owner
// Formula:
//   Save rate   (saves  / views) × 40  — strongest signal: saved = real interest
//   Vote ratio  (ups    / total) × 35  — community quality signal
//   Review rate (reviews / views) × 25 — engagement depth
// Minimum 10 views required for a valid score

interface QualityScore {
  score:      number   // 0–100
  grade:      string   // A+, A, B, C, D, F
  label:      string   // human label
  saveRate:   number   // 0–1
  voteRatio:  number   // 0–1
  reviewRate: number   // 0–1
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

  if (score >= 85)      { grade = 'A+'; label = 'Exceptional' }
  else if (score >= 70) { grade = 'A';  label = 'Excellent' }
  else if (score >= 55) { grade = 'B';  label = 'Good' }
  else if (score >= 40) { grade = 'C';  label = 'Average' }
  else if (score >= 25) { grade = 'D';  label = 'Below average' }
  else                  { grade = 'F';  label = 'Needs work' }

  return { score, grade, label, saveRate, voteRatio, reviewRate }
}

function QualityBadge({ rec }: { rec: Rec }) {
  const qs = computeQualityScore(rec)

  if (!qs) {
    return <span className="text-[11px] text-muted-foreground/50">—</span>
  }

  return (
    <span
      title={`Quality Score: ${qs.score}/100 — ${qs.label}`}
      className="text-[11px] font-dashboard-serif text-foreground"
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
    { label: 'Save rate',   pct: Math.round(qs.saveRate * 100),   weight: 40, tip: 'Saves per view — strongest signal of genuine interest' },
    { label: 'Vote ratio',  pct: Math.round(qs.voteRatio * 100),  weight: 35, tip: 'Upvotes as % of all votes' },
    { label: 'Review rate', pct: Math.round(qs.reviewRate * 100), weight: 25, tip: 'Reviews per view — engagement depth' },
  ]

  return (
    <div className="space-y-4">

      <div className="flex items-baseline gap-3">
        <span className="font-dashboard-serif text-3xl text-foreground">{qs.grade}</span>
        <div>
          <p className="text-sm text-foreground tabular-nums">{qs.score}/100 — {qs.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Based on {formatNumber(rec.view_count)} views · private metric, only you can see this
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {bars.map(({ label, pct, weight, tip }) => (
          <div key={label} className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground" title={tip}>{label}</span>
              <span className="text-muted-foreground tabular-nums">{pct}% <span className="opacity-50">× {weight}pts</span></span>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-foreground/70 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        ))}
      </div>

      {qs.score < 55 && (
        <div className="p-3 rounded-lg border border-border text-xs text-muted-foreground space-y-1">
          <p className="text-foreground">How to improve</p>
          {qs.saveRate < 0.02 && <p>Add a cover image — recs with covers get saved 3× more often.</p>}
          {qs.voteRatio < 0.6  && <p>Improve your description — be specific about why it&apos;s worth reading.</p>}
          {qs.reviewRate < 0.01 && <p>Share the link — reviews tend to come from direct traffic.</p>}
        </div>
      )}
    </div>
  )
}

export function ProAnalyticsClient({ recommendations, analytics, backHref = '/pro/reader/dashboard', isPro = true }: Props) {
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
    <div className="space-y-8">

      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        subtitle="Your recommendation performance"
        backHref={backHref}
        backLabel="Dashboard"
        isPro={isPro}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total views',   value: totalViews },
          { label: 'Total saves',   value: totalSaves },
          { label: 'Total upvotes', value: totalVotes },
          { label: 'Total score',   value: totalScore },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">{label}</p>
            <p className="font-dashboard-serif text-3xl text-foreground tabular-nums">{formatNumber(value)}</p>
          </div>
        ))}
      </div>

      {avgQuality !== null && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-foreground">
            Average quality score <span className="font-dashboard-serif text-lg tabular-nums">{avgQuality}/100</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Across {scoredRecs.length} recommendation{scoredRecs.length !== 1 ? 's' : ''} with enough data.
            Select any recommendation below to see its breakdown.
          </p>
        </div>
      )}

      <section className="space-y-3">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">
          All recommendations <span className="tabular-nums">{recommendations.length}</span>
        </p>

        {recommendations.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-dashed border-border space-y-1">
            <p className="font-dashboard-serif text-lg text-foreground">No approved recommendations yet</p>
            <p className="text-sm text-muted-foreground">Submit recommendations to see analytics here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recommendations.map((rec) => (
              <div key={rec.id}>
                <div
                  className={cn(
                    'group flex items-center gap-3 p-3 rounded-xl border bg-card cursor-pointer transition-colors',
                    selectedRec === rec.id
                      ? 'border-foreground/40 rounded-b-none border-b-0'
                      : 'border-border hover:border-foreground/30'
                  )}
                  onClick={() => setSelectedRec(selectedRec === rec.id ? null : rec.id)}
                >
                  <div className="w-10 h-14 rounded-md overflow-hidden bg-muted shrink-0">
                    {rec.cover_url && (
                      <img src={proxyCover(rec.cover_url)} alt={rec.title} className="w-full h-full object-cover" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-dashboard-serif text-base text-foreground line-clamp-1">{rec.title}</p>
                      <Link
                        href={`/comic/${rec.id}`}
                        className="shrink-0 text-[11px] text-muted-foreground hover:text-foreground md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        onClick={e => e.stopPropagation()}
                      >
                        View
                      </Link>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize flex items-center gap-2">
                      {rec.type}
                      <QualityBadge rec={rec} />
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground tabular-nums shrink-0 text-right space-x-3">
                    <span className="hidden sm:inline">{formatNumber(rec.view_count)} views</span>
                    <span>{rec.upvotes} up</span>
                    <span>{rec.save_count} saves</span>
                    <span className="text-foreground">{rec.score > 0 ? '+' : ''}{rec.score}</span>
                  </p>
                </div>

                {selectedRec === rec.id && (
                  <div className="border border-t-0 border-foreground/40 rounded-b-xl p-4 space-y-4 bg-card">

                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Quality score</p>
                      <QualityDetail rec={rec} />
                    </div>

                    {(() => {
                      const recAnalytics = analytics
                        .filter(a => a.recommendation_id === rec.id)
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .slice(-30)

                      if (recAnalytics.length === 0) return (
                        <p className="text-xs text-muted-foreground border-t border-border pt-3">
                          No daily analytics data yet. Data starts tracking from today.
                        </p>
                      )

                      return (
                        <div className="space-y-2 border-t border-border pt-3">
                          <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Last 30 days</p>
                          <div className="space-y-1">
                            {recAnalytics.map((row) => (
                              <div key={row.date} className="flex items-center gap-3 text-xs tabular-nums">
                                <span className="text-muted-foreground w-24 shrink-0">{formatDate(row.date)}</span>
                                <span className="text-foreground">{row.views} views</span>
                                <span className="text-muted-foreground">{row.upvotes} up</span>
                                <span className="text-muted-foreground">{row.saves} saves</span>
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
      </section>

    </div>
  )
}
