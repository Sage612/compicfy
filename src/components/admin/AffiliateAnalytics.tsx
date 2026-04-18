'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Loader2, RefreshCw, Link2, MousePointerClick,
  TrendingUp, BarChart3, Clock, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/format'
import { toast } from 'sonner'

interface AffiliateClick {
  id:           string
  comic_id:     string | null
  comic_title:  string | null
  platform:     string
  product_type: string | null
  genre:        string | null
  ip_address:   string
  user_agent:   string
  created_at:   string
}

interface AffiliateStats {
  totalClicks:       number
  platformBreakdown: Record<string, number>
  recentClicks:      AffiliateClick[]
}

const PLATFORM_COLORS: Record<string, string> = {
  webtoon:  'bg-teal-500/10   text-teal-600   border-teal-500/20',
  tapas:    'bg-violet-500/10 text-violet-600 border-violet-500/20',
  amazon:   'bg-amber-500/10  text-amber-600  border-amber-500/20',
  lezhin:   'bg-rose-500/10   text-rose-600   border-rose-500/20',
  manta:    'bg-blue-500/10   text-blue-600   border-blue-500/20',
  crunchyroll: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
}

function getPlatformStyle(platform: string) {
  const lower = platform.toLowerCase()
  for (const [key, val] of Object.entries(PLATFORM_COLORS)) {
    if (lower.includes(key)) return val
  }
  return 'bg-muted text-muted-foreground border-border'
}

export function AffiliateAnalytics() {
  const [data, setData]       = useState<AffiliateStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<'overview' | 'recent'>('overview')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/affiliate/stats')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setData(json)
    } catch {
      toast.error('Failed to load affiliate data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return (
      /* ── Empty / error state ── */
      <div className="relative flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />
        <div className="relative mb-6 w-32 h-32 mx-auto">
          <div className="absolute top-0 left-0 rounded-2xl border-2 border-border bg-card rotate-[-12deg] opacity-40" style={{ width: '4.5rem', height: '6rem' }} />
          <div className="absolute top-2 left-5 rounded-2xl border-2 border-border bg-card rotate-[-5deg] opacity-60" style={{ width: '4.5rem', height: '6rem' }} />
          <div className="absolute top-4 left-9 rounded-2xl border-2 border-primary/30 bg-card shadow-xl flex flex-col items-center justify-center gap-1" style={{ width: '4.5rem', height: '6rem' }}>
            <Link2 size={16} className="text-primary opacity-60" />
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-center px-1">No data</span>
          </div>
        </div>
        <p className="text-sm font-black">Failed to load affiliate data</p>
        <Button variant="outline" size="sm" onClick={fetchData} className="mt-4 gap-1.5">
          <RefreshCw size={13} /> Retry
        </Button>
      </div>
    )
  }

  const platformEntries = Object.entries(data.platformBreakdown).sort((a, b) => b[1] - a[1])
  const maxClicks       = Math.max(...platformEntries.map(([, v]) => v), 1)

  return (
    <div className="space-y-5">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {(['overview', 'recent'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold border capitalize transition-all',
                tab === t
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'border-border text-muted-foreground hover:border-primary'
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Refresh
        </Button>
      </div>

      {tab === 'overview' && (
        <div className="space-y-5">

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard
              icon={MousePointerClick}
              label="Total Clicks"
              value={data.totalClicks.toLocaleString()}
              color="bg-emerald-500/10 text-emerald-500"
            />
            <StatCard
              icon={BarChart3}
              label="Platforms"
              value={platformEntries.length}
              color="bg-violet-500/10 text-violet-500"
            />
            <StatCard
              icon={TrendingUp}
              label="Top Platform"
              value={platformEntries[0]?.[0] ?? '—'}
              color="bg-teal-500/10 text-teal-500"
              small
            />
          </div>

          {/* ── Platform breakdown ── */}
          {platformEntries.length === 0 ? (
            <NoDataPanel label="No affiliate clicks yet" icon={Link2} />
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Platform Breakdown</p>
                <span className="text-[10px] text-muted-foreground">{data.totalClicks} total clicks</span>
              </div>
              <div className="divide-y divide-border">
                {platformEntries.map(([platform, count]) => {
                  const pct = Math.round((count / data.totalClicks) * 100)
                  return (
                    <div key={platform} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize shrink-0',
                        getPlatformStyle(platform)
                      )}>
                        {platform}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
                              style={{ width: `${(count / maxClicks) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground w-8 text-right shrink-0">{pct}%</span>
                        </div>
                      </div>
                      <span className="text-sm font-black tabular-nums shrink-0">{count.toLocaleString()}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'recent' && (
        <div className="space-y-3">
          {data.recentClicks.length === 0 ? (
            <NoDataPanel label="No recent clicks" icon={Clock} />
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/30">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Recent Clicks (last {data.recentClicks.length})
                </p>
              </div>
              <div className="divide-y divide-border max-h-[520px] overflow-y-auto">
                {data.recentClicks.map((click) => (
                  <div key={click.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <ExternalLink size={13} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold truncate">
                          {click.comic_title ?? 'Unknown comic'}
                        </span>
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize shrink-0',
                          getPlatformStyle(click.platform)
                        )}>
                          {click.platform}
                        </span>
                        {click.product_type && (
                          <span className="text-[10px] text-muted-foreground capitalize">{click.product_type}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock size={9} />
                          {formatDate(click.created_at)}
                        </span>
                        {click.genre && (
                          <span className="capitalize">{click.genre}</span>
                        )}
                        <span className="font-mono truncate max-w-[120px]" title={click.ip_address}>
                          {click.ip_address === 'unknown' ? 'Unknown IP' : click.ip_address.split(',')[0].trim()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  small,
}: {
  icon:   any
  label:  string
  value:  string | number
  color:  string
  small?: boolean
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition-colors">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}>
        <Icon size={18} />
      </div>
      <p className={cn('font-black tabular-nums', small ? 'text-lg truncate' : 'text-3xl')}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}

function NoDataPanel({ label, icon: Icon }: { label: string; icon: any }) {
  return (
    <div className="relative flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border overflow-hidden">
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />
      <div className="relative mb-5 w-28 h-28 mx-auto">
        <div className="absolute top-0 left-0 rounded-2xl border-2 border-border bg-card rotate-[-12deg] opacity-40" style={{ width: '4rem', height: '5.5rem' }} />
        <div className="absolute top-2 left-4 rounded-2xl border-2 border-border bg-card rotate-[-5deg] opacity-60" style={{ width: '4rem', height: '5.5rem' }} />
        <div className="absolute top-3 left-8 rounded-2xl border-2 border-primary/30 bg-card shadow-xl flex flex-col items-center justify-center gap-1" style={{ width: '4rem', height: '5.5rem' }}>
          <Icon size={14} className="text-primary opacity-60" />
          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center px-1">Empty</span>
        </div>
      </div>
      <p className="text-sm font-black">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">Affiliate clicks will appear here</p>
    </div>
  )
}