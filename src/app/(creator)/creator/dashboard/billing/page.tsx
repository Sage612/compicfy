import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BillingClient } from '@/components/pro/BillingClient'
import { Button } from '@/components/ui/button'
import {
  Crown, Zap, CheckCircle2, ArrowRight,
  Palette, Sparkles,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { isAdmin as isAdminCheck, isProUser } from '@/lib/access'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Billing' }

export default async function CreatorBillingPage() {
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

  const PRO_FEATURES = [
    'Deep analytics',
    'Unlimited works',
    'Audience insights',
    'Priority review queue',
    'Profile view tracking',
    'Creator badge',
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight">Billing</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Manage your creator subscription.</p>
      </div>

      {/* Current plan card */}
      <div className={`relative overflow-hidden rounded-2xl border p-5 space-y-4 ${
        isPro
          ? 'border-teal-500/30 bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-transparent'
          : 'border-border bg-card'
      }`}>
        {isPro && <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isPro ? 'bg-gradient-to-br from-teal-400 to-cyan-500' : 'bg-muted'
            }`}>
              {isPro ? <Palette size={18} className="text-white" /> : <Zap size={18} className="text-muted-foreground" />}
            </div>
            <div>
              <p className="font-black text-sm">{isAdmin ? 'Admin' : isPro ? 'Pro Creator' : 'Free Creator'}</p>
              <p className="text-xs text-muted-foreground">
                {isAdmin
                  ? 'Lifetime access'
                  : isPro
                  ? profile?.pro_expires_at ? `Renews ${formatDate(profile.pro_expires_at)}` : 'Lifetime access'
                  : 'Limited features — upgrade to unlock more'}
              </p>
            </div>
          </div>
          {isPro && !isAdmin && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-500/15 text-teal-600 text-xs font-black border border-teal-500/20 shrink-0">
              <Sparkles size={10} />Active
            </span>
          )}
          {!isPro && !isAdmin && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold border border-border shrink-0">
              Free
            </span>
          )}
        </div>

        {isPro && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            {PRO_FEATURES.map(f => (
              <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 size={12} className="text-teal-500 shrink-0" />{f}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Free user — upgrade CTA */}
      {!isPro && !isAdmin && (
        <div className="rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-500/5 to-transparent p-5 space-y-4">
          <div>
            <p className="font-black text-sm text-teal-700 dark:text-teal-400">Upgrade to Pro Creator</p>
            <p className="text-xs text-muted-foreground mt-1">
              Unlock deep analytics, audience insights, and more tools to grow your audience.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PRO_FEATURES.map(f => (
              <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 size={11} className="text-teal-500 shrink-0" />{f}
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Link href="/pricing" className="flex-1">
              <Button className="w-full gap-2 bg-teal-500 hover:bg-teal-600 border-0 text-white">
                <Crown size={14} />Upgrade to Pro Creator<ArrowRight size={13} />
              </Button>
            </Link>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Already subscribed?{' '}
            <Link href="/pricing" className="text-teal-500 hover:underline">
              Restore your subscription
            </Link>
          </p>
        </div>
      )}

      {/* Pro user — billing management */}
      {isPro && !isAdmin && (
        <BillingClient
          profile={profile}
          subscription={subscription}
          email={user.email ?? ''}
        />
      )}

      {/* Admin — no billing needed */}
      {isAdmin && (
        <div className="p-4 rounded-2xl border border-border bg-muted/30 text-center">
          <p className="text-xs text-muted-foreground">
            Admin accounts have lifetime Pro access, no billing required.
          </p>
        </div>
      )}
    </div>
  )
}