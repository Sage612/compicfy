'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Loader2, RefreshCw, Users, BookOpen, ThumbsUp,
  Bookmark, MessageSquare, TrendingUp, Clock, Shield,
  Award, BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/format'
import { toast } from 'sonner'

interface TimeSeriesPoint { date: string; value: number }

interface AnalyticsData {
  totalUsers:               number
  totalRecommendations:     number
  totalVotes:               number
  totalSaves:               number
  totalReviews:             number
  userGrowth:               TimeSeriesPoint[]
  recommendationSubmissions:TimeSeriesPoint[]
  dailyVotes:               TimeSeriesPoint[]
  dailySaves:               TimeSeriesPoint[]
  byType:                   Record<string, number>
  byGenre:                  Record<string, number>
  byContentRating:          Record<string, number>
  byStatus:                 Record<string, number>
  dailyActiveUsers:         TimeSeriesPoint[]
  newUsersLast7Days:        number
  newUsersLast30Days:       number
  totalUpvotes:             number
  totalDownvotes:           number
  avgVotesPerComic:         number
  avgSavesPerComic:         number
  pendingApprovals:         number
  approvedToday:            number
  rejectedToday:            number
  avgApprovalTimeHours:     number | null
  topVotedComics:           Array<{ id: string; title: string; score: number; author: string | null }>
  mostActiveUsers:          Array<{ id: string; username: string; recommendations: number; votes: number }>
}

const TABS = [
  { value: 'overview',   label: 'Overview',    icon: TrendingUp  },
  { value: 'content',    label: 'Content',     icon: BookOpen    },
  { value: 'engagement', label: 'Engagement',  icon: ThumbsUp    },
  { value: 'users',      label: 'Users',       icon: Users       },
  { value: 'moderation', label: 'Moderation',  icon: Shield      },
] as const

type TabValue = typeof TABS[number]['value']

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-violet-500/10 text-violet-500 border-violet-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
  other:   'bg-zinc-500/10   text-zinc-500   border-zinc-500/20',
}

const RATING_COLORS: Record<string, string> = {
  all_ages: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  teen:     'bg-blue-500/10   text-blue-600   border-blue-500/20',
  mature:   'bg-amber-500/10  text-amber-600  border-amber-500/20',
  adult:    'bg-red-500/10    text-red-600    border-red-500/20',
}

const STATUS_COLORS: Record<string, string> = {
  ongoing:   'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  completed: 'bg-blue-500/10   text-blue-600   border-blue-500/20',
  hiatus:    'bg-amber-500/10  text-amber-600  border-amber-500/20',
  cancelled: 'bg-red-500/10    text-red-600    border-red-500/20',
}

// ── Shared sub-components ─────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, gradient, subtext
}: {
  label:    string
  value:    string | number
  icon:     any
  gradient: string
  subtext?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 hover:border-primary/20 transition-colors group">
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center mb-4 shadow-sm',
        gradient
      )}>
        <Icon size={18} className="text-white" />
      </div>
      <p className="text-2xl sm:text-3xl font-black tabular-nums leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-1.5 font-medium">{label}</p>
      {subtext && (
        <p className="text-[10px] text-muted-foreground/60 mt-1 border-t border-border pt-2">{subtext}</p>
      )}
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-5 py-3 border-b border-border bg-muted/30">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</p>
    </div>
  )
}

