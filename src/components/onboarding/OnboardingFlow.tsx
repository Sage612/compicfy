'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {BookOpen, Radar, LayoutList,
  BookMarked, Check, ArrowRight,
  Sparkles, Globe, Bell, Loader2, ThumbsUp, Bookmark, PenLine,
  User as UserIcon, Upload,
} from 'lucide-react'
import { ImportListModal } from '@/components/import/ImportListModal'
import { GENRES } from '@/lib/utils/constants'
import Image from 'next/image'

interface Props {
  userId:        string
  username:      string
  displayName:   string
  initialGenres: string[]
  next:          string
}

function proxyCover(url: string | null | undefined): string {
  if (!url) return "" // Returning an empty string satisfies the 'string' requirement
  if (url.startsWith('data:')) return url
  if (url.startsWith('/')) return url
  if (url.includes('/api/image-proxy')) return url

  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}


const STEPS = ['welcome', 'genres', 'discover', 'tour', 'done'] as const
type Step = typeof STEPS[number]

// Desktop tour — references dropdown/header nav
const TOUR_ITEMS_DESKTOP = [
  {
    icon:  Radar,
    color: 'bg-rose-500/10',
    iconColor: 'text-rose-500',
    title: 'Browse',
    desc:  'Community recs sorted by votes. Filter by genre, type or status. Find something worth reading in under a minute.',
  },
  {
    icon:  LayoutList,
    color: 'bg-primary/10',
    iconColor: 'text-primary',
    title: 'Your Feed',
    desc:  'Follow readers whose taste you trust. Their new recs show up here so you never have to go hunting.',
  },
  {
    icon:  BookMarked,
    color: 'bg-teal-500/10',
    iconColor: 'text-teal-500',
    title: 'Reading Lists',
    desc:  "Keep track of what you're reading, what's on deck, and what you've finished. Find them in your dashboard via the avatar menu top right.",
  },
  {
    icon:  Bell,
    color: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    title: 'Notifications',
    desc:  "Someone upvoted your rec, left a review, or started following you. Check the bell icon in the top bar.",
  },
]

// Mobile tour — references bottom nav and profile tab sheet
const TOUR_ITEMS_MOBILE = [
  {
    icon:  Radar,
    color: 'bg-rose-500/10',
    iconColor: 'text-rose-500',
    title: 'Browse',
    desc:  'Tap Browse in the bottom nav. Community recs sorted by votes filter by genre, type, or status.',
  },
  {
    icon:  LayoutList,
    color: 'bg-primary/10',
    iconColor: 'text-primary',
    title: 'Your Feed',
    desc:  'The first tab in your bottom nav. Follow readers whose taste you trust and their new recs appear here.',
  },
  {
    icon:  BookMarked,
    color: 'bg-teal-500/10',
    iconColor: 'text-teal-500',
    title: 'Reading Lists & Settings',
    desc:  "Tap the Profile tab (bottom right) to access your settings, notifications, and everything else.",
  },
  {
    icon:  UserIcon,
    color: 'bg-amber-500/10',
    iconColor: 'text-amber-500',
    title: 'Profile Tab',
    desc:  "Your Profile tab in the bottom nav is your hub  dashboard, saved comics, billing, and sign out all live there.",
  },
]

interface ComicPreview {
  id:        string
  title:     string
  cover_url: string | null
  type:      string
  genres:    string[]
  upvotes:   number
}

function ComicImage({ src, alt }: { src: string | null; alt: string }) {
  const [error, setError] = useState(false)
  const fallback = 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?q=80&w=500'
  return (
    <Image
      src={error || !src ? fallback : src}
      alt={alt}
      fill
      className="object-cover group-hover:scale-105 transition-transform duration-300"
      sizes="(max-width: 640px) 50vw, 33vw"
      unoptimized
      onError={() => setError(true)}
    />
  )
}

