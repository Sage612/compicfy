'use client'

import { useState, useEffect } from 'react'
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
  Gem, Layers, Shuffle, Tag, Search, Compass,
  Calendar, MessageSquare, StickyNote, RefreshCw, Send, HelpCircle
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'

interface Props {
  user: User | null
  profile: {
    is_pro: boolean | null
    pro_expires_at: string | null
    is_patron?: boolean | null
    patron_expires_at?: string | null
    role: string | null
    recommendation_count_this_month: number | null
    total_saves: number | null
    user_type?: string
  } | null
}

// --- READER TIERS ---
const READER_FREE = [
  { icon: BookOpen,      text: 'Limited recommendations per month' },
  { icon: Bookmark,      text: 'Limited saved comics & reading lists' },
  { icon: StickyNote,    text: 'Private notes on tracked comics' },
  { icon: Tag,           text: 'Trope & mood tag filtering' },
  { icon: Search,        text: 'Internal & multi-platform user search' },
  { icon: Compass,       text: 'Browse Trending Shelves & Top Lists' },
  { icon: BookMarked,    text: 'Multi-platform import (MAL/AniList)' },
  { icon: RefreshCw,     text: 'Smart Importer for custom entries' },
  { icon: HelpCircle,    text: '"Where did I leave off" reading synopsis' },
  { icon: Users,         text: 'Find Readers Like Me (Weekly top 3)' },
  { icon: Calendar,      text: 'Basic Release Radar calendar' },
  { icon: MessageSquare, text: 'Community reviews & threaded replies' },
  { icon: Bell,          text: 'Basic chapter & social notifications' },
]

const READER_PRO_POWER = [
  { icon: BookOpen,      text: 'Unlimited recommendations & saves' },
  { icon: BookMarked,    text: 'Unlimited reading lists & collections' },
  { icon: Layers,        text: 'Nested folders (Limited)' },
  { icon: Shuffle,       text: 'Shelf pinning (Top 3 pinned comics)' },
  { icon: Tag,           text: 'Saved filter presets & compound engine' },
  { icon: BarChart2,     text: 'Personal reader stats & rec analytics' },
  { icon: RefreshCw,     text: 'Cross-platform source sync & auto last-read link' },
  { icon: Download,      text: 'Export reading lists (CSV/PDF)' },
  { icon: Users,         text: 'Find Readers Like Me (Daily top 10 + filters)' },
  { icon: Calendar,      text: 'Advanced Release Radar (Multi-week + export)' },
  { icon: BadgeCheck,    text: 'Contributor badge for synopsis edits' },
  { icon: Zap,           text: 'Priority support' },
]

const READER_PATRON_POWER = [
  { icon: Layers,        text: 'Full nested folders (lists & collections)' },
  { icon: Shuffle,       text: 'Full Manhwa Shelf reordering & custom grid' },
  { icon: Flame,         text: 'Profile & shelf visibility boost in discovery' },
  { icon: BarChart2,     text: 'Everything in Pro Reader' },
]

// --- CREATOR TIERS ---
const CREATOR_FREE = [
  { icon: BookOpen,      text: 'Submit & publish your works' },
  { icon: Users,         text: 'Build & track your audience' },
  { icon: Bookmark,      text: 'Patreon & Kickstarter link integration' },
  { icon: Sparkles,      text: 'Concepts & pitch sandbox (Capped)' },
  { icon: Star,          text: 'Community reviews & feedback' },
  { icon: Bell,          text: 'Basic notifications' },
]

const CREATOR_PRO_POWER = [
  { icon: Palette,       text: 'Deep audience analytics & work performance' },
  { icon: Users,         text: 'Follower growth tracking' },
  { icon: Send,          text: 'Hiatus-to-tracker pushes (Standard limit)' },
  { icon: Star,          text: 'Super-fan / pinned review slots' },
  { icon: Sparkles,      text: 'Pitch sandbox (Higher caps + placement boost)' },
  { icon: Zap,           text: 'Priority submission review queue' },
]

const CREATOR_PATRON_POWER = [
  { icon: Users,         text: 'Audience overlap & drop-off analytics' },
  { icon: Send,          text: 'Unlimited hiatus & update pushes to trackers' },
  { icon: Sparkles,      text: 'Maximum pitch sandbox caps & featured spot' },
  { icon: BarChart2,     text: 'Everything in Pro Creator' },
]

// --- BADGES & RECOGNITION ---
const PRO_STATUS = [
  { icon: Crown,      text: 'Exclusive 👑 Pro badge on profile' },
  { icon: BadgeCheck, text: 'Eligible for Verified badge' },
  { icon: Flame,      text: 'Early access to new features & Leaderboard' },
]

const PATRON_STATUS = [
  { icon: Gem,        text: 'Exclusive 💎 Patron badge on profile' },
  { icon: BadgeCheck, text: 'Priority eligibility for Verified badge' },
  { icon: Sparkles,   text: 'Founding Patron recognition' },
]

const PRO_YEARLY_BILLED     = '$29.99'
const PRO_MONTHLY_PRICE     = '$4.99'
const PRO_EFFECTIVE_MONTHLY = '$2.49'

