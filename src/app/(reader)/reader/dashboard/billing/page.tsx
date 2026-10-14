import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BillingClient } from '@/components/pro/BillingClient'
import { Button } from '@/components/ui/button'
import { PageShell, PageHeader } from '@/components/dashboard/PageHeader'
import { formatDate } from '@/lib/utils/format'
import type { Metadata } from 'next'
import { isAdmin as isAdminCheck, isProUser } from '@/lib/access'

export const metadata: Metadata = { title: 'Billing' }

const PRO_FEATURES = [
  'Unlimited recommendations',
  'Analytics dashboard',
  'Export reading lists',
  'Leaderboard access',
  'Priority review queue',
  'Profile view tracking',
]

const UPGRADE_FEATURES = [
  'Unlimited submissions',
  'Reading analytics',
  'Export to CSV/PDF',
  'Leaderboard rank',
]

export default async function ReaderBillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_pro, pro_expires_at, is_patron, patron_expires_at, role, username, email')
    .eq('id', user.id)
    .single() as { data: any }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, plan, status, amount, currency, gateway, started_at, expires_at, cancelled_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single() as { data: any }

  const isAdmin = profile ? isAdminCheck(profile) : false
  const isPro   = profile ? isProUser(profile) : false

  const planName = isAdmin ? 'Admin' : isPro ? 'Pro Reader' : 'Free'
  const planNote = isAdmin
    ? 'Lifetime access'
    : isPro
    ? profile?.pro_expires_at
      ? `Renews ${formatDate(profile.pro_expires_at)}`
      : 'Lifetime access'
    : 'Limited features'

  return (
    <PageShell width="narrow">
      <PageHeader
        title="Billing"
        eyebrow="Account"
        subtitle="Manage your subscription and payments."
        backHref="/reader/dashboard"
        backLabel="Dashboard"
      />

      {/* Current plan */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Current plan</p>
        <dl className="space-y-2 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">Plan</dt>
            <dd className="font-dashboard-serif text-base text-foreground">{planName}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">{isPro || isAdmin ? 'Term' : 'Includes'}</dt>
            <dd className="text-foreground">{planNote}</dd>
          </div>
          {isPro && !isAdmin && (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="text-foreground">Active</dd>
            </div>
          )}
        </dl>

        {isPro && (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-border pt-4 text-xs text-muted-foreground">
            {PRO_FEATURES.map(feature => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        )}
      </div>

      {!isPro && !isAdmin && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="space-y-1">
            <h2 className="font-dashboard-serif text-lg text-foreground">Upgrade to Pro Reader</h2>
            <p className="text-xs text-muted-foreground">Unlock unlimited recommendations, analytics, and more.</p>
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {UPGRADE_FEATURES.map(f => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <Button asChild size="sm">
            <Link href="/pricing">Upgrade to Pro</Link>
          </Button>
        </div>
      )}

      {isPro && !isAdmin && <BillingClient profile={profile} subscription={subscription} email={user.email ?? ''} />}
    </PageShell>
  )
}
