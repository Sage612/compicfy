'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Crown, Check, Zap, BookOpen,
  Bookmark, BookMarked, Star, BarChart2,
  Download, Bell, ArrowRight,
  Shield, Users, BadgeCheck, Flame,
  Palette, Lock, Sparkles, Loader2, CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useEffect } from 'react'
import type { User } from '@supabase/supabase-js'

interface Props {
  user: User | null
  profile: {
    is_pro: boolean
    pro_expires_at: string | null
    role: string
    recommendation_count_this_month: number
    total_saves: number
    user_type?: string
  } | null
}

const READER_FREE = [
  { icon: BookOpen,   text: '50 recommendations per month' },
  { icon: Bookmark,   text: '100 saved comics'             },
  { icon: BookMarked, text: '5 reading lists'              },
  { icon: Star,       text: 'Reviews & voting'             },
  { icon: Users,      text: 'Follow other readers'         },
  { icon: Bell,       text: 'Basic notifications'          },
]

const CREATOR_FREE = [
  { icon: BookOpen,   text: 'Submit your works'            },
  { icon: Users,      text: 'Build your audience'          },
  { icon: Bookmark,   text: 'Patreon & Kickstarter links'  },
  { icon: Star,       text: 'Community reviews'            },
  { icon: Bell,       text: 'Basic notifications'          },
]

const PRO_STATUS = [
  { icon: Crown,      text: 'Exclusive 👑 Pro badge on profile'   },
  { icon: BadgeCheck, text: 'Eligible for Verified badge'         },
  { icon: Flame,      text: 'Early access to new features'        },
]

const READER_PRO_POWER = [
  { icon: BookOpen,  text: 'Unlimited recommendations'      },
  { icon: Bookmark,  text: 'Unlimited saves'                },
  { icon: BarChart2, text: 'Recommendation analytics'       },
  { icon: Download,  text: 'Export reading lists (CSV/PDF)' },
  { icon: Zap,       text: 'Priority support'               },
]

const CREATOR_PRO_POWER = [
  { icon: Palette,   text: 'Deep audience analytics'        },
  { icon: BarChart2, text: 'Per-work performance data'      },
  { icon: Users,     text: 'Follower growth tracking'       },
  { icon: Zap,       text: 'Priority review queue'          },
  { icon: Crown,     text: 'Creator Pro badge'              },
]

const YEARLY_BILLED     = '$29.99'
const MONTHLY_PRICE     = '$4.99'
const EFFECTIVE_MONTHLY = '$2.49'