const PATRON_YEARLY_BILLED     = '$49.99'
const PATRON_MONTHLY_PRICE     = '$9.99'
const PATRON_EFFECTIVE_MONTHLY = '$4.17'

export function PricingClient({ user, profile }: Props) {
  const [email,   setEmail]   = useState(user?.email ?? '')
  const [joining, setJoining] = useState<'pro' | 'patron' | null>(null)
  const [joinedPro,    setJoinedPro]    = useState(false)
  const [joinedPatron, setJoinedPatron] = useState(false)
  const searchParams               = useSearchParams()

  const isAdmin  = profile?.role === 'admin'
  const isPro    = isAdmin || (profile?.is_pro &&
    (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
  const isPatron = isAdmin || (profile?.is_patron &&
    (!profile.patron_expires_at || new Date(profile.patron_expires_at) > new Date()))
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

  const handleWaitlist = async (tier: 'pro' | 'patron') => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email')
      return
    }

    setJoining(tier)
    try {
      const res = await fetch('/api/pro/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tier }),
      })
      if (!res.ok) throw new Error()
      if (tier === 'patron') setJoinedPatron(true)
      else setJoinedPro(true)
      toast.success("You're on the list! Check your email.")
    } catch {
      toast.error('Something went wrong. Try again.')
    } finally {
      setJoining(null)
    }
  }

  const freeFeatures = isCreator ? CREATOR_FREE         : READER_FREE
  const proPower     = isCreator ? CREATOR_PRO_POWER    : READER_PRO_POWER
  const patronPower  = isCreator ? CREATOR_PATRON_POWER : READER_PATRON_POWER

  const heroTitle = isCreator
    ? <>Grow your <span className="text-teal-500">creator studio</span></>
    : <>Stand out as a <span className="text-amber-500">top recommender</span></>

  const heroSub = isCreator
    ? 'Pro and Patron give creators deep analytics, audience insights, and the tools to grow their readership.'
    : "Pro and Patron aren't just about removing limits — they're the recognition, visibility, and tools that serious collectors deserve."

  const dashboardHref = isAdmin
    ? '/admin'
    : (isPro || isPatron)
    ? isCreator ? '/pro/creator/dashboard' : '/pro/reader/dashboard'
    : isCreator ? '/creator/dashboard'     : '/reader/dashboard'

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-14">

      {/* Header */}
      <div className="text-center space-y-4">
        <div className={cn(
          'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold border',
          isCreator ? 'bg-teal-500/10 border-teal-500/20 text-teal-600' : 'bg-amber-500/10 border-amber-500/20 text-amber-600'
        )}>
          {isCreator ? <Palette size={14} /> : <Crown size={14} className="fill-amber-500" />}
          Compicfy Pro & Patron
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight">{heroTitle}</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">{heroSub}</p>
      </div>

      {/* Already Pro/Patron/Admin Status Banner */}
      {(isAdmin || isPro || isPatron) && (
        <div className={cn(
          'max-w-md mx-auto p-6 rounded-2xl border text-center space-y-3 shadow-sm',
          isAdmin   ? 'border-primary/30 bg-primary/5'   :
          isPatron  ? 'border-violet-500/30 bg-violet-500/5' :
          isCreator ? 'border-teal-500/30 bg-teal-500/5' :
                      'border-amber-500/30 bg-amber-500/5'
        )}>
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center mx-auto',
            isAdmin ? 'bg-primary/10' : isPatron ? 'bg-violet-500/10' : isCreator ? 'bg-teal-500/10' : 'bg-amber-500/10'
          )}>
            {isAdmin
              ? <Shield size={22} className="text-primary" />
              : isPatron
              ? <Gem size={22} className="text-violet-500 fill-violet-500/20" />
              : isCreator
              ? <Palette size={22} className="text-teal-500" />
              : <Crown   size={22} className="text-amber-500 fill-amber-500" />
            }
          </div>
          <p className="font-black text-lg">
            {isAdmin ? 'Admin Access Active' : isPatron ? "You're a Patron! 💎" : `You're already on Pro! ${isCreator ? '🎨' : '👑'}`}
          </p>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? 'You have full access to all features.'
              : isPatron && profile?.patron_expires_at
                ? `Active until ${new Date(profile.patron_expires_at).toLocaleDateString(undefined, { dateStyle: 'long' })}.`
                : isPro && profile?.pro_expires_at
                ? `Active until ${new Date(profile.pro_expires_at).toLocaleDateString(undefined, { dateStyle: 'long' })}.`
                : 'Your subscription is active.'
            }
          </p>
          <Link href={dashboardHref}>
            <Button className="gap-2 mt-2">Go to Dashboard <ArrowRight size={14} /></Button>
          </Link>
        </div>
      )}

      {!isAdmin && !isPro && !isPatron && (
        <div className="space-y-10">

          {/* Coming soon banner */}
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-8 text-center space-y-6">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

            <div className="space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mx-auto">
                <Lock size={24} className="text-amber-500" />
              </div>
              <h2 className="text-2xl font-black">Pro & Patron are coming soon</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
                We're still building the platform. Both tiers will open when we're ready.
                Join a waitlist below and you'll be the first to know, and the first to get access.
              </p>
            </div>

            {/* Email capture */}
            {!joinedPro && !joinedPatron && (
              <div className="max-w-sm mx-auto space-y-2">
                <Input
                  type="email"
                  id="waitlist-email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="h-11 bg-background/60 border-amber-500/30 focus-visible:ring-amber-500/30"
                />
                <p className="text-xs text-muted-foreground">
                  Enter your email once, then pick a waitlist below. No spam.
                </p>
              </div>
            )}
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">

            {/* Free Card */}
            <div className="p-6 rounded-2xl border border-border bg-card flex flex-col h-full">
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
                  <div key={f.text} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check size={14} className="text-muted-foreground/50 mt-0.5 shrink-0" />
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

            {/* Pro Card */}
            <div className={cn(
              'relative p-6 rounded-2xl border-2 space-y-6 flex flex-col h-full',
              'border-amber-500/40 bg-gradient-to-b from-amber-500/5 to-card'
            )}>
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 rounded-full text-white text-xs font-black shadow-md bg-gradient-to-r from-amber-400 to-orange-500">
                  {isCreator ? '🎨 PRO CREATOR' : '✨ PRO READER'}
                </span>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-amber-500">
                  Pro {isCreator ? '🎨' : '👑'}
                </p>
                <div className="flex items-end gap-1 mt-1">
                  <span className="text-4xl font-black">{PRO_EFFECTIVE_MONTHLY}</span>
                  <span className="text-muted-foreground text-sm mb-1.5">/month</span>
                </div>
                <p className="text-xs text-emerald-600 font-bold mt-1">
                  Billed {PRO_YEARLY_BILLED}/year · save 50% vs {PRO_MONTHLY_PRICE}/mo
                </p>
              </div>

              <div className="space-y-4 flex-grow">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Recognition</p>
                  {PRO_STATUS.map(f => (
                    <div key={f.text} className="flex items-start gap-2.5 text-sm font-medium">
                      <Check size={14} className="mt-0.5 shrink-0 text-amber-500" />
                      {f.text}
                    </div>
                  ))}
                </div>
                <div className="h-px bg-border" />
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Power Tools</p>
                  {proPower.map(f => (
                    <div key={f.text} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                      {f.text}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {joinedPro ? (
                  <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm font-bold w-full justify-center">
                    <CheckCircle2 size={16} />
                    On the list!
                  </div>
                ) : (
                  <Button
                    onClick={() => handleWaitlist('pro')}
                    disabled={joining === 'pro'}
                    className="w-full border-0 text-white font-bold h-11 bg-gradient-to-r from-amber-400 to-orange-500"
                  >
                    {joining === 'pro' ? <Loader2 size={14} className="animate-spin" /> : <><Sparkles size={14} className="mr-2" /> Join Pro Waitlist</>}
                  </Button>
                )}
                <p className="text-center text-[10px] text-muted-foreground">
                  Pro launching soon · be first to know
                </p>
              </div>
            </div>

            {/* Patron Card */}
            <div className={cn(
              'relative p-6 rounded-2xl border-2 space-y-6 flex flex-col h-full',
              'border-violet-500/40 bg-gradient-to-b from-violet-500/5 to-card'
            )}>
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 rounded-full text-white text-xs font-black shadow-md bg-gradient-to-r from-violet-500 to-primary">
                  💎 FOUNDING PATRON
                </span>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-violet-500">
                  Patron 💎
                </p>
                <div className="flex items-end gap-1 mt-1">
                  <span className="text-4xl font-black">{PATRON_EFFECTIVE_MONTHLY}</span>
                  <span className="text-muted-foreground text-sm mb-1.5">/month</span>
                </div>
                <p className="text-xs text-emerald-600 font-bold mt-1">
                  Billed {PATRON_YEARLY_BILLED}/year · less than Pro's own monthly price
                </p>
              </div>

              <div className="space-y-4 flex-grow">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-violet-500">Recognition</p>
                  {PATRON_STATUS.map(f => (
                    <div key={f.text} className="flex items-start gap-2.5 text-sm font-medium">
                      <Check size={14} className="mt-0.5 shrink-0 text-violet-500" />
                      {f.text}
                    </div>
                  ))}
                </div>
                <div className="h-px bg-border" />
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Everything Pro Has, Plus</p>
                  {patronPower.map(f => (
                    <div key={f.text} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                      {f.text}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {joinedPatron ? (
                  <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm font-bold w-full justify-center">
                    <CheckCircle2 size={16} />
                    On the list!
                  </div>
                ) : (
                  <Button
                    onClick={() => handleWaitlist('patron')}
                    disabled={joining === 'patron'}
                    className="w-full border-0 text-white font-bold h-11 bg-gradient-to-r from-violet-500 to-primary"
                  >
                    {joining === 'patron' ? <Loader2 size={14} className="animate-spin" /> : <><Gem size={14} className="mr-2" /> Join Patron Waitlist</>}
                  </Button>
                )}
                <p className="text-center text-[10px] text-muted-foreground">
                  Patron launching soon · founding pricing locked for early members
                </p>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  )
}
