'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  BookOpen, Compass, Radar, LayoutList, ShoppingBag,
  BookMarked, ChevronDown, Check, ArrowRight,
  Sparkles, Globe, Bell, Loader2, 
} from 'lucide-react'
import { GENRES } from '@/lib/utils/constants'

interface Props {
  userId: string
  username: string
  displayName: string
  initialGenres: string[]
}

const STEPS = ['welcome', 'genres', 'tour', 'done'] as const
type Step = typeof STEPS[number]

const TOUR_ITEMS = [
  {
    icon: Radar,
    color: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-500/10',
    text: 'text-rose-500',
    title: 'Browse',
    desc: 'Discover manga, manhwa, manhua and webtoons recommended by the community.',
    href: '/browse',
  },
  {
    icon: LayoutList,
    color: 'from-primary to-violet-500',
    bg: 'bg-primary/10',
    text: 'text-primary',
    title: 'Following Feed',
    desc: 'See the latest recommendations from people you follow — like a Twitter for comics.',
    href: '/feed',
  },
  {
    icon: BookMarked,
    color: 'from-teal-500 to-cyan-600',
    bg: 'bg-teal-500/10',
    text: 'text-teal-500',
    title: 'Reading Lists',
    desc: 'Organise your reading — Currently Reading, Plan to Read, Completed and more.',
    href: '/dashboard/lists',
  },
  {
    icon: ShoppingBag,
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    title: 'Shop',
    desc: 'Find manga volumes, figures, and kawaii merchandise from our affiliate partners.',
    href: '/affiliate',
  },
  {
    icon: ChevronDown,
    color: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-500/10',
    text: 'text-violet-500',
    title: 'Your Menu',
    desc: 'Click your avatar in the top right — your profile, dashboard, notifications and settings are all there.',
    href: null,
  },
  {
    icon: Bell,
    color: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    title: 'Notifications',
    desc: 'Get notified when someone votes on your recommendation, follows you, or leaves a review.',
    href: '/dashboard/notifications',
  },
]

export function OnboardingFlow({ userId, username, displayName, initialGenres }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('welcome')
  const [selectedGenres, setSelectedGenres] = useState<string[]>(initialGenres)
  const [saving, setSaving] = useState(false)

  const currentStepIndex = STEPS.indexOf(step)
  const progress = (currentStepIndex / (STEPS.length - 1)) * 100

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : prev.length < 10
          ? [...prev, genre]
          : prev
    )
  }

  const handleComplete = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite_genres: selectedGenres }),
      })
      if (!res.ok) throw new Error()
      router.push('/browse')
      router.refresh()
    } catch {
      toast.error('Something went wrong, please try again')
    } finally {
      setSaving(false)
    }
  }

  const name = displayName || username || 'there'

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
              Step {currentStepIndex + 1} of {STEPS.length}
            </span>
            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* ── STEP 1: Welcome ── */}
        {step === 'welcome' && (
          <div className="rounded-3xl border border-border bg-card p-8 space-y-6 text-center">
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center mx-auto shadow-xl shadow-primary/20">
                <Sparkles size={28} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight">
                Welcome, {name}! 🎉
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                You've joined a community of comic fans. Let's take 60 seconds to set up your experience.
              </p>
            </div>

            {/* What you can do */}
            <div className="grid grid-cols-2 gap-3 text-left">
              {[
                { icon: BookOpen,  text: 'Discover comics',        color: 'text-rose-500'    },
                { icon: LayoutList, text: 'Follow readers',          color: 'text-primary'     },
                { icon: BookMarked,text: 'Track your reading',      color: 'text-teal-500'    },
                { icon: Globe,     text: 'Share recommendations',   color: 'text-emerald-500' },
              ].map(({ icon: Icon, text, color }) => (
                <div key={text} className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/50 border border-border">
                  <Icon size={15} className={color} />
                  <span className="text-xs font-semibold">{text}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={() => setStep('genres')}
              className="w-full h-11 gap-2 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 shadow-lg shadow-primary/20 font-bold"
            >
              Let's go <ArrowRight size={16} />
            </Button>
          </div>
        )}

        {/* ── STEP 2: Genres ── */}
        {step === 'genres' && (
          <div className="rounded-3xl border border-border bg-card p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight">What do you like?</h2>
              <p className="text-sm text-muted-foreground">
                Pick your favourite genres — we'll use this to personalise your recommendations.
                <span className="text-muted-foreground/60 ml-1">({selectedGenres.length}/10)</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => {
                const isSelected = selectedGenres.includes(genre)
                const isDisabled = !isSelected && selectedGenres.length >= 10
                return (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    disabled={isDisabled}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : isDisabled
                        ? 'opacity-40 cursor-not-allowed border-border text-muted-foreground'
                        : 'border-border text-muted-foreground hover:border-primary hover:text-foreground cursor-pointer'
                    )}
                  >
                    {isSelected && <Check size={10} />}
                    {genre}
                  </button>
                )
              })}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setStep('welcome')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={() => setStep('tour')}
                className="flex-2 gap-2 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 shadow-lg shadow-primary/20 font-bold flex-1"
              >
                {selectedGenres.length === 0 ? 'Skip for now' : 'Next'}
                <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Tour ── */}
        {step === 'tour' && (
          <div className="rounded-3xl border border-border bg-card p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight">Quick tour 👀</h2>
              <p className="text-sm text-muted-foreground">
                Here's everything Compicfy has — some important stuff is hidden in menus.
              </p>
            </div>

            <div className="space-y-3">
              {TOUR_ITEMS.map(({ icon: Icon, color, bg, text, title, desc }) => (
                <div
                  key={title}
                  className="flex items-start gap-3 p-3.5 rounded-2xl border border-border bg-muted/30 hover:border-primary/30 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0 shadow-sm`}>
                    <Icon size={15} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black">{title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setStep('genres')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={() => setStep('done')}
                className="flex-1 gap-2 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 shadow-lg shadow-primary/20 font-bold"
              >
                Almost done <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Done ── */}
        {step === 'done' && (
          <div className="rounded-3xl border border-border bg-card p-8 space-y-6 text-center">
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
                <Check size={28} className="text-white" />
              </div>
              <h2 className="text-3xl font-black tracking-tight">You're all set!</h2>
              <p className="text-muted-foreground leading-relaxed">
                {selectedGenres.length > 0
                  ? `We've saved your taste for ${selectedGenres.slice(0, 2).join(', ')}${selectedGenres.length > 2 ? ` and ${selectedGenres.length - 2} more` : ''}. Your browse page is now personalised.`
                  : "Head to Browse to start discovering comics the community loves."}
              </p>
            </div>

            {selectedGenres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {selectedGenres.map(g => (
                  <span
                    key={g}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                  >
                    <Check size={9} />
                    {g}
                  </span>
                ))}
              </div>
            )}

            <Button
              onClick={handleComplete}
              disabled={saving}
              className="w-full h-11 gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 border-0 shadow-lg shadow-emerald-500/20 font-bold text-white"
            >
              {saving
                ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
                : <>Start exploring <ArrowRight size={16} /></>
              }
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}