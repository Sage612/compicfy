import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BillingClient } from '@/components/pro/BillingClient'
import { PageShell, PageHeader } from '@/components/dashboard/PageHeader'
import { formatDate } from '@/lib/utils/format'
import { isAdmin as isAdminCheck, isProUser, canAccessProDashboard } from '@/lib/access'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Billing | Pro' }

const PRO_FEATURES = [
  'Unlimited recommendations',
  'Analytics dashboard',
  'Export reading lists',
  'Leaderboard access',
  'Priority review queue',
  'Profile view tracking',
]

export default async function ProReaderBillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_pro, pro_expires_at, is_patron, patron_expires_at, role')
    .eq('id', user.id)
    .single() as { data: any }

  const isAdmin = isAdminCheck(profile ?? { role: '' })
  const isPro   = isProUser(profile ?? { role: '', is_pro: false, pro_expires_at: null })

  if (!canAccessProDashboard(profile ?? { role: '', is_pro: false, pro_expires_at: null })) {
    redirect('/pricing?reason=pro_required')
  }

  // maybeSingle — no subscription row is valid (admin / grandfathered access)
  const { data: subscription } = await (supabase as any)
    .from('subscriptions')
    .select('id, plan, status, amount, currency, gateway, started_at, expires_at, cancelled_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <PageShell width="narrow">
      <PageHeader
        title="Billing"
        eyebrow="Account"
        subtitle="Manage your Pro subscription."
        backHref="/pro/reader/dashboard"
        backLabel="Dashboard"
        isPro
      />

      {/* Status */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Current plan</p>
        <dl className="space-y-2 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">Plan</dt>
            <dd className="font-dashboard-serif text-base text-foreground">{isAdmin ? 'Admin' : 'Pro Reader'}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">Term</dt>
            <dd className="text-foreground">
              {isAdmin
                ? 'Lifetime access'
                : profile?.pro_expires_at
                ? `Active until ${formatDate(profile.pro_expires_at)}`
                : 'Lifetime access'}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="text-foreground">Active</dd>
          </div>
        </dl>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-border pt-4 text-xs text-muted-foreground">
          {PRO_FEATURES.map(f => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>

      {!isAdmin && (
        <BillingClient
          profile={profile}
          subscription={subscription}
          email={user.email ?? ''}
        />
      )}
    </PageShell>
  )
}
