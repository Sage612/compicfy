'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Crown, CreditCard, AlertTriangle, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

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

export function BillingClient({ profile, subscription, email }: Props) {
  const [cancelling, setCancelling] = useState(false)
  const [cancelled,  setCancelled]  = useState(false)

  const isAdmin = profile?.role === 'admin'
  const isMod   = profile?.role === 'moderator'

  const isPro = isAdmin ||
    (profile?.is_pro &&
      (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))

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

  // Correct price display based on plan
  const priceDisplay = subscription?.plan === 'yearly' ? '$29.99' : '$4.99'
  const perLabel     = subscription?.plan === 'yearly' ? 'year'   : 'month'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <CreditCard size={16} className="text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Billing</h1>
        </div>
        <p className="text-muted-foreground text-sm pl-0.5">
          Manage your subscription and billing details
        </p>
      </div>

      {/* Admin — lifetime free access */}
      {isAdmin && (
        <div className="p-5 rounded-2xl border border-primary/30 bg-primary/5 space-y-2">
          <div className="flex items-center gap-2">
            <Crown size={16} className="text-primary fill-primary/20" />
            <p className="font-black text-sm">Admin — Free Pro Access</p>
          </div>
          <p className="text-sm text-muted-foreground">
            You have lifetime free access to all Pro features as an admin. No payment required.
          </p>
        </div>
      )}

      {/* Non-admin billing section */}
      {!isAdmin && (
        <div className={cn(
          'p-5 rounded-2xl border space-y-4',
          isPro ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-card'
        )}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {isPro && <Crown size={15} className="text-amber-500 fill-amber-500" />}
                <p className="font-black">
                  {isPro
                    ? `Pro ${subscription?.plan === 'yearly' ? '(Yearly)' : '(Monthly)'}`
                    : 'Free Plan'}
                </p>
                {isCancelled && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 font-semibold">
                    Cancelled
                  </span>
                )}
                {isPro && !isCancelled && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-semibold">
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{email}</p>
              {subscription?.gateway && (
                <p className="text-xs text-muted-foreground capitalize">
                  via {subscription.gateway}
                </p>
              )}
            </div>

            {isPro && !isAdmin && (
              <div className="text-right shrink-0">
                <p className="font-black text-lg">{priceDisplay}</p>
                <p className="text-xs text-muted-foreground">per {perLabel}</p>
              </div>
            )}
          </div>

          {/* Dates */}
          {subscription && (
            <div className="grid grid-cols-2 gap-3">
              {subscription.started_at && (
                <div className="p-3 rounded-xl bg-background border border-border space-y-0.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Started</p>
                  <p className="text-sm font-semibold">{formatDate(subscription.started_at)}</p>
                </div>
              )}
              {subscription.expires_at && (
                <div className="p-3 rounded-xl bg-background border border-border space-y-0.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    {isCancelled ? 'Access until' : 'Next renewal'}
                  </p>
                  <p className="text-sm font-semibold">{formatDate(subscription.expires_at)}</p>
                </div>
              )}
            </div>
          )}

          {/* Cancel button */}
          {isPro && !isCancelled && (
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={cancelling}
                className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
              >
                <AlertTriangle size={13} />
                {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
              </Button>
            </div>
          )}

          {/* Cancelled notice */}
          {isCancelled && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your subscription is cancelled but Pro access remains active until{' '}
                <strong className="text-foreground">{formatDate(subscription?.expires_at ?? '')}</strong>.
                After that you'll be moved to the free plan.
              </p>
            </div>
          )}

          {/* Upgrade button */}
          {!isPro && !isAdmin && (
            <Link href="/pricing">
              <Button className="gap-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:opacity-90 border-0 text-white w-full">
                <Sparkles size={14} />
                Upgrade to Pro
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Mod note */}
      {isMod && !isPro && (
        <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 space-y-1.5">
          <div className="flex items-center gap-2">
            <Crown size={14} className="text-blue-500" />
            <p className="font-black text-sm text-blue-600">Moderator Perks</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            You already have most Pro features for free as a moderator.
            Upgrading unlocks recommendation analytics, and profile view tracking.
          </p>
        </div>
      )}

      {/* Support */}
      <div className="p-4 rounded-2xl border border-border bg-card space-y-1.5">
        <p className="font-black text-sm">Need help?</p>
        <p className="text-xs text-muted-foreground">
          For billing issues, email us at{' '}
          <a href="mailto:support@compicfy.cloud" className="text-primary hover:underline font-medium">
            support@compicfy.cloud
          </a>
        </p>
      </div>

    </div>
  )
}