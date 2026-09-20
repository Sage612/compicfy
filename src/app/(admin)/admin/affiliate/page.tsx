import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AffiliateAnalytics } from '@/components/admin/AffiliateAnalytics'
import { Link2 } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Affiliate Analytics' }

export default async function AffiliateAnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'moderator'].includes(profile.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Link2 size={17} className="text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Affiliate Analytics</h1>
        </div>
        <p className="text-muted-foreground text-sm pl-0.5">Track affiliate link clicks and platform performance</p>
      </div>
      <AffiliateAnalytics />
    </div>
  )
}