export function PricingClient({ user, profile }: Props) {
  const [email,     setEmail]     = useState(user?.email ?? '')
  const [joining,   setJoining]   = useState(false)
  const [joined,    setJoined]    = useState(false)
  const searchParams               = useSearchParams()

  const isAdmin   = profile?.role === 'admin'
  const isPro     = isAdmin || (profile?.is_pro &&
    (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
  const isCreator = profile?.user_type === 'creator'

  useEffect(() => {
    const error = searchParams.get('error')
    if (error) {
      const messages: Record<string, string> = {
        missing_reference:   'Payment reference was missing. Please try again.',
        payment_failed:      'Your payment was not completed. Please try again.',
        invalid_metadata:    'Something went wrong with your payment. Contact support.',
        verification_failed: 'We could not verify your payment.',
      }
      toast.error(messages[error] ?? 'Something went wrong.', { duration: 8000 })
    }
  }, [searchParams])

  const handleWaitlist = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email')
      return
    }
    setJoining(true)
    try {
      const res = await fetch('/api/pro/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error()
      setJoined(true)
      toast.success("You're on the list! Check your email.")
    } catch {
      toast.error('Something went wrong. Try again.')
    } finally {
      setJoining(false)
    }
  }

  const freeFeatures  = isCreator ? CREATOR_FREE  : READER_FREE
  const proPower      = isCreator ? CREATOR_PRO_POWER : READER_PRO_POWER

  const heroTitle = isCreator
    ? <>Grow your <span className="text-teal-500">creator studio</span></>
    : <>Stand out as a <span className="text-amber-500">top recommender</span></>

  const heroSub = isCreator
    ? 'Pro gives creators deep analytics, audience insights, and the tools to grow their readership.'
    : "Pro isn't just about removing limits it's the recognition, visibility, and tools that serious collectors deserve."

  const dashboardHref = isAdmin
    ? '/admin'
    : isPro
    ? isCreator ? '/pro/creator/dashboard' : '/pro/reader/dashboard'
    : isCreator ? '/creator/dashboard'     : '/reader/dashboard'

  const accentTeal  = isCreator
  const accentColor = accentTeal ? 'text-teal-500' : 'text-amber-500'
  const accentBg    = accentTeal ? 'bg-teal-500/10 border-teal-500/20 text-teal-600' : 'bg-amber-500/10 border-amber-500/20 text-amber-600'
  const accentGrad  = accentTeal
    ? 'bg-gradient-to-r from-teal-400 to-cyan-500'
    : 'bg-gradient-to-r from-amber-400 to-orange-500'
  const accentBorder = accentTeal ? 'border-teal-500/40' : 'border-amber-500/40'
  const accentCardBg = accentTeal ? 'from-teal-500/5' : 'from-amber-500/5'
  const checkColor   = accentTeal ? 'text-teal-500' : 'text-amber-500'

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-14">

      {/* Header */}
      <div className="text-center space-y-4">
        <div className={cn(
          'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold border',
          accentBg
        )}>
          {isCreator ? <Palette size={14} /> : <Crown size={14} className="fill-amber-500" />}
          Compicfy Pro
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight">{heroTitle}</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">{heroSub}</p>
      </div>

      {/* Already Pro / Admin */}
      {(isAdmin || isPro) && (
        <div className={cn(
          'max-w-md mx-auto p-6 rounded-2xl border text-center space-y-3 shadow-sm',
          isAdmin   ? 'border-primary/30 bg-primary/5'   :
          isCreator ? 'border-teal-500/30 bg-teal-500/5' :
                      'border-amber-500/30 bg-amber-500/5'
        )}>
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center mx-auto',
            isAdmin ? 'bg-primary/10' : isCreator ? 'bg-teal-500/10' : 'bg-amber-500/10'
          )}>
            {isAdmin
              ? <Shield size={22} className="text-primary" />
              : isCreator
              ? <Palette size={22} className="text-teal-500" />
              : <Crown   size={22} className="text-amber-500 fill-amber-500" />
            }
          </div>
          <p className="font-black text-lg">
            {isAdmin ? 'Admin Access Active' : `You're already on Pro! ${isCreator ? '🎨' : '👑'}`}
          </p>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? 'You have full access to all features.'
              : profile?.pro_expires_at
                ? `Active until ${new Date(profile.pro_expires_at).toLocaleDateString(undefined, { dateStyle: 'long' })}.`
                : 'Your Pro access is active.'
            }
          </p>
          <Link href={dashboardHref}>
            <Button className="gap-2 mt-2">Go to Dashboard <ArrowRight size={14} /></Button>
          </Link>
        </div>
      )}

      {/* Coming Soon */}
      {!isAdmin && !isPro && (
        <div className="space-y-10">

          {/* Coming soon banner */}
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-8 text-center space-y-6">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

            <div className="space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mx-auto">
                <Lock size={24} className="text-amber-500" />
              </div>
              <h2 className="text-2xl font-black">Pro is coming soon</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
                We're still building the platform. Pro will open when we're ready.
                Join the waitlist and you'll be the first to know and the first to get access.
              </p>
            </div>

            {/* Email capture */}
            {joined ? (
              <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm font-bold">
                <CheckCircle2 size={16} />
                You're on the list! Check your inbox.
              </div>
            ) : (
              <div className="max-w-sm mx-auto space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleWaitlist()}
                    className="h-11 bg-background/60 border-amber-500/30 focus-visible:ring-amber-500/30"
                  />
                  <Button
                    onClick={handleWaitlist}
                    disabled={joining}
                    className="h-11 px-5 shrink-0 bg-gradient-to-r from-amber-400 to-orange-500 border-0 text-white hover:opacity-90 font-bold"
                  >
                    {joining ? <Loader2 size={14} className="animate-spin" /> : <><Sparkles size={14} /> Notify me</>}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  No spam. One email when Pro launches.
                </p>
              </div>
            )}
          </div>

          {/* Pricing preview — no toggle, just yearly shown as default */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">

            {/* Free card */}
            <div className="p-6 rounded-2xl border border-border bg-card flex flex-col">
              <div className="mb-6">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  {isCreator ? 'Free Creator' : 'Free'}
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black">$0</span>
                  <span className="text-muted-foreground text-sm mb-1.5">/forever</span>
                </div>
              </div>
              <div className="space-y-3 mb-8 flex-grow">
                {freeFeatures.map(f => (
                  <div key={f.text} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Check size={14} className="text-muted-foreground/50 shrink-0" />
                    {f.text}
                  </div>
                ))}
              </div>
              <Link href={user ? (isCreator ? '/creator/dashboard' : '/browse') : '/signup'}>
                <Button variant="outline" className="w-full">
                  {user ? 'Continue Free' : 'Get Started Free'}
                </Button>
              </Link>
            </div>

            {/* Pro preview card */}
            <div className={cn(
              'relative p-6 rounded-2xl border-2 space-y-6 flex flex-col',
              accentBorder,
              `bg-gradient-to-b ${accentCardBg} to-card`
            )}>
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className={cn('px-3 py-1 rounded-full text-white text-xs font-black shadow-md', accentGrad)}>
                  {isCreator ? '🎨 PRO CREATOR' : '✨ PRO READER'}
                </span>
              </div>

              {/* Price */}
              <div>
                <p className={cn('text-xs font-black uppercase tracking-widest', accentColor)}>
                  Pro {isCreator ? '🎨' : '👑'}
                </p>
                <div className="flex items-end gap-1 mt-1">
                  <span className="text-4xl font-black">{EFFECTIVE_MONTHLY}</span>
                  <span className="text-muted-foreground text-sm mb-1.5">/month</span>
                </div>
                <p className="text-xs text-emerald-600 font-bold mt-1">
                  Billed {YEARLY_BILLED}/year · save 50% vs {MONTHLY_PRICE}/mo
                </p>
              </div>

              {/* Features */}
              <div className="space-y-4 flex-grow">
                <div className="space-y-2">
                  <p className={cn('text-[10px] font-black uppercase tracking-widest', accentColor)}>
                    Recognition
                  </p>
                  {PRO_STATUS.map(f => (
                    <div key={f.text} className="flex items-start gap-2.5 text-sm font-medium">
                      <Check size={14} className={cn('mt-0.5 shrink-0', checkColor)} />
                      {f.text}
                    </div>
                  ))}
                </div>
                <div className="h-px bg-border" />
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Power Tools
                  </p>
                  {proPower.map(f => (
                    <div key={f.text} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                      {f.text}
                    </div>
                  ))}
                </div>
              </div>

              {/* Coming soon CTA */}
              <div className="space-y-2">
                <Button
                  onClick={() => {
                    document.getElementById('waitlist-email')?.focus()
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className={cn('w-full border-0 text-white font-bold h-11', accentGrad)}
                >
                  <Sparkles size={14} className="mr-2" />
                  Join the Waitlist
                </Button>
                <p className="text-center text-[10px] text-muted-foreground">
                  Pro launching soon · be first to know
                </p>
              </div>
            </div>
          </div>

          {/* What Pro money goes to */}
          <div className="max-w-2xl mx-auto rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
              What Pro money actually goes to
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { emoji: '⚡', text: 'Server costs & infrastructure'              },
                { emoji: '🔨', text: 'New features & improvements'                },
                { emoji: '🛡️', text: 'Moderation & community health'              },
                { emoji: '🏆', text: 'Funding community events'                   },
                { emoji: '🌐', text: 'Expanding community spaces'                 },
                { emoji: '🚀', text: 'Making Compicfy the best it can be'         },
              ].map(({ emoji, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <span className="text-base leading-none shrink-0">{emoji}</span>
                  {text}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground border-t border-border pt-3 leading-relaxed">
              No ads. No selling your data. No dark patterns.
              Pro is how we keep Compicfy independent and growing.
            </p>
          </div>

        </div>
      )}
    </div>
  )
}