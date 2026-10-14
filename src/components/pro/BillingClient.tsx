'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils/format'
import { isAdmin as isAdminCheck, isModerator as isModeratorCheck, isProUser } from '@/lib/access'

interface Props {
  profile: {
    is_pro: boolean
    pro_expires_at: string | null
    role: string
  } | null
  subscription: {
    id: string
    plan: string
    status: string
    amount: number
    currency: string
    gateway: string
    started_at: string
    expires_at: string
    cancelled_at: string | null
  } | null
  email: string
}

// Rendered inside pages that already provide the page header and shell,
// so this component only renders the billing sections themselves.
export function BillingClient({ profile, subscription, email }: Props) {
  const [cancelling, setCancelling] = useState(false)
  const [cancelled,  setCancelled]  = useState(false)

  const isAdmin = profile ? isAdminCheck(profile) : false
  const isMod   = profile ? isModeratorCheck(profile) : false

  // Real Pro status only — moderator is NOT Pro (see the moderator note below).
  const isPro = profile ? isProUser(profile) : false

  const isCancelled = subscription?.status === 'cancelled' || cancelled

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your Pro subscription? You will keep access until the end of your billing period.')) return

    setCancelling(true)
    try {
      const res  = await fetch('/api/flutterwave/cancel', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to cancel subscription')
        return
      }

      setCancelled(true)
      toast.success(`Subscription cancelled. Pro access remains until ${formatDate(data.expires_at)}`)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  const priceDisplay = subscription?.plan === 'yearly' ? '$29.99' : '$4.99'
  const perLabel     = subscription?.plan === 'yearly' ? 'year'   : 'month'

  return (
    <div className="space-y-6">

      {isAdmin && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-1.5">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Admin</p>
          <p className="font-dashboard-serif text-lg text-foreground">Free Pro access</p>
          <p className="text-sm text-muted-foreground">
            You have lifetime access to all Pro features as an admin. No payment required.
          </p>
        </div>
      )}

      {!isAdmin && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">
                {isCancelled ? 'Cancelled' : isPro ? 'Active' : 'Current plan'}
              </p>
              <p className="font-dashboard-serif text-lg text-foreground">
                {isPro ? `Pro ${subscription?.plan === 'yearly' ? '(Yearly)' : '(Monthly)'}` : 'Free plan'}
              </p>
              <p className="text-sm text-muted-foreground truncate">{email}</p>
              {subscription?.gateway && (
                <p className="text-xs text-muted-foreground capitalize">via {subscription.gateway}</p>
              )}
            </div>

            {isPro && (
              <div className="text-right shrink-0">
                <p className="font-dashboard-serif text-2xl text-foreground tabular-nums">{priceDisplay}</p>
                <p className="text-xs text-muted-foreground">per {perLabel}</p>
              </div>
            )}
          </div>

          {subscription && (subscription.started_at || subscription.expires_at) && (
            <dl className="grid grid-cols-2 gap-4 border-t border-border pt-4">
              {subscription.started_at && (
                <div className="space-y-0.5">
                  <dt className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Started</dt>
                  <dd className="text-sm text-foreground">{formatDate(subscription.started_at)}</dd>
                </div>
              )}
              {subscription.expires_at && (
                <div className="space-y-0.5">
                  <dt className="text-[11px] uppercase tracking-widest text-muted-foreground/70">
                    {isCancelled ? 'Access until' : 'Next renewal'}
                  </dt>
                  <dd className="text-sm text-foreground">{formatDate(subscription.expires_at)}</dd>
                </div>
              )}
            </dl>
          )}

          {isCancelled && (
            <p className="border-t border-border pt-4 text-xs text-muted-foreground leading-relaxed">
              Your subscription is cancelled but Pro access remains active until{' '}
              <span className="text-foreground">{formatDate(subscription?.expires_at ?? '')}</span>.
              After that you&apos;ll be moved to the free plan.
            </p>
          )}

          {isPro && !isCancelled && (
            <div className="border-t border-border pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={cancelling}
                className="text-destructive border-destructive/30 hover:bg-destructive/5"
              >
                {cancelling ? 'Cancelling…' : 'Cancel subscription'}
              </Button>
            </div>
          )}

          {!isPro && (
            <Button asChild size="sm" className="w-full">
              <Link href="/pricing">Upgrade to Pro</Link>
            </Button>
          )}
        </div>
      )}

      {/* Moderators are NOT Pro but get specific unlimited perks */}
      {isMod && !isPro && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-1.5">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Moderator</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            As a moderator you get unlimited recommendations, lists, and saves for free.
            Upgrading to Pro additionally unlocks analytics, export, and profile view tracking.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5 space-y-1">
        <p className="font-dashboard-serif text-base text-foreground">Need help?</p>
        <p className="text-xs text-muted-foreground">
          For billing issues, email{' '}
          <a href="mailto:support@compicfy.com" className="text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors">
            support@compicfy.com
          </a>
        </p>
      </div>

    </div>
  )
}
