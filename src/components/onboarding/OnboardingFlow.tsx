'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  BookOpen, Radar, LayoutList,
  BookMarked, Check, ArrowRight,
  Sparkles, Globe, Bell, Loader2, ThumbsUp, Bookmark, PenLine,
} from 'lucide-react'
import { GENRES } from '@/lib/utils/constants'
import Image from 'next/image'

interface Props {
  userId:        string
  username:      string
  displayName:   string
  initialGenres: string[]
}

const STEPS = ['welcome', 'genres', 'discover', 'tour', 'done'] as const
type Step = typeof STEPS[number]

const TOUR_ITEMS = [
  { icon: Radar,      color: 'from-rose-500 to-pink-600',    title: 'Browse',         desc: 'Discover manga, manhwa, manhua and webtoons recommended by the community.'                            },
  { icon: LayoutList, color: 'from-primary to-violet-500',   title: 'Following Feed', desc: 'See the latest recommendations from people you follow — like a Twitter for comics.'                   },
  { icon: BookMarked, color: 'from-teal-500 to-cyan-600',    title: 'Reading Lists',  desc: 'Organise your reading — Currently Reading, Plan to Read, Completed and more.'                         },
  { icon: Bell,       color: 'from-emerald-500 to-teal-500', title: 'Notifications',  desc: 'Get notified when someone votes on your recommendation or follows you.'                               },
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

export function OnboardingFlow({ userId, username, displayName, initialGenres }: Props) {
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
    if (votedIds.has(comicId) || votingId === comicId) return
    setVotingId(comicId)
    try {
      const res = await fetch(`/api/recommendations/${comicId}/vote`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ vote_type: 'up' }),
      })
      if (res.status === 401) {
        setVotedIds(prev => new Set([...prev, comicId]))
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error('[onboarding/vote] error:', data)
        toast.error('Could not vote right now — try again from browse')
        return
      }
      setVotedIds(prev => new Set([...prev, comicId]))
    } catch (err) {
      console.error('[onboarding/vote] unexpected error:', err)
    } finally {
      setVotingId(null)
    }
  }

  const handleSave = async (comicId: string) => {
    if (savedIds.has(comicId) || savingId === comicId) return
    setSavingId(comicId)
    try {
      const res = await fetch('/api/saves', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recommendation_id: comicId }),
      })
      if (res.status === 401) {
        setSavedIds(prev => new Set([...prev, comicId]))
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error('[onboarding/save] error:', data)
        return
      }
      setSavedIds(prev => new Set([...prev, comicId]))
    } catch (err) {
      console.error('[onboarding/save] unexpected error:', err)
    } finally {
      setSavingId(null)
    }
  }

  // Shared save + navigate — destination lets both done-step buttons reuse this
  const handleComplete = async (destination = '/browse') => {
    setSaving(true)
    try {
      const res = await fetch('/api/onboarding/complete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ favorite_genres: selectedGenres }),
      })
      if (!res.ok) throw new Error()
      router.push(destination)
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
              <h1 className="text-3xl font-black tracking-tight">Welcome, {name}! 🎉</h1>
              <p className="text-muted-foreground leading-relaxed">
                You've joined a community of comic fans. Let's take 60 seconds to set up your experience.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-left">
              {[
                { icon: BookOpen,   text: 'Discover comics',       color: 'text-rose-500'    },
                { icon: LayoutList, text: 'Follow readers',         color: 'text-primary'     },
                { icon: BookMarked, text: 'Track your reading',     color: 'text-teal-500'    },
                { icon: Globe,      text: 'Share recommendations',  color: 'text-emerald-500' },
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
                Pick your favourite genres, we'll show you matching comics next.
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
              <Button
                onClick={goToDiscover}
                className="flex-1 gap-2 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 shadow-lg shadow-primary/20 font-bold"
              >
                {selectedGenres.length === 0 ? 'Skip for now' : 'Show me comics'}
                <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Discover ── */}
        {step === 'discover' && (
          <div className="rounded-3xl border border-border bg-card p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight">
                {selectedGenres.length > 0 ? 'Top picks for you 🎯' : 'Popular right now 🔥'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Upvote anything that catches your eye, it helps us personalise your feed.
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
                No comics found yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {comics.map((comic) => {
                  const voted  = votedIds.has(comic.id)
                  const saved  = savedIds.has(comic.id)
                  const voting = votingId === comic.id
                  const saving = savingId === comic.id
                  return (
                    <div key={comic.id} className="group relative rounded-2xl border border-border overflow-hidden bg-muted/30 flex flex-col">
                      <div className="relative aspect-[3/4] bg-muted overflow-hidden">
                        <ComicImage src={comic.cover_url} alt={comic.title} />
                        <span className="absolute top-2 left-2 text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-sm z-10">
                          {comic.type}
                        </span>
                      </div>
                      <div className="p-2.5 space-y-2 flex-1 flex flex-col justify-between">
                        <p className="text-xs font-bold leading-tight line-clamp-2">{comic.title}</p>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleVote(comic.id)}
                            disabled={voting}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-1 h-7 rounded-lg text-[10px] font-bold border transition-all',
                              voted
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border text-muted-foreground hover:border-primary hover:text-primary active:scale-95'
                            )}
                          >
                            {voting ? <Loader2 size={10} className="animate-spin" /> : <ThumbsUp size={10} />}
                            {voted ? 'Voted' : 'Vote'}
                          </button>
                          <button
                            onClick={() => handleSave(comic.id)}
                            disabled={saving}
                            className={cn(
                              'h-7 w-7 flex items-center justify-center rounded-lg border transition-all',
                              saved
                                ? 'bg-teal-500 text-white border-teal-500'
                                : 'border-border text-muted-foreground hover:border-teal-500 hover:text-teal-500 active:scale-95'
                            )}
                          >
                            {saving ? <Loader2 size={10} className="animate-spin" /> : <Bookmark size={10} />}
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
              <Button
                onClick={() => setStep('tour')}
                className="flex-1 gap-2 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 shadow-lg shadow-primary/20 font-bold"
              >
                {votedIds.size > 0 || savedIds.size > 0 ? 'Nice picks! Continue' : 'Skip for now'}
                <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Tour ── */}
        {step === 'tour' && (
          <div className="rounded-3xl border border-border bg-card p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight">Quick tour 👀</h2>
              <p className="text-sm text-muted-foreground">Here's what Compicfy can do.</p>
            </div>
            <div className="space-y-3">
              {TOUR_ITEMS.map(({ icon: Icon, color, title, desc }) => (
                <div key={title} className="flex items-start gap-3 p-3.5 rounded-2xl border border-border bg-muted/30 hover:border-primary/30 transition-colors">
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
              <Button variant="ghost" onClick={() => setStep('discover')} className="flex-1">Back</Button>
              <Button
                onClick={() => setStep('done')}
                className="flex-1 gap-2 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 shadow-lg shadow-primary/20 font-bold"
              >
                Almost done <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Done ── */}
        {step === 'done' && (
          <div className="rounded-3xl border border-border bg-card p-8 space-y-6 text-center">
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
                <Check size={28} className="text-white" />
              </div>
              <h2 className="text-3xl font-black tracking-tight">You're all set!</h2>
              <p className="text-muted-foreground leading-relaxed">
                {selectedGenres.length > 0
                  ? `We've saved your taste for ${selectedGenres.slice(0, 2).join(', ')}. Your browse page is now personalised.`
                  : 'Head to Browse to start discovering comics!'}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-muted/50 border border-border space-y-1">
                <p className="text-2xl font-black text-primary">{selectedGenres.length}</p>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Genres</p>
              </div>
              <div className="p-3 rounded-2xl bg-muted/50 border border-border space-y-1">
                <p className="text-2xl font-black text-primary">{votedIds.size}</p>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Voted</p>
              </div>
              <div className="p-3 rounded-2xl bg-muted/50 border border-border space-y-1">
                <p className="text-2xl font-black text-primary">{savedIds.size}</p>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Saved</p>
              </div>
            </div>

            {/* ── NEW: Submit first rec CTA ── */}
            <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 text-left space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shrink-0 shadow-sm">
                  <PenLine size={15} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black">Got a hidden gem?</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Share a manga, manhwa, or webtoon you love. Every rec helps someone find their next obsession.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => handleComplete('/dashboard/recommendations/new')}
                disabled={saving}
                variant="outline"
                size="sm"
                className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <PenLine size={13} />}
                Submit my first recommendation
              </Button>
            </div>

            {/* Primary CTA — unchanged */}
            <Button
              onClick={() => handleComplete('/browse')}
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