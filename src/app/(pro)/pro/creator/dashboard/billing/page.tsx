import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BillingClient } from '@/components/pro/BillingClient'
import { PageShell, PageHeader } from '@/components/dashboard/PageHeader'
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

  const PRO_FEATURES = [
    'Deep analytics',
    'Unlimited works',
    'Audience insights',
    'Priority review',
    'Profile view tracking',
    'Creator Pro badge',
  ]

  return (
    <PageShell width="narrow">
      <PageHeader
        eyebrow="Creator"
        title="Billing"
        subtitle="Manage your Pro Creator subscription."
        backHref="/pro/creator/dashboard"
        backLabel="Dashboard"
        isPro={isPro || isAdmin}
      />

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Current plan</p>
            <p className="font-dashboard-serif text-lg text-foreground">{isAdmin ? 'Admin' : 'Pro Creator'}</p>
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? 'Lifetime access'
                : profile?.pro_expires_at
                ? `Renews ${formatDate(profile.pro_expires_at)}`
                : 'Lifetime access'}
            </p>
          </div>
          {!isAdmin && <span className="shrink-0 text-xs text-muted-foreground">Active</span>}
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-border pt-4 text-xs text-muted-foreground">
          {PRO_FEATURES.map(f => <li key={f}>{f}</li>)}
        </ul>
      </div>

      {isAdmin ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Admin accounts have lifetime Pro access, no billing required.
          </p>
        </div>
      ) : (
        <BillingClient profile={profile} subscription={subscription} email={user.email ?? ''} />
      )}
    </PageShell>
  )
}
