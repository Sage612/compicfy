'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Crown, Check, Sparkles, Zap, BookOpen,
  Bookmark, BookMarked, Filter, Star,
  BarChart2, Download, Bell, Eye,
  Palette, ArrowRight, Shield,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'

interface Props {
  user: User | null
  profile: {
    is_pro: boolean
    pro_expires_at: string | null
    role: string
    recommendation_count_this_month: number
    total_saves: number
  } | null
}

const FREE_FEATURES = [
  { icon: BookOpen,   text: '30 recommendations per month'    },
  { icon: Bookmark,   text: '50 saved comics'                 },
  { icon: BookMarked, text: '3 reading lists'                 },
  { icon: Star,       text: 'Reviews & voting'                },
  { icon: Bell,       text: 'Basic notifications'             },
]

const PRO_FEATURES = [
  { icon: BookOpen,   text: 'Unlimited recommendations',        highlight: false },
  { icon: Bookmark,   text: 'Unlimited saves',                  highlight: false },
  { icon: BookMarked, text: 'Unlimited reading lists',          highlight: false },
  { icon: Filter,     text: 'Advanced filters',                 highlight: false },
  { icon: Star,       text: 'Priority review approval',         highlight: false },
  { icon: Zap,        text: 'Ad-free experience',               highlight: false },
  { icon: Crown,      text: 'Exclusive 👑 Pro badge',           highlight: true  },
  { icon: BarChart2,  text: 'Recommendation analytics',         highlight: true  },
  { icon: Eye,        text: 'See who viewed your profile',      highlight: true  },
  { icon: Download,   text: 'Export reading lists (CSV/PDF)',   highlight: true  },
  { icon: Palette,    text: 'Custom profile themes',            highlight: true  },
  { icon: Bell,       text: 'Full notification control',        highlight: false },
  { icon: Shield,     text: 'Premium news access',              highlight: false },
]