function TimeSeriesChart({ title, data: seriesData }: { title: string; data: TimeSeriesPoint[] }) {
  const max     = Math.max(...seriesData.map(d => d.value), 1)
  const reversed = [...seriesData].reverse()

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <SectionHeader title={title} />

      {/* Sparkline — visual bars for last 14 days */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-end gap-0.5 h-16">
          {reversed.slice(0, 14).map((point, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-primary/20 hover:bg-primary/40 transition-colors cursor-default relative group/bar"
              style={{ height: `${Math.max(4, (point.value / max) * 100)}%` }}
              title={`${formatDate(point.date)}: ${point.value}`}
            >
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/bar:flex flex-col items-center pointer-events-none z-10">
                <div className="bg-popover border border-border rounded-lg px-2 py-1 shadow-lg whitespace-nowrap">
                  <p className="text-[10px] font-bold">{point.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
          <span>{reversed.slice(0, 14)[13] ? formatDate(reversed.slice(0, 14)[13].date) : ''}</span>
          <span>{reversed.slice(0, 14)[0] ? formatDate(reversed.slice(0, 14)[0].date) : ''}</span>
        </div>
      </div>

      {/* Table — last 7 rows */}
      <div className="border-t border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-2 text-left font-medium">Date</th>
              <th className="px-5 py-2 text-right font-medium">Count</th>
              <th className="px-5 py-2 text-left font-medium w-full">Bar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reversed.slice(0, 7).map((point) => (
              <tr key={point.date} className="hover:bg-muted/20 transition-colors">
                <td className="px-5 py-2.5 text-xs font-medium">{formatDate(point.date)}</td>
                <td className="px-5 py-2.5 text-right tabular-nums font-black text-sm">{point.value}</td>
                <td className="px-5 py-2.5">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full transition-all duration-500"
                      style={{ width: `${(point.value / max) * 100}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DistributionCard({
  title, data, colors
}: {
  title:   string
  data:    Record<string, number>
  colors?: Record<string, string>
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  const max     = Math.max(...entries.map(e => e[1]), 1)
  const total   = entries.reduce((s, [, v]) => s + v, 0)

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</p>
        <span className="text-[10px] text-muted-foreground">{total} total</span>
      </div>
      <div className="divide-y divide-border max-h-64 overflow-y-auto">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
            <span className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize shrink-0',
              colors?.[key] ?? 'bg-muted text-muted-foreground border-border'
            )}>
              {key.replace(/_/g, ' ')}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${(value / max) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground w-8 text-right shrink-0">
                  {Math.round((value / total) * 100)}%
                </span>
              </div>
            </div>
            <span className="text-sm font-black tabular-nums shrink-0">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────

export function AnalyticsDashboard() {
  const [data,      setData]      = useState<AnalyticsData | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState<TabValue>('overview')
  const [days,      setDays]      = useState(30)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/analytics?days=${days}`)
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="relative flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />
        <div className="relative mb-8 w-36 h-36 mx-auto">
          <div className="absolute top-0 left-0 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-12deg] opacity-40" />
          <div className="absolute top-2 left-6 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-5deg] opacity-60" />
          <div className="absolute top-4 left-10 w-20 h-28 rounded-2xl border-2 border-primary/30 bg-card shadow-xl flex flex-col items-center justify-center gap-1">
            <BarChart3 size={18} className="text-primary opacity-60" />
            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">No data</span>
          </div>
        </div>
        <p className="text-sm font-black">Failed to load analytics</p>
        <Button variant="outline" size="sm" onClick={fetchAnalytics} className="mt-4 gap-1.5">
          <RefreshCw size={13} /> Retry
        </Button>
      </div>
    )
  }

  // ── Tab renderers ─────────────────────────────────────────────────

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Users"   value={data.totalUsers.toLocaleString()}           icon={Users}     gradient="bg-gradient-to-br from-violet-500 to-purple-600"  subtext={`+${data.newUsersLast7Days} this week`} />
        <StatCard label="Comics"        value={data.totalRecommendations.toLocaleString()} icon={BookOpen}  gradient="bg-gradient-to-br from-blue-500 to-indigo-600"    />
        <StatCard label="Total Votes"   value={data.totalVotes.toLocaleString()}           icon={ThumbsUp}  gradient="bg-gradient-to-br from-emerald-500 to-teal-600"   subtext={`${data.avgVotesPerComic} avg/comic`} />
        <StatCard label="Saves"         value={data.totalSaves.toLocaleString()}           icon={Bookmark}  gradient="bg-gradient-to-br from-amber-500 to-orange-500"   subtext={`${data.avgSavesPerComic} avg/comic`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TimeSeriesChart title="User Growth"         data={data.userGrowth} />
        <TimeSeriesChart title="Comic Submissions"   data={data.recommendationSubmissions} />
      </div>

      {/* Top voted comics */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <SectionHeader title="Top Voted Comics" />
        <div className="divide-y divide-border">
          {data.topVotedComics.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground text-center">No data yet</p>
          ) : data.topVotedComics.map((comic, i) => (
            <div key={comic.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors">
              <span className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0',
                i < 3 ? 'bg-amber-500/20 text-amber-600' : 'bg-muted text-muted-foreground'
              )}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{comic.title}</p>
                {comic.author && <p className="text-xs text-muted-foreground">by {comic.author}</p>}
              </div>
              <div className="shrink-0 text-right">
                <span className="text-sm font-black text-emerald-600">+{comic.score}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderContent = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DistributionCard title="By Type"           data={data.byType}          colors={TYPE_COLORS}   />
        <DistributionCard title="By Content Rating" data={data.byContentRating} colors={RATING_COLORS} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DistributionCard title="By Status"         data={data.byStatus}        colors={STATUS_COLORS} />
        <DistributionCard title="By Genre (Top 20)" data={data.byGenre}                                />
      </div>
    </div>
  )

  const renderEngagement = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Upvotes"    value={data.totalUpvotes.toLocaleString()}   icon={ThumbsUp}     gradient="bg-gradient-to-br from-emerald-500 to-teal-600"  />
        <StatCard label="Downvotes"  value={data.totalDownvotes.toLocaleString()} icon={ThumbsUp}     gradient="bg-gradient-to-br from-red-500 to-rose-600"      />
        <StatCard label="Reviews"    value={data.totalReviews.toLocaleString()}   icon={MessageSquare} gradient="bg-gradient-to-br from-blue-500 to-indigo-600"   />
        <StatCard
          label="Vote Ratio"
          value={data.totalDownvotes > 0
            ? `${Math.round((data.totalUpvotes / data.totalDownvotes) * 10) / 10}:1`
            : '∞'}
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TimeSeriesChart title="Daily Votes" data={data.dailyVotes} />
        <TimeSeriesChart title="Daily Saves" data={data.dailySaves} />
      </div>
    </div>
  )

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="New Users (7d)"  value={data.newUsersLast7Days}  icon={Users} gradient="bg-gradient-to-br from-emerald-500 to-teal-600"  />
        <StatCard label="New Users (30d)" value={data.newUsersLast30Days} icon={Users} gradient="bg-gradient-to-br from-blue-500 to-indigo-600"    />
        <StatCard
          label="Avg DAU"
          value={data.dailyActiveUsers.length > 0
            ? Math.round(data.dailyActiveUsers.reduce((a, b) => a + b.value, 0) / data.dailyActiveUsers.length)
            : 0}
          icon={Clock}
          gradient="bg-gradient-to-br from-amber-500 to-orange-500"
        />
      </div>

      <TimeSeriesChart title="Daily Active Users" data={data.dailyActiveUsers} />

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <SectionHeader title="Most Active Contributors" />
        <div className="divide-y divide-border">
          {data.mostActiveUsers.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground text-center">No data yet</p>
          ) : data.mostActiveUsers.map((user, i) => (
            <div key={user.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors">
              <span className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                i < 3 ? 'bg-amber-500/20 text-amber-600' : 'bg-muted text-muted-foreground text-xs font-bold'
              )}>
                {i < 3 ? <Award size={13} /> : i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">@{user.username}</p>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground shrink-0">
                <span><strong className="text-foreground">{user.recommendations}</strong> recs</span>
                <span><strong className="text-foreground">{user.votes}</strong> votes</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderModeration = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Pending"
          value={data.pendingApprovals}
          icon={Clock}
          gradient={data.pendingApprovals > 0
            ? 'bg-gradient-to-br from-amber-500 to-orange-500'
            : 'bg-gradient-to-br from-emerald-500 to-teal-600'}
          subtext="Awaiting review"
        />
        <StatCard label="Approved Today"  value={data.approvedToday}  icon={Shield}    gradient="bg-gradient-to-br from-emerald-500 to-teal-600" />
        <StatCard label="Rejected Today"  value={data.rejectedToday}  icon={Shield}    gradient="bg-gradient-to-br from-red-500 to-rose-600"     />
        <StatCard
          label="Approval Rate"
          value={data.approvedToday + data.rejectedToday > 0
            ? `${Math.round((data.approvedToday / (data.approvedToday + data.rejectedToday)) * 100)}%`
            : 'N/A'}
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
        />
      </div>

      {data.pendingApprovals > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
          <Clock size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-amber-600">Action needed</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.pendingApprovals} recommendation{data.pendingApprovals > 1 ? 's are' : ' is'} waiting for review.
              Head to the <strong>Recommendations</strong> tab to process them.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Coming soon</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Average approval time, appeal statistics, and detailed moderation timelines will be available in a future update.
        </p>
      </div>
    </div>
  )

  return (
    <div className="space-y-5">

      {/* ── Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Period:</span>
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                  days === d
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading} className="gap-1.5 self-end sm:self-auto">
          {loading && <Loader2 size={13} className="animate-spin" />}
          <RefreshCw size={13} />
          Refresh
        </Button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all',
              activeTab === value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent hover:border-border'
            )}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div>
        {activeTab === 'overview'   && renderOverview()}
        {activeTab === 'content'    && renderContent()}
        {activeTab === 'engagement' && renderEngagement()}
        {activeTab === 'users'      && renderUsers()}
        {activeTab === 'moderation' && renderModeration()}
      </div>
    </div>
  )
}