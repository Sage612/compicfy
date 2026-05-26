import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BillingClient } from '@/components/pro/BillingClient'
import { Crown, Sparkles, CheckCircle2 } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Billing | Pro' }

export default async function ProReaderBillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_pro, pro_expires_at, role')
    .eq('id', user.id)
    .single() as { data: any }

  const isAdmin = ['admin', 'moderator'].includes(profile?.role ?? '')
  const isPro   = isAdmin || (profile?.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))

  if (!isPro) redirect('/pricing')

  // maybeSingle — no subscription row is valid (admin / grandfathered access)
  const { data: subscription } = await (supabase as any)
    .from('subscriptions')
    .select('id, plan, status, amount, currency, gateway, started_at, expires_at, cancelled_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
          <Crown size={20} className="text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">Manage your Pro subscription</p>
        </div>
      </div>

      {/* Status card */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-6 space-y-4">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
            <Crown size={18} className="text-white" />
          </div>
          <div>
            <p className="font-black text-sm">{isAdmin ? 'Admin' : 'Pro Reader'}</p>
            <p className="text-xs text-muted-foreground">
              {isAdmin
                ? 'Lifetime access'
                : profile?.pro_expires_at
                ? `Active until ${formatDate(profile.pro_expires_at)}`
                : 'Lifetime access'}
            </p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 text-xs font-black border border-amber-500/20">
            <Sparkles size={10} />Active
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2">
          {['Unlimited recommendations','Analytics dashboard','Export reading lists','Leaderboard access','Priority review queue','Profile view tracking'].map(f => (
            <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 size={12} className="text-amber-500 shrink-0" />{f}
            </div>
          ))}
        </div>
      </div>

      {!isAdmin && (
        <BillingClient
          profile={profile}
          subscription={subscription}
          email={user.email ?? ''}
        />
      )}
    </div>
  )
}