export function PricingClient({ user, profile }: Props) {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly')
  const [loading, setLoading] = useState(false)

  const isAdmin = profile?.role === 'admin'
  const isMod = profile?.role === 'moderator'
  const isPro = profile?.is_pro &&
    (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date())

  const handleUpgrade = async () => {
    if (!user) {
      window.location.href = '/signup?redirect=/pricing'
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: billing }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to initialize payment')
        return
      }

      // Redirect to Paystack checkout
      window.location.href = data.authorization_url
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">

      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm font-semibold">
          <Crown size={14} className="fill-amber-500" />
          Compicfy Pro
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight">
          Unlock the full{' '}
          <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Compicfy
          </span>{' '}
          experience
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
          Unlimited recommendations, analytics, custom themes and more. Cancel anytime.
        </p>
      </div>

      {/* Already Pro / Admin / Mod state */}
      {isAdmin && (
        <div className="max-w-md mx-auto p-6 rounded-2xl border border-primary/30 bg-primary/5 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
            <Shield size={22} className="text-primary" />
          </div>
          <p className="font-black text-lg">You're an Admin</p>
          <p className="text-sm text-muted-foreground">
            You have free access to all Pro features and more. No payment needed.
          </p>
          <Link href="/dashboard">
            <Button variant="outline" className="gap-2 mt-2">
              Go to Dashboard <ArrowRight size={14} />
            </Button>
          </Link>
        </div>
      )}

      {!isAdmin && isPro && (
        <div className="max-w-md mx-auto p-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto">
            <Crown size={22} className="text-amber-500 fill-amber-500" />
          </div>
          <p className="font-black text-lg">You're already on Pro! 👑</p>
          <p className="text-sm text-muted-foreground">
            {profile?.pro_expires_at
              ? `Your Pro access is active until ${new Date(profile.pro_expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`
              : 'Your Pro access is active.'}
          </p>
          <div className="flex gap-2 justify-center pt-1">
            <Link href="/dashboard/billing">
              <Button variant="outline" size="sm">Manage Billing</Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 border-0 text-white">
                Dashboard <ArrowRight size={13} />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {!isAdmin && !isPro && (
        <>
          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setBilling('monthly')}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-semibold border transition-all',
                billing === 'monthly'
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground'
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={cn(
                'relative px-4 py-2 rounded-xl text-sm font-semibold border transition-all',
                billing === 'yearly'
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground'
              )}
            >
              Yearly
              <span className="absolute -top-2.5 -right-2.5 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black">
                -33%
              </span>
            </button>
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">

            {/* Free card */}
            <div className="p-6 rounded-2xl border border-border bg-card space-y-6">
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Free</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black">$0</span>
                  <span className="text-muted-foreground text-sm mb-1.5">/forever</span>
                </div>
                <p className="text-sm text-muted-foreground">Perfect for casual readers</p>
              </div>

              <div className="space-y-2.5">
                {FREE_FEATURES.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Check size={11} />
                    </div>
                    {text}
                  </div>
                ))}
              </div>

              {user ? (
                <Link href="/browse">
                  <Button variant="outline" className="w-full">
                    Continue with Free
                  </Button>
                </Link>
              ) : (
                <Link href="/signup">
                  <Button variant="outline" className="w-full">
                    Sign up free
                  </Button>
                </Link>
              )}
            </div>

            {/* Pro card */}
            <div className="relative p-6 rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-500/5 to-transparent space-y-6 shadow-xl shadow-amber-500/10">
              {/* Popular badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-black shadow-md">
                  ✨ Most Popular
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-black uppercase tracking-widest text-amber-600">Pro</p>
                  <Crown size={12} className="text-amber-500 fill-amber-500" />
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black">
                    {billing === 'monthly' ? '$4.99' : '$3.33'}
                  </span>
                  <span className="text-muted-foreground text-sm mb-1.5">/month</span>
                </div>
                {billing === 'yearly' && (
                  <p className="text-xs text-emerald-600 font-semibold">
                    Billed $39.99/year — save $19.89
                  </p>
                )}
                <p className="text-sm text-muted-foreground">For serious comic fans</p>
              </div>

              <div className="space-y-2.5">
                {PRO_FEATURES.map(({ icon: Icon, text, highlight }) => (
                  <div key={text} className={cn(
                    'flex items-center gap-2.5 text-sm',
                    highlight ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}>
                    <div className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                      highlight ? 'bg-amber-500/20' : 'bg-emerald-500/15'
                    )}>
                      <Check size={11} className={highlight ? 'text-amber-500' : 'text-emerald-500'} />
                    </div>
                    {text}
                  </div>
                ))}
              </div>

              <Button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full gap-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:opacity-90 border-0 text-white font-bold shadow-lg shadow-amber-500/20 h-11"
              >
                {loading ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Sparkles size={15} />
                    {user ? `Upgrade to Pro` : 'Get Pro'}
                    <ArrowRight size={14} />
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Cancel anytime · Secure payment via Paystack
              </p>
            </div>
          </div>

          {/* Mod note */}
          {isMod && (
            <p className="text-center text-xs text-muted-foreground">
              As a moderator, you already have most Pro features for free.
              Upgrading unlocks custom themes, analytics, and profile views.
            </p>
          )}
        </>
      )}

      {/* FAQ */}
      <div className="max-w-2xl mx-auto space-y-4">
        <h2 className="text-xl font-black text-center">Frequently asked questions</h2>
        <div className="space-y-3">
          {[
            {
              q: 'Can I cancel anytime?',
              a: 'Yes. You can cancel your subscription at any time from your billing page. Your Pro access remains active until the end of your billing period.',
            },
            {
              q: 'What payment methods are supported?',
              a: 'We accept all major credit and debit cards via Paystack. More payment options coming soon.',
            },
            {
              q: 'What happens to my data if I downgrade?',
              a: 'Your data is never deleted. If you go back to free, you keep everything you created. You just lose access to Pro features until you resubscribe.',
            },
            {
              q: 'Do admins and moderators need to pay?',
              a: 'Admins get all Pro features completely free. Moderators get most Pro features free, but need a paid subscription for analytics, custom themes, and profile views.',
            },
            {
              q: 'Is there a refund policy?',
              a: 'If you have an issue with your subscription, contact us at support@compicfy.cloud and we will sort it out.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="p-4 rounded-2xl border border-border bg-card space-y-1.5">
              <p className="font-black text-sm">{q}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}