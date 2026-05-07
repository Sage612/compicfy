'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Crown, Check, Zap, BookOpen,
  Bookmark, BookMarked, Star, BarChart2,
  Download, Bell, Eye, ArrowRight,
  Shield, Users, TrendingUp,
  BadgeCheck, Flame,
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
  { icon: BookOpen,   text: '50 recommendations per month' },
  { icon: Bookmark,   text: '100 saved comics'             },
  { icon: BookMarked, text: '5 reading lists'              },
  { icon: Star,       text: 'Reviews & voting'             },
  { icon: Users,      text: 'Follow other readers'         },
  { icon: Bell,       text: 'Basic notifications'          },
]

const PRO_STATUS = [
  { icon: Crown,      text: 'Exclusive 👑 Pro badge on profile'       },
  { icon: BadgeCheck, text: 'Eligible for Verified Recommender badge' },
  { icon: TrendingUp, text: 'Priority placement in Community Picks'   },
  { icon: Flame,      text: 'Early access to new features'            },
]

const PRO_POWER = [
  { icon: BookOpen,  text: 'Unlimited recommendations'      },
  { icon: Bookmark,  text: 'Unlimited saves'                },
  { icon: BarChart2, text: 'Recommendation analytics'       },
  { icon: Eye,       text: 'See who viewed your profile'    },
  { icon: Download,  text: 'Export reading lists (CSV/PDF)' },
  { icon: Zap,       text: 'Ad-free experience'             },
]

const ERROR_MESSAGES: Record<string, string> = {
  missing_reference:   'Payment reference was missing. Please try again.',
  payment_failed:      'Your payment was not completed. Please try again.',
  invalid_metadata:    'Something went wrong with your payment. Please contact support.',
  verification_failed: 'We could not verify your payment.',
}

const YEARLY_BILLED = '$29.99'

export function PricingClient({ user, profile }: Props) {
  const [billing,  setBilling]  = useState<'monthly' | 'yearly'>('yearly')
  const [loading,  setLoading]  = useState(false)
  const searchParams = useSearchParams()

  const isAdmin = profile?.role === 'admin'
  const isPro   = isAdmin || (profile?.is_pro &&
    (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))

  useEffect(() => {
    const error = searchParams.get('error')
    if (error) {
      const message = ERROR_MESSAGES[error] ?? 'Something went wrong with your payment.'
      toast.error(message, { duration: 8000 })
    }
  }, [searchParams])

  const handleUpgrade = async () => {
    if (!user) {
      window.location.href = `/signup?redirect=${encodeURIComponent('/pricing')}`
      return
    }
    setLoading(true)
    try {
      const res  = await fetch('/api/flutterwave/initialize', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan: billing }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to initialize payment')
      window.location.href = data.authorization_url
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const monthlyDisplay = billing === 'monthly' ? '$4.99' : '$2.49'

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-14">

      {/* ── Header ── */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm font-semibold">
          <Crown size={14} className="fill-amber-500" />
          Compicfy Pro
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight">
          Stand out as a{' '}
          <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            top recommender
          </span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
          Pro isn't just about removing limits, it's about the recognition,
          visibility, and tools that serious collectors deserve.
        </p>
      </div>

      {/* ── Already Pro / Admin ── */}
      {(isAdmin || isPro) && (
        <div className={cn(
          'max-w-md mx-auto p-6 rounded-2xl border text-center space-y-3 shadow-sm',
          isAdmin ? 'border-primary/30 bg-primary/5' : 'border-amber-500/30 bg-amber-500/5'
        )}>
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center mx-auto',
            isAdmin ? 'bg-primary/10' : 'bg-amber-500/10'
          )}>
            {isAdmin
              ? <Shield size={22} className="text-primary" />
              : <Crown  size={22} className="text-amber-500 fill-amber-500" />
            }
          </div>
          <p className="font-black text-lg">{isAdmin ? 'Admin Access Active' : "You're already on Pro! 👑"}</p>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? 'You have full access to all features.'
              : profile?.pro_expires_at
                ? `Active until ${new Date(profile.pro_expires_at).toLocaleDateString(undefined, { dateStyle: 'long' })}.`
                : 'Your Pro access is active.'
            }
          </p>
          <Link href={isAdmin ? '/admin' : '/pro/dashboard'}>
            <Button className="gap-2 mt-2">
              Go to Dashboard <ArrowRight size={14} />
            </Button>
          </Link>
        </div>
      )}

      {/* ── Pricing section ── */}
      {!isAdmin && !isPro && (
        <div className="space-y-10">

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setBilling('monthly')}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-semibold border transition-all',
                billing === 'monthly'
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card text-muted-foreground border-border'
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
                  : 'bg-card text-muted-foreground border-border'
              )}
            >
              Yearly
              <span className="absolute -top-2.5 -right-2.5 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black">
                -50%
              </span>
            </button>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">

            {/* Free card */}
            <div className="p-6 rounded-2xl border border-border bg-card flex flex-col">
              <div className="mb-6">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Free</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black">$0</span>
                  <span className="text-muted-foreground text-sm mb-1.5">/forever</span>
                </div>
              </div>
              <div className="space-y-3 mb-8 flex-grow">
                {FREE_FEATURES.map(f => (
                  <div key={f.text} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Check size={14} className="text-muted-foreground/50 shrink-0" />
                    {f.text}
                  </div>
                ))}
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href={user ? '/browse' : '/signup'}>
                  {user ? 'Continue Free' : 'Get Started'}
                </Link>
              </Button>
            </div>

            {/* Pro card */}
            <div className="relative p-6 rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-500/5 to-card space-y-6 shadow-xl shadow-amber-500/5 flex flex-col">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-black shadow-md">
                  ✨ RECOMMENDED
                </span>
              </div>

              {/* Price */}
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-amber-600">Pro 👑</p>
                <div className="flex items-end gap-1 mt-1">
                  <span className="text-4xl font-black">{monthlyDisplay}</span>
                  <span className="text-muted-foreground text-sm mb-1.5">/month</span>
                </div>
                {billing === 'yearly' && (
                  <p className="text-xs text-emerald-600 font-bold mt-1">
                    Billed {YEARLY_BILLED}/year · save 50% vs monthly
                  </p>
                )}
                {billing === 'monthly' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Or{' '}
                    <button onClick={() => setBilling('yearly')} className="text-emerald-600 font-bold hover:underline">
                      save 50% with yearly ({YEARLY_BILLED}/yr)
                    </button>
                  </p>
                )}
              </div>

              {/* Features */}
              <div className="space-y-4 flex-grow">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Recognition</p>
                  {PRO_STATUS.map(f => (
                    <div key={f.text} className="flex items-start gap-2.5 text-sm font-medium">
                      <Check size={14} className="text-amber-500 mt-0.5 shrink-0" />
                      {f.text}
                    </div>
                  ))}
                </div>
                <div className="h-px bg-border" />
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Power Tools</p>
                  {PRO_POWER.map(f => (
                    <div key={f.text} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                      {f.text}
                    </div>
                  ))}
                </div>
              </div>



              <Button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-400 to-orange-500 hover:opacity-90 border-0 text-white font-bold h-11"
              >
                {loading
                  ? 'Processing…'
                  : billing === 'yearly'
                  ? `Upgrade — ${YEARLY_BILLED}/year`
                  : 'Upgrade — $4.99/month'
                }
              </Button>

              <p className="text-center text-[10px] text-muted-foreground">
                Cancel anytime · Secure payment via Flutterwave
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}