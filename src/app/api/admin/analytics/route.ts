import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/utils/requireRole'

interface TimeSeriesPoint {
  date: string
  value: number
}

interface AnalyticsData {
  // Overview
  totalUsers: number
  totalRecommendations: number
  totalVotes: number
  totalSaves: number
  totalReviews: number
  
  // Time series (last 30 days)
  userGrowth: TimeSeriesPoint[]
  recommendationSubmissions: TimeSeriesPoint[]
  dailyVotes: TimeSeriesPoint[]
  dailySaves: TimeSeriesPoint[]
  
  // Content distribution
  byType: Record<string, number>
  byGenre: Record<string, number>
  byContentRating: Record<string, number>
  byStatus: Record<string, number>
  
  // User activity
  dailyActiveUsers: TimeSeriesPoint[]
  newUsersLast7Days: number
  newUsersLast30Days: number
  
  // Engagement
  totalUpvotes: number
  totalDownvotes: number
  avgVotesPerComic: number
  avgSavesPerComic: number
  
  // Moderation
  pendingApprovals: number
  approvedToday: number
  rejectedToday: number
  avgApprovalTimeHours: number | null
  
  // Top performers
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

export async function GET(request: Request) {
  // ── Auth gate ──────────────────────────────────────────────────────
  // FIX: this route had NO auth check at all — anyone, logged in or not,
  // could hit /api/admin/analytics and get full site stats (user counts,
  // growth curves, moderation queue depth, top users). requireRole(false)
  // allows admin OR moderator; pass true instead if this should be
  // admin-only.
  const auth = await requireRole(false)
  if (auth.error) return auth.error

  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') ?? '30')
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString()

    // Fetch all data in parallel
    const [
      // Counts
      { count: totalUsers },
      { count: totalRecommendations },
      { count: totalVotes },
      { count: totalSaves },
      { count: totalReviews },
      { count: pendingApprovals },
      
      // Time series data
      { data: userGrowthRaw },
      { data: recSubmissionsRaw },
      { data: dailyVotesRaw },
      { data: dailySavesRaw },
      { data: dauRaw },
      
      // Content breakdown
      { data: byTypeRaw },
      { data: byGenreRaw },
      { data: byRatingRaw },
      { data: byStatusRaw },
      
      // Engagement totals
      { count: totalUpvotes },
      { count: totalDownvotes },
      
      // Moderation today
      { count: approvedToday },
      { count: rejectedToday },
      
      // Top performers
      { data: topVotedComics },
      { data: mostActiveUsers },
      
      // New users periods
      { count: newUsersLast7Days },
      { count: newUsersLast30Days },
    ] = await Promise.all([
      // Basic counts
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('recommendations').select('*', { count: 'exact', head: true }),
      supabase.from('votes').select('*', { count: 'exact', head: true }),
      supabase.from('saves').select('*', { count: 'exact', head: true }),
      supabase.from('reviews').select('*', { count: 'exact', head: true }),
      supabase.from('recommendations').select('*', { count: 'exact', head: true }).eq('is_approved', false),
      
      // Time series - user growth by day
      (supabase.rpc as any) ('get_daily_stats', { 
        table_name: 'profiles', 
        date_column: 'member_since',
        days_back: days 
      }),
      
      // Time series - recommendations by day
      (supabase.rpc as any) ('get_daily_stats', { 
        table_name: 'recommendations', 
        date_column: 'created_at',
        days_back: days 
      }),
      
      // Time series - votes by day
      (supabase.rpc as any) ('get_daily_stats', { 
        table_name: 'votes', 
        date_column: 'created_at',
        days_back: days 
      }),
      
      // Time series - saves by day
      (supabase.rpc as any) ('get_daily_stats', { 
        table_name: 'saves', 
        date_column: 'created_at',
        days_back: days 
      }),
      
      // DAU approximation (users with activity in last 24h)
      (supabase.rpc as any) ('get_daily_active_users', { days_back: days }),
      
      // Content distribution queries
      (supabase.rpc as any) ('get_content_by_type'),
      (supabase.rpc as any) ('get_content_by_genre'),
      (supabase.rpc as any) ('get_content_by_rating'),
      (supabase.rpc as any) ('get_content_by_status'),
      
      // Engagement
      supabase.from('votes').select('*', { count: 'exact', head: true }).eq('vote_type', 'up'),
      supabase.from('votes').select('*', { count: 'exact', head: true }).eq('vote_type', 'down'),
      
      // Today's moderation
      supabase.from('recommendations').select('*', { count: 'exact', head: true })
        .eq('is_approved', true)
        .gte('reviewed_at', new Date().toISOString().split('T')[0]),
      supabase.from('recommendations').select('*', { count: 'exact', head: true })
        .not('rejection_reason', 'is', null)
        .gte('updated_at', new Date().toISOString().split('T')[0]),
      
      // Top performers
      supabase.from('recommendations')
        .select('id, title, score, author')
        .eq('is_approved', true)
        .order('score', { ascending: false })
        .limit(10),
        
      supabase.from('profiles')
        .select('id, username, total_recommendations, total_votes_received')
        .order('total_recommendations', { ascending: false })
        .limit(10),
        
      // New users periods
      supabase.from('profiles').select('*', { count: 'exact', head: true })
        .gte('member_since', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('profiles').select('*', { count: 'exact', head: true })
        .gte('member_since', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ])

    // Calculate averages safely handling potential nulls
    const safeTotalRecs = totalRecommendations ?? 0

    const avgVotesPerComic = safeTotalRecs > 0 
      ? Math.round((totalVotes ?? 0) / safeTotalRecs) 
      : 0
      
    const avgSavesPerComic = safeTotalRecs > 0 
      ? Math.round((totalSaves ?? 0) / safeTotalRecs) 
      : 0

    const data: AnalyticsData = {
      totalUsers: totalUsers ?? 0,
      totalRecommendations: totalRecommendations ?? 0,
      totalVotes: totalVotes ?? 0,
      totalSaves: totalSaves ?? 0,
      totalReviews: totalReviews ?? 0,
      
      userGrowth: userGrowthRaw ?? [],
      recommendationSubmissions: recSubmissionsRaw ?? [],
      dailyVotes: dailyVotesRaw ?? [],
      dailySaves: dailySavesRaw ?? [],
      
      byType: byTypeRaw ?? {},
      byGenre: byGenreRaw ?? {},
      byContentRating: byRatingRaw ?? {},
      byStatus: byStatusRaw ?? {},
      
      dailyActiveUsers: dauRaw ?? [],
      newUsersLast7Days: newUsersLast7Days ?? 0,
      newUsersLast30Days: newUsersLast30Days ?? 0,
      
      totalUpvotes: totalUpvotes ?? 0,
      totalDownvotes: totalDownvotes ?? 0,
      avgVotesPerComic,
      avgSavesPerComic,
      
      pendingApprovals: pendingApprovals ?? 0,
      approvedToday: approvedToday ?? 0,
      rejectedToday: rejectedToday ?? 0,
      avgApprovalTimeHours: null, // Would need more complex calculation
      
      topVotedComics: (topVotedComics ?? []).map((c: any) => ({
        id:     c.id,
        title:  c.title,
        score:  c.score ?? 0,
        author: c.author,
      })),
      mostActiveUsers: (mostActiveUsers ?? []).map((u: any) => ({
        id:              u.id,
        username:        u.username,
        recommendations: u.total_recommendations  ?? 0,
        votes:           u.total_votes_received    ?? 0,
      })),
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' }, 
      { status: 500 }
    )
  }
}
