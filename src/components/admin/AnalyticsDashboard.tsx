'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, Users, BookOpen, ThumbsUp, Bookmark, MessageSquare, TrendingUp, Clock, Shield, Award } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/format'
import { toast } from 'sonner'

interface TimeSeriesPoint {
  date: string
  value: number
}

interface AnalyticsData {
  totalUsers: number
  totalRecommendations: number
  totalVotes: number
  totalSaves: number
  totalReviews: number
  
  userGrowth: TimeSeriesPoint[]
  recommendationSubmissions: TimeSeriesPoint[]
  dailyVotes: TimeSeriesPoint[]
  dailySaves: TimeSeriesPoint[]
  
  byType: Record<string, number>
  byGenre: Record<string, number>
  byContentRating: Record<string, number>
  byStatus: Record<string, number>
  
  dailyActiveUsers: TimeSeriesPoint[]
  newUsersLast7Days: number
  newUsersLast30Days: number
  
  totalUpvotes: number
  totalDownvotes: number
  avgVotesPerComic: number
  avgSavesPerComic: number
  
  pendingApprovals: number
  approvedToday: number
  rejectedToday: number
  avgApprovalTimeHours: number | null
  
  topVotedComics: Array<{
    id: string
    title: string
    score: number
    author: string | null
  }>
  
  mostActiveUsers: Array<{
    id: string
    username: string
    recommendations: number
    votes: number
  }>
}