export function OnboardingFlow({ userId, username, displayName, initialGenres, next }: Props) {
  const router = useRouter()
  const [step,           setStep]           = useState<Step>('welcome')
  const [selectedGenres, setSelectedGenres] = useState<string[]>(initialGenres)
  const [saving,         setSaving]         = useState(false)
  const [comics,         setComics]         = useState<ComicPreview[]>([])
  const [loadingComics,  setLoadingComics]  = useState(false)
  const [votedIds,       setVotedIds]       = useState<Set<string>>(new Set())
  const [savedIds,       setSavedIds]       = useState<Set<string>>(new Set())
  const [votingId,       setVotingId]       = useState<string | null>(null)
  const [savingId,       setSavingId]       = useState<string | null>(null)
  const [isMobile,       setIsMobile]       = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  // Detect mobile vs desktop
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const tourItems = isMobile ? TOUR_ITEMS_MOBILE : TOUR_ITEMS_DESKTOP

  const currentStepIndex = STEPS.indexOf(step)
  const progress         = (currentStepIndex / (STEPS.length - 1)) * 100
  const name             = displayName || username || 'there'

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : prev.length < 10 ? [...prev, genre] : prev
    )
  }

  const loadDiscoverComics = async () => {
    setLoadingComics(true)
    try {
      const genreParam = selectedGenres.length > 0
        ? `&genre=${encodeURIComponent(selectedGenres[0])}`
        : ''
      const res  = await fetch(`/api/recommendations?limit=6&sort=score${genreParam}&adult=false`)
      const data = await res.json()
      setComics(data.recommendations ?? [])
    } catch {
      setComics([])
    } finally {
      setLoadingComics(false)
    }
  }

  const goToDiscover = async () => {
    setStep('discover')
    await loadDiscoverComics()
  }

  const handleVote = async (comicId: string) => {
    if (votedIds.has(comicId) || votingId !== null) return
    setVotingId(comicId)
    try {
      const res = await fetch(`/api/recommendations/${comicId}/vote`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ vote_type: 'up' }),
      })
      if (res.status === 401) { setVotedIds(prev => new Set([...prev, comicId])); return }
      if (!res.ok) { toast.error('Could not vote — try again from Browse'); return }
      setVotedIds(prev => new Set([...prev, comicId]))
    } catch {
      toast.error('Vote failed — check your connection')
    } finally {
      setVotingId(null)
    }
  }

  const handleSave = async (comicId: string) => {
    if (savedIds.has(comicId) || savingId !== null) return
    setSavingId(comicId)
    try {
      const res = await fetch('/api/saves', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recommendation_id: comicId }),
      })
      if (res.status === 401) { setSavedIds(prev => new Set([...prev, comicId])); return }
      if (!res.ok) return
      setSavedIds(prev => new Set([...prev, comicId]))
    } catch { /* silent */ } finally {
      setSavingId(null)
    }
  }

  const handleComplete = async (destination?: string) => {
    setSaving(true)
    const target = destination ?? next
    try {
      const res = await fetch('/api/onboarding/complete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ favorite_genres: selectedGenres }),
      })
      if (!res.ok) throw new Error()
      router.push(target)
      router.refresh()
    } catch {
      toast.error('Something went wrong, please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
              Step {currentStepIndex + 1} of {STEPS.length}
            </span>
            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* STEP 1: Welcome */}
        {step === 'welcome' && (
          <div className="rounded-3xl border border-border bg-card p-8 space-y-6 text-center">
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                <Sparkles size={28} className="text-primary" />
              </div>
              <h1 className="text-3xl font-black tracking-tight">Hey {name} 👋</h1>
              <p className="text-muted-foreground leading-relaxed">
                Quick setup, 60 seconds and your browse page will actually match what you read.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-left">
              {[
                { icon: BookOpen,   text: 'Discover comics',   color: 'text-rose-500'    },
                { icon: LayoutList, text: 'Follow readers',     color: 'text-primary'     },
                { icon: BookMarked, text: 'Track your reading', color: 'text-teal-500'    },
                { icon: Globe,      text: 'Share your recs',    color: 'text-emerald-500' },
              ].map(({ icon: Icon, text, color }) => (
                <div key={text} className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/50 border border-border">
                  <Icon size={15} className={color} />
                  <span className="text-xs font-semibold">{text}</span>
                </div>
              ))}
            </div>
            <Button onClick={() => setStep('genres')} className="w-full h-11 gap-2 font-bold">
              Let's go <ArrowRight size={16} />
            </Button>
          </div>
        )}

        {/* STEP 2: Genres */}
        {step === 'genres' && (
          <div className="rounded-3xl border border-border bg-card p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight">What do you read?</h2>
              <p className="text-sm text-muted-foreground">
                Pick genres you actually enjoy.
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
              <Button variant="ghost" onClick={() => setStep('welcome')} className="flex-1">Back</Button>
              <Button onClick={goToDiscover} className="flex-1 gap-2 font-bold">
                {selectedGenres.length === 0 ? 'Skip for now' : 'Show me picks'}
                <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Discover */}
        {step === 'discover' && (
          <div className="rounded-3xl border border-border bg-card p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight">
                {selectedGenres.length > 0 ? 'Anything look good? 👀' : "What's popular right now 🔥"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Upvote anything that catches your eye, it trains your personal feed.
              </p>
            </div>

            {loadingComics ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl bg-muted animate-pulse aspect-[3/4]" />
                ))}
              </div>
            ) : comics.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
                Nothing here yet, head to Browse after setup.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {comics.map((comic) => {
                  const voted   = votedIds.has(comic.id)
                  const saved   = savedIds.has(comic.id)
                  const voting  = votingId === comic.id
                  const savingC = savingId === comic.id
                  return (
                    <div key={comic.id} className="group relative rounded-2xl border border-border overflow-hidden bg-muted/30 flex flex-col">
                      <div className="relative aspect-[3/4] bg-muted overflow-hidden">
                        <ComicImage src={proxyCover(comic.cover_url)} alt={comic.title} />
                        <span className="absolute top-2 left-2 text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-sm z-10">
                          {comic.type}
                        </span>
                      </div>
                      <div className="p-2.5 space-y-2 flex-1 flex flex-col justify-between">
                        <p className="text-xs font-bold leading-tight line-clamp-2">{comic.title}</p>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleVote(comic.id)}
                            disabled={voted || votingId !== null}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-1 h-7 rounded-lg text-[10px] font-bold border transition-all',
                              voted
                                ? 'bg-primary text-primary-foreground border-primary cursor-default'
                                : votingId !== null
                                ? 'border-border text-muted-foreground opacity-50 cursor-not-allowed'
                                : 'border-border text-muted-foreground hover:border-primary hover:text-primary active:scale-95'
                            )}
                          >
                            {voting
                              ? <Loader2 size={10} className="animate-spin" />
                              : <ThumbsUp size={10} className={voted ? 'fill-current' : ''} />
                            }
                            {voted ? 'Voted' : 'Vote'}
                          </button>
                          <button
                            onClick={() => handleSave(comic.id)}
                            disabled={saved || savingId !== null}
                            className={cn(
                              'h-7 w-7 flex items-center justify-center rounded-lg border transition-all',
                              saved
                                ? 'bg-teal-500 text-white border-teal-500 cursor-default'
                                : savingId !== null
                                ? 'border-border text-muted-foreground opacity-50 cursor-not-allowed'
                                : 'border-border text-muted-foreground hover:border-teal-500 hover:text-teal-500 active:scale-95'
                            )}
                          >
                            {savingC
                              ? <Loader2 size={10} className="animate-spin" />
                              : <Bookmark size={10} className={saved ? 'fill-current' : ''} />
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setStep('genres')} className="flex-1">Back</Button>
              <Button onClick={() => setStep('tour')} className="flex-1 gap-2 font-bold">
                {votedIds.size > 0 || savedIds.size > 0 ? 'Good picks continue' : 'Skip for now'}
                <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Tour — responsive content */}
        {step === 'tour' && (
          <div className="rounded-3xl border border-border bg-card p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight">What you've got 🗺️</h2>
              <p className="text-sm text-muted-foreground">
                {isMobile
                  ? 'Four things worth knowing about your mobile experience.'
                  : 'Four things worth knowing before you dive in.'
                }
              </p>
            </div>
            <div className="space-y-3">
              {tourItems.map(({ icon: Icon, color, iconColor, title, desc }) => (
                <div key={title} className="flex items-start gap-3 p-3.5 rounded-2xl border border-border bg-muted/30 hover:border-primary/30 transition-colors">
                  <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                    <Icon size={15} className={iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black">{title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setStep('discover')} className="flex-1">Back</Button>
              <Button onClick={() => setStep('done')} className="flex-1 gap-2 font-bold">
                One more step <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: Done */}
        {step === 'done' && (
          <div className="rounded-3xl border border-border bg-card p-8 space-y-6 text-center">
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <Check size={28} className="text-emerald-500" />
              </div>
              <h2 className="text-3xl font-black tracking-tight">You're in.</h2>
              <p className="text-muted-foreground leading-relaxed">
                {selectedGenres.length > 0
                  ? `Your browse page is tuned for ${selectedGenres.slice(0, 2).join(' and ')}. The more you vote, the better it gets.`
                  : 'Head to Browse, vote on a few things and your feed will start shaping up.'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { value: selectedGenres.length, label: 'Genres' },
                { value: votedIds.size,          label: 'Voted'  },
                { value: savedIds.size,           label: 'Saved'  },
              ].map(({ value, label }) => (
                <div key={label} className="p-3 rounded-2xl bg-muted/50 border border-border space-y-1">
                  <p className="text-2xl font-black text-primary">{value}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 text-left space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <PenLine size={15} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black">Something worth sharing?</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Drop a rec right now while it's fresh. Two minutes, helps hundreds of people.
                  </p>
                </div>
              </div>
              <Button
               onClick={() => handleComplete('/reader/dashboard/recommendations/new')}
                disabled={saving}
                variant="outline"
                size="sm"
                className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <PenLine size={13} />}
                Post my first rec
              </Button>
            </div>

            {/* NEW: import card, same treatment as the rec-posting card above */}
            <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 text-left space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Upload size={15} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black">Already tracking on MAL or AniList?</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Bring your list over in one upload. Takes about a minute, easy to skip if you're not ready.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowImportModal(true)}
                disabled={saving}
                variant="outline"
                size="sm"
                className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50"
              >
                <Upload size={13} />
                Import my list
              </Button>
            </div>

            <Button
              onClick={() => handleComplete('/browse')}
              disabled={saving}
              className="w-full h-11 gap-2 font-bold"
            >
              {saving
                ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
                : <>Take me to Browse <ArrowRight size={16} /></>
              }
            </Button>
          </div>
        )}

        <ImportListModal
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
        />
      </div>
    </div>
  )
}