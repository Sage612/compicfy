import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Users, BookOpen, Clock, Newspaper,
  Star, Flag, ArrowRight, Shield, ShoppingBag,
  BarChart3,
} from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin Dashboard' }

// Define which stats are accessible by which roles
const ADMIN_ONLY_HREFS = ['/admin/users', '/admin/logs', '/admin/test-email', '/admin/affiliate']

interface StatItem {
  label: string
  value: number | string  // <-- Add | string here
  icon: any
  href: string
  bg: string
  text: string
  urgent: boolean
  adminOnly: boolean
}

export default async function AdminPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as 'admin' | 'moderator' | undefined
  const isAdmin = role === 'admin'

  // Fetch all stats (always fetch for simplicity, filter display by role)
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

  // Define all stats with adminOnly flag
  const allStats: StatItem[] = [
    { 
      label: 'Total Users', 
      value: totalUsers ?? 0, 
      icon: Users, 
      href: '/admin/users', 
      bg: 'bg-violet-500/10', 
      text: 'text-violet-500', 
      urgent: false,
      adminOnly: true, // Admin only
    },
    { 
      label: 'Recommendations', 
      value: totalRecs ?? 0, 
      icon: BookOpen, 
      href: '/admin/recommendations', 
      bg: 'bg-blue-500/10', 
      text: 'text-blue-500', 
      urgent: false,
      adminOnly: false, // Shared
    },
    { 
      label: 'Pending Approval', 
      value: pendingRecs ?? 0, 
      icon: Clock, 
      href: '/admin/recommendations', 
      bg: 'bg-amber-500/10', 
      text: 'text-amber-500', 
      urgent: (pendingRecs ?? 0) > 0,
      adminOnly: false, // Shared
    },
    { 
      label: 'News Articles', 
      value: totalNews ?? 0, 
      icon: Newspaper, 
      href: '/admin/news', 
      bg: 'bg-teal-500/10', 
      text: 'text-teal-500', 
      urgent: false,
      adminOnly: false, // Shared
    },
    { 
      label: 'Reviews', 
      value: totalReviews ?? 0, 
      icon: Star, 
      href: '/admin/reviews', 
      bg: 'bg-amber-500/10', 
      text: 'text-amber-500', 
      urgent: false,
      adminOnly: false, // Shared
    },
    { 
      label: 'Pending Reports', 
      value: pendingReports ?? 0, 
      icon: Flag, 
      href: '/admin/reports', 
      bg: 'bg-red-500/10', 
      text: 'text-red-500', 
      urgent: (pendingReports ?? 0) > 0,
      adminOnly: false, // Shared
    },
    { 
      label: 'Affiliate Clicks', 
      value: totalAffiliateClicks ?? 0, 
      icon: ShoppingBag, 
      href: '/admin/affiliate', 
      bg: 'bg-emerald-500/10', 
      text: 'text-emerald-500', 
      urgent: false,
      adminOnly: true, // Admin only
    },
    { 
      label: 'Analytics', 
      value: 'View', 
      icon: BarChart3, 
      href: '/admin/analytics', 
      bg: 'bg-primary/10', 
      text: 'text-primary', 
      urgent: false,
      adminOnly: false, // Shared
    },
  ]

  // Filter stats based on role
  const visibleStats = allStats.filter(stat => isAdmin || !stat.adminOnly)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-lg shadow-primary/20">
          <Shield size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {isAdmin ? 'Full admin access' : 'Moderator access'}
          </p>
        </div>
      </div>

      {/* Stats grid - responsive columns based on count */}
      <div className={`grid grid-cols-2 ${visibleStats.length > 4 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-3`}>
        {visibleStats.map(({ label, value, icon: Icon, href, bg, text, urgent }) => (
          <Link
            key={label}
            href={href}
            className={`group relative overflow-hidden p-5 rounded-2xl border bg-card hover:shadow-lg transition-all duration-200 ${
              urgent ? 'border-red-500/40 bg-red-500/5' : 'border-border hover:border-primary/40'
            }`}>
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
    </div>
  )
}