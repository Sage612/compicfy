import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Users, BookOpen, Clock, ScrollText,
  Star, Flag, ArrowRight, Shield, ShoppingBag,
  BarChart3, BookMarked, Crown, Pencil, Zap,
} from 'lucide-react'
import type { Metadata } from 'next'
import { MaintenanceToggle } from '@/components/admin/MaintenanceToggle'

export const metadata: Metadata = { title: 'Admin Dashboard' }

interface StatItem {
  label: string
  value: number | string
  icon: any
  href: string
  bg: string
  text: string
  urgent: boolean
  adminOnly: boolean
}

const DASHBOARDS = [
  {
    label:       'Reader Dashboard',
    description: 'Free reader experience 50 recs/month, 5 lists, 100 saves',
    href:        '/reader/dashboard',
    icon:        BookMarked,
    bg:          'bg-primary/10',
    text:        'text-primary',
    border:      'border-primary/20 hover:border-primary/40',
  },
  {
    label:       'Pro Reader Dashboard',
    description: 'Unlimited recs, analytics, export, leaderboard',
    href:        '/pro/reader/dashboard',
    icon:        Crown,
    bg:          'bg-amber-500/10',
    text:        'text-amber-500',
    border:      'border-amber-500/20 hover:border-amber-500/40',
  },
  {
    label:       'Creator Dashboard',
    description: 'Free creator experience manage works, audience, links',
    href:        '/creator/dashboard',
    icon:        Pencil,
    bg:          'bg-teal-500/10',
    text:        'text-teal-500',
    border:      'border-teal-500/20 hover:border-teal-500/40',
  },
  {
    label:       'Pro Creator Dashboard',
    description: 'Full creator suite analytics, advanced audience tools',
    href:        '/pro/creator/dashboard',
    icon:        Zap,
    bg:          'bg-violet-500/10',
    text:        'text-violet-500',
    border:      'border-violet-500/20 hover:border-violet-500/40',
  },
]

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role    = profile?.role as 'admin' | 'moderator' | undefined
  const isAdmin = role === 'admin'

  const [
    { count: totalUsers },
    { count: totalRecs },
    { count: pendingRecs },
    { count: totalNews },
    { count: totalReviews },
    { count: pendingReports },
    { count: totalAffiliateClicks },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('recommendations').select('*', { count: 'exact', head: true }),
    supabase.from('recommendations').select('*', { count: 'exact', head: true }).eq('is_approved', false),
    supabase.from('news').select('*', { count: 'exact', head: true }),
    supabase.from('reviews').select('*', { count: 'exact', head: true }),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('affiliate_clicks').select('*', { count: 'exact', head: true }),
  ])

  const allStats: StatItem[] = [
    { label: 'Total Users',       value: totalUsers ?? 0,           icon: Users,       href: '/admin/users',           bg: 'bg-violet-500/10',  text: 'text-violet-500',  urgent: false,                         adminOnly: true  },
    { label: 'Recommendations',   value: totalRecs ?? 0,            icon: BookOpen,    href: '/admin/recommendations', bg: 'bg-blue-500/10',    text: 'text-blue-500',    urgent: false,                         adminOnly: false },
    { label: 'Pending Approval',  value: pendingRecs ?? 0,          icon: Clock,       href: '/admin/recommendations', bg: 'bg-amber-500/10',   text: 'text-amber-500',   urgent: (pendingRecs ?? 0) > 0,        adminOnly: false },
    { label: 'News Articles',     value: totalNews ?? 0,            icon: ScrollText,  href: '/admin/news',            bg: 'bg-primary/10',     text: 'text-primary',     urgent: false,                         adminOnly: false },
    { label: 'Reviews',           value: totalReviews ?? 0,         icon: Star,        href: '/admin/reviews',         bg: 'bg-amber-500/10',   text: 'text-amber-500',   urgent: false,                         adminOnly: false },
    { label: 'Pending Reports',   value: pendingReports ?? 0,       icon: Flag,        href: '/admin/reports',         bg: 'bg-red-500/10',     text: 'text-red-500',     urgent: (pendingReports ?? 0) > 0,     adminOnly: false },
    { label: 'Affiliate Clicks',  value: totalAffiliateClicks ?? 0, icon: ShoppingBag, href: '/admin/affiliate',       bg: 'bg-emerald-500/10', text: 'text-emerald-500', urgent: false,                         adminOnly: true  },
    { label: 'Analytics',         value: 'View',                    icon: BarChart3,   href: '/admin/analytics',       bg: 'bg-primary/10',     text: 'text-primary',     urgent: false,                         adminOnly: false },
  ]

  const visibleStats = allStats.filter(s => isAdmin || !s.adminOnly)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <Shield size={16} className="text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {isAdmin ? 'Full admin access' : 'Moderator access'}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className={`grid grid-cols-2 ${visibleStats.length > 4 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-3`}>
        {visibleStats.map(({ label, value, icon: Icon, href, bg, text, urgent }) => (
          <Link
            key={label}
            href={href}
            className={`group relative overflow-hidden p-5 rounded-2xl border bg-card hover:shadow-lg transition-all duration-200 ${
              urgent ? 'border-red-500/40 bg-red-500/5' : 'border-border hover:border-primary/40'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl ${urgent ? 'bg-red-500/15' : bg} flex items-center justify-center mb-3`}>
              <Icon size={18} className={urgent ? 'text-red-500' : text} />
            </div>
            <p className={`text-3xl font-black tabular-nums ${urgent ? 'text-red-500' : ''}`}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
            <ArrowRight size={12} className="absolute bottom-4 right-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all" />
          </Link>
        ))}
      </div>

      {/* ── Dashboard Access — admin only ── */}
      {isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2">
              Dashboard Access
            </p>
            <div className="h-px flex-1 bg-border" />
          </div>
          <p className="text-xs text-muted-foreground text-center -mt-1">
            QA any user experience without switching accounts
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DASHBOARDS.map(({ label, description, href, icon: Icon, bg, text, border }) => (
              <Link
                key={href}
                href={href}
                className={`group flex items-start gap-4 p-4 rounded-2xl border bg-card transition-all duration-200 hover:shadow-md ${border}`}
              >
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon size={18} className={text} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm leading-tight">{label}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
                </div>
                <ArrowRight
                  size={14}
                  className="text-muted-foreground/30 group-hover:text-muted-foreground/70 group-hover:translate-x-0.5 transition-all shrink-0 mt-1"
                />
              </Link>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2">
                Site Controls
              </p>
              <div className="h-px flex-1 bg-border" />
            </div>
            <MaintenanceToggle />
          </div>
        </div>
      )}
    </div>
  )
}