const TABS = [
  { value: 'overview', label: 'Overview', icon: TrendingUp },
  { value: 'content', label: 'Content', icon: BookOpen },
  { value: 'engagement', label: 'Engagement', icon: ThumbsUp },
  { value: 'users', label: 'Users', icon: Users },
  { value: 'moderation', label: 'Moderation', icon: Shield },
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

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabValue>('overview')
  const [days, setDays] = useState(30)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/analytics?days=${days}`)
      if (!res.ok) throw new Error()
      const analytics = await res.json()
      setData(analytics)
    } catch {
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-24 rounded-2xl border border-dashed border-border">
        <p className="text-muted-foreground">Failed to load analytics</p>
        <Button variant="outline" size="sm" onClick={fetchAnalytics} className="mt-4 gap-1.5">
          <RefreshCw size={13} />
          Retry
        </Button>
      </div>
    )
  }

  const StatCard = ({ 
    label, 
    value, 
    icon: Icon, 
    color, 
    subtext 
  }: { 
    label: string
    value: string | number
    icon: any
    color: string
    subtext?: string 
  }) => (
    <div className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition-colors">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}>
        <Icon size={18} />
      </div>
      <p className="text-3xl font-black tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {subtext && <p className="text-[10px] text-muted-foreground/70 mt-1">{subtext}</p>}
    </div>
  )

  const TimeSeriesTable = ({ 
    title, 
    data: seriesData 
  }: { 
    title: string
    data: TimeSeriesPoint[] 
  }) => {
    const max = Math.max(...seriesData.map(d => d.value), 1)
    
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{title}</p>
        </div>
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Date</th>
                <th className="px-4 py-2 text-right font-medium">Count</th>
                <th className="px-4 py-2 text-left font-medium w-full">Visual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...seriesData].reverse().map((point) => (
                <tr key={point.date} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 text-xs font-medium">{formatDate(point.date)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-bold">{point.value}</td>
                  <td className="px-4 py-2.5">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
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

  const DistributionTable = ({ 
    title, 
    data, 
    colors 
  }: { 
    title: string
    data: Record<string, number>
    colors?: Record<string, string>
  }) => {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
    const max = Math.max(...entries.map(e => e[1]), 1)
    const total = entries.reduce((sum, [, val]) => sum + val, 0)

    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{title}</p>
          <span className="text-[10px] text-muted-foreground">{total} total</span>
        </div>
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {entries.map(([key, value]) => (
                <tr key={key} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize',
                      colors?.[key] ?? 'bg-muted text-muted-foreground border-border'
                    )}>
                      {key.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-bold">{value}</td>
                  <td className="px-4 py-2.5 w-full">
                    <div className="flex items-center gap-2">
                      <div className="h-2 bg-muted rounded-full overflow-hidden flex-1">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(value / max) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-8 text-right">
                        {Math.round((value / total) * 100)}%
                      </span>
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

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard 
          label="Total Users" 
          value={data.totalUsers.toLocaleString()} 
          icon={Users} 
          color="bg-violet-500/10 text-violet-500"
          subtext={`+${data.newUsersLast7Days} this week`}
        />
        <StatCard 
          label="Comics" 
          value={data.totalRecommendations.toLocaleString()} 
          icon={BookOpen} 
          color="bg-blue-500/10 text-blue-500"
        />
        <StatCard 
          label="Total Votes" 
          value={data.totalVotes.toLocaleString()} 
          icon={ThumbsUp} 
          color="bg-emerald-500/10 text-emerald-500"
          subtext={`${data.avgVotesPerComic} avg per comic`}
        />
        <StatCard 
          label="Saves" 
          value={data.totalSaves.toLocaleString()} 
          icon={Bookmark} 
          color="bg-amber-500/10 text-amber-500"
          subtext={`${data.avgSavesPerComic} avg per comic`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TimeSeriesTable title="User Growth (Last 30 Days)" data={data.userGrowth} />
        <TimeSeriesTable title="Comic Submissions" data={data.recommendationSubmissions} />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Top Voted Comics</p>
        </div>
        <div className="divide-y divide-border">
          {data.topVotedComics.map((comic, i) => (
            <div key={comic.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{comic.title}</p>
                {comic.author && <p className="text-xs text-muted-foreground">by {comic.author}</p>}
              </div>
              <span className="text-sm font-bold tabular-nums text-emerald-600">+{comic.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderContent = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DistributionTable title="By Type" data={data.byType} colors={TYPE_COLORS} />
        <DistributionTable title="By Content Rating" data={data.byContentRating} colors={RATING_COLORS} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DistributionTable title="By Status" data={data.byStatus} colors={STATUS_COLORS} />
        <DistributionTable title="By Genre (Top 20)" data={data.byGenre} />
      </div>
    </div>
  )

  const renderEngagement = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard 
          label="Upvotes" 
          value={data.totalUpvotes.toLocaleString()} 
          icon={ThumbsUp} 
          color="bg-emerald-500/10 text-emerald-500"
        />
        <StatCard 
          label="Downvotes" 
          value={data.totalDownvotes.toLocaleString()} 
          icon={ThumbsUp} 
          color="bg-red-500/10 text-red-500"
        />
        <StatCard 
          label="Reviews" 
          value={data.totalReviews.toLocaleString()} 
          icon={MessageSquare} 
          color="bg-blue-500/10 text-blue-500"
        />
        <StatCard 
          label="Vote Ratio" 
          value={data.totalDownvotes > 0 
            ? `${Math.round((data.totalUpvotes / data.totalDownvotes) * 10) / 10}:1` 
            : '∞'} 
          icon={TrendingUp} 
          color="bg-violet-500/10 text-violet-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TimeSeriesTable title="Daily Votes" data={data.dailyVotes} />
        <TimeSeriesTable title="Daily Saves" data={data.dailySaves} />
      </div>
    </div>
  )

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard 
          label="New Users (7d)" 
          value={data.newUsersLast7Days} 
          icon={Users} 
          color="bg-emerald-500/10 text-emerald-500"
        />
        <StatCard 
          label="New Users (30d)" 
          value={data.newUsersLast30Days} 
          icon={Users} 
          color="bg-blue-500/10 text-blue-500"
        />
        <StatCard 
          label="Avg DAU" 
          value={data.dailyActiveUsers.length > 0 
            ? Math.round(data.dailyActiveUsers.reduce((a, b) => a + b.value, 0) / data.dailyActiveUsers.length)
            : 0} 
          icon={Clock} 
          color="bg-amber-500/10 text-amber-500"
        />
      </div>

      <TimeSeriesTable title="Daily Active Users" data={data.dailyActiveUsers} />

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Most Active Contributors</p>
        </div>
        <div className="divide-y divide-border">
          {data.mostActiveUsers.map((user, i) => (
            <div key={user.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20">
              <span className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                i < 3 ? 'bg-amber-500/20 text-amber-600' : 'bg-muted text-muted-foreground'
              )}>
                {i < 3 ? <Award size={12} /> : i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">@{user.username}</p>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="text-muted-foreground">{user.recommendations} recs</span>
                <span className="text-muted-foreground">{user.votes} votes received</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderModeration = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard 
          label="Pending Approval" 
          value={data.pendingApprovals} 
          icon={Clock} 
          color={data.pendingApprovals > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}
          subtext="Awaiting review"
        />
        <StatCard 
          label="Approved Today" 
          value={data.approvedToday} 
          icon={Shield} 
          color="bg-emerald-500/10 text-emerald-500"
        />
        <StatCard 
          label="Rejected Today" 
          value={data.rejectedToday} 
          icon={Shield} 
          color="bg-red-500/10 text-red-500"
        />
        <StatCard 
          label="Approval Rate" 
          value={data.approvedToday + data.rejectedToday > 0 
            ? `${Math.round((data.approvedToday / (data.approvedToday + data.rejectedToday)) * 100)}%`
            : 'N/A'} 
          icon={TrendingUp} 
          color="bg-blue-500/10 text-blue-500"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Detailed moderation analytics including average approval time and appeal statistics 
          will be available in a future update.
        </p>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Period:</span>
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all',
                  days === d
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading} className="gap-1.5">
          {loading && <Loader2 size={13} className="animate-spin" />}
          <RefreshCw size={13} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap border-b border-border pb-1">
        {TABS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all',
              activeTab === value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="pt-2">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'content' && renderContent()}
        {activeTab === 'engagement' && renderEngagement()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'moderation' && renderModeration()}
      </div>
    </div>
  )
}