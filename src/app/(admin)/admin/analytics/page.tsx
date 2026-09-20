import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard'
import { BarChart3 } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Analytics' }

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Analytics available to both admin and moderator
  if (!profile || !['admin', 'moderator'].includes(profile.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-lg shadow-primary/20">
            <BarChart3 size={17} className="text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Analytics</h1>
        </div>
        <p className="text-muted-foreground text-sm pl-0.5">Platform insights and metrics</p>
      </div>

      {/* Dashboard */}
      <AnalyticsDashboard />
    </div>
  )
}