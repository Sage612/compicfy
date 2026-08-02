import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BillingClient } from '@/components/pro/BillingClient'
import { Palette, CheckCircle2, Sparkles, CreditCard } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { isAdmin as isAdminCheck, isProUser, canAccessProDashboard } from '@/lib/access'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Billing · Pro Creator' }

export default async function ProCreatorBillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_pro, pro_expires_at, is_patron, patron_expires_at, role, email')
    .eq('id', user.id)
    .single() as { data: any }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, plan, status, amount, currency, gateway, started_at, expires_at, cancelled_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single() as { data: any }

  const isAdmin = isAdminCheck(profile ?? { role: '' })
  const isPro   = isProUser(profile ?? { role: '', is_pro: false, pro_expires_at: null })

  if (!canAccessProDashboard(profile ?? { role: '', is_pro: false, pro_expires_at: null })) {
    redirect('/pricing?reason=pro_required')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
          <CreditCard size={16} className="text-teal-500" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight">Billing</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage your Pro Creator subscription.</p>
        </div>
      </div>

      {/* Plan card */}
      <div className="relative overflow-hidden rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-transparent p-5 space-y-4">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
              <Palette size={18} className="text-white" />
            </div>
            <div>
              <p className="font-black text-sm">{isAdmin ? 'Admin' : 'Pro Creator'}</p>
              <p className="text-xs text-muted-foreground">
                {isAdmin
                  ? 'Lifetime access'
                  : profile?.pro_expires_at
                  ? `Renews ${formatDate(profile.pro_expires_at)}`
                  : 'Lifetime access'}
              </p>
            </div>
          </div>
          {!isAdmin && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-500/15 text-teal-600 text-xs font-black border border-teal-500/20">
              <Sparkles size={10} />Active
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {['Deep analytics', 'Unlimited works', 'Audience insights', 'Priority review', 'Profile view tracking', 'Creator Pro badge'].map(f => (
            <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 size={12} className="text-teal-500 shrink-0" />{f}
            </div>
          ))}
        </div>
      </div>

      {isAdmin ? (
        <div className="p-4 rounded-2xl border border-border bg-muted/30 text-center">
          <p className="text-xs text-muted-foreground">
            Admin accounts have lifetime Pro access, no billing required.
          </p>
        </div>
      ) : (
        <BillingClient profile={profile} subscription={subscription} email={user.email ?? ''} />
      )}
    </div>
  )
}