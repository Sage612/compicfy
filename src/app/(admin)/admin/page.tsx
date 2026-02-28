import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin Dashboard' }

export default async function AdminPage() {
  const supabase = await createClient()

  const [
    { count: totalUsers },
    { count: totalRecs },
    { count: pendingRecs },
    { count: totalNews },
    { count: totalReviews },
    { count: pendingReports },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('recommendations').select('*', { count: 'exact', head: true }),
    supabase.from('recommendations').select('*', { count: 'exact', head: true }).eq('is_approved', false),
    supabase.from('news').select('*', { count: 'exact', head: true }),
    supabase.from('reviews').select('*', { count: 'exact', head: true }),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const stats = [
    { label: 'Total Users', value: totalUsers ?? 0, emoji: '👥' },
    { label: 'Recommendations', value: totalRecs ?? 0, emoji: '📚' },
    { label: 'Pending Approval', value: pendingRecs ?? 0, emoji: '⏳', urgent: (pendingRecs ?? 0) > 0 },
    { label: 'News Articles', value: totalNews ?? 0, emoji: '📰' },
    { label: 'Reviews', value: totalReviews ?? 0, emoji: '⭐' },
    { label: 'Pending Reports', value: pendingReports ?? 0, emoji: '🚩', urgent: (pendingReports ?? 0) > 0 },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage Compicfy content and users
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map(({ label, value, emoji, urgent }) => (
          <div
            key={label}
            className={`p-5 rounded-xl border bg-card space-y-2 ${
              urgent ? 'border-destructive/50 bg-destructive/5' : 'border-border'
            }`}
          >
            <span className="text-2xl">{emoji}</span>
            <p className={`text-3xl font-bold ${urgent ? 'text-destructive' : ''}`}>
              {value}
            </p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}