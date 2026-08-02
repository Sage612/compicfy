'use client'

import { useState, useRef, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CoverUpload } from './CoverUpload'
import { GenreSelector } from './GenreSelector'
import { PlatformSelector } from './PlatformSelector'
import { SubmissionGuidelineBanner } from '@/components/recommendations/SubmissionGuidelineBanner'
import { toast } from 'sonner'
import {Loader2, BookOpen, Info, AlertTriangle, Sparkles,
  Tag, FileText, Globe, Link2, CalendarClock,
} from 'lucide-react'
import { PeakHourModal } from '@/components/recommendations/PeakHourModal'
import { LimitReachedModal } from '@/components/recommendations/LimitReachedModal'
import { FREE_LIMITS } from '@/lib/utils/constants'
import { cn } from '@/lib/utils'
import { MangaSearch } from './MangaSearch'
import { createClient } from '@/lib/supabase/client'
import { validatePlatformLink } from '@/lib/utils/platformLinks'
import { isProUser, hasUnlimitedPerks } from '@/lib/access'

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Max 200 characters'),
  description: z.string().min(10, 'At least 10 characters').max(2000, 'Max 2000 characters'),
  type: z.enum(['manga', 'manhwa', 'manhua', 'webtoon', 'comic', 'other']),
  status: z.enum(['ongoing', 'completed', 'hiatus', 'cancelled']),
  genres: z.array(z.string()).min(1, 'Select at least one genre').max(5),
  official_platforms: z.array(z.string()).min(1, 'Select at least one platform'),
  official_links: z.array(z.string()).default([]),
  cover_url: z.string().default(''),
  content_rating: z.enum(['all_ages', 'teen', 'mature', 'adult']).default('all_ages'),
  adult_content_confirmed: z.boolean().optional(),
  why_recommend: z.string().max(1000).default(''),
  author: z.string().max(100).default(''),
  artist: z.string().max(100).default(''),
  year_released: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(1900).max(new Date().getFullYear() + 1).optional()
  ),
  chapter_count: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(1).optional()
  ),
  alternative_titles: z.array(z.string()).max(5).default([]),
  more_info_link: z.string().max(500).default('').refine(
    (val) => !val || /^https?:\/\/.+/.test(val),
    { message: 'Must be a valid URL starting with http:// or https://' }
  ),
})
  .superRefine((data, ctx) => {
    data.official_links.forEach((link, i) => {
      if (!link || !link.trim()) return
      const result = validatePlatformLink(link)
      if (!result.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: result.reason ?? 'Invalid platform link',
          path: ['official_links', i],
        })
      }
    })
  })

type FormValues = z.infer<typeof formSchema>

const TYPES = [
  { value: 'manga',   label: 'Manga',   desc: 'Japanese', activeClass: 'bg-rose-500   border-rose-500   text-white' },
  { value: 'manhwa',  label: 'Manhwa',  desc: 'Korean',   activeClass: 'bg-teal-500   border-teal-500 text-white' },
  { value: 'manhua',  label: 'Manhua',  desc: 'Chinese',  activeClass: 'bg-amber-500  border-amber-500  text-white' },
  { value: 'webtoon', label: 'Webtoon', desc: 'Vertical', activeClass: 'bg-teal-500   border-teal-500   text-white' },
  { value: 'comic',   label: 'Comic',   desc: 'Western',  activeClass: 'bg-blue-500   border-blue-500   text-white' },
  { value: 'other',   label: 'Other',   desc: 'Misc',     activeClass: 'bg-zinc-500   border-zinc-500   text-white' },
] as const

const STATUSES = [
  { value: 'ongoing',   label: 'Ongoing',   dot: 'bg-emerald-500' },
  { value: 'completed', label: 'Completed', dot: 'bg-blue-500'    },
  { value: 'hiatus',    label: 'On Hiatus', dot: 'bg-amber-500'   },
  { value: 'cancelled', label: 'Cancelled', dot: 'bg-red-500'     },
] as const

const RATINGS = [
  { value: 'all_ages', label: 'All Ages',   emoji: '🟢' },
  { value: 'teen',     label: 'Teen 13+',   emoji: '🟡' },
  { value: 'mature',   label: 'Mature 17+', emoji: '🟠' },
  { value: 'adult',    label: 'Adult 18+',  emoji: '🔴' },
] as const

function FormSection({ icon: Icon, title, accent = 'bg-primary', children }: {
  icon: React.ElementType
  title: string
  accent?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/30">
        <div className={`w-7 h-7 rounded-lg ${accent} flex items-center justify-center shrink-0`}>
          <Icon size={13} className="text-primary-foreground" />
        </div>
        <h3 className="text-xs font-black uppercase tracking-widest text-foreground">{title}</h3>
      </div>
      <div className="p-5 space-y-5">{children}</div>
    </div>
  )
}

interface Props {
  userId: string
}

export function RecommendationForm({ userId }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillTitle       = searchParams.get('title')        ?? ''
  const prefillAuthor      = searchParams.get('author')       ?? ''
  const prefillArtist      = searchParams.get('artist')       ?? ''
  const prefillDescription = searchParams.get('description')  ?? ''
  const prefillType        = searchParams.get('type')         ?? ''
  const prefillStatus      = searchParams.get('status')       ?? ''
  const prefillCover       = searchParams.get('cover_url')    ?? ''
  const prefillYear        = searchParams.get('year_released') ?? ''
  const prefillChapters    = searchParams.get('chapter_count') ?? ''
  const prefillGenres      = searchParams.get('genres')?.split(',').filter(Boolean) ?? []

  const [submitting,         setSubmitting]         = useState(false)
  const [duplicateWarning,   setDuplicateWarning]   = useState<{ id: string; title: string; is_approved: boolean } | null>(null)
  const [similarWarnings,    setSimilarWarnings]    = useState<{ id: string; title: string; is_approved: boolean; match_type: string; similarity: number }[]>([])
  const [dismissedSimilar,   setDismissedSimilar]   = useState(false)
  const [checkingDuplicate,  setCheckingDuplicate]  = useState(false)
  const duplicateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [externalIds, setExternalIds] = useState<{
    mangaupdates_id?: string
    anilist_id?:      string
    mal_id?:          string
    mangadex_id?:     string
  }>({})

  const [monthlyCount,        setMonthlyCount]        = useState<number | null>(null)
  const [isPro,               setIsPro]               = useState<boolean | null>(null)
  const [unlimitedPerks,      setUnlimitedPerks]      = useState<boolean | null>(null)
  const [peakHourModal, setPeakHourModal] = useState<{
    open:        boolean
    messageType: 'peak_spike' | 'peak_cap'
    draftId:     string | null
  }>({ open: false, messageType: 'peak_spike', draftId: null })
  const [limitModal, setLimitModal] = useState<{
    open:      boolean
    limitType: 'daily' | 'monthly'
  }>({ open: false, limitType: 'daily' })
  const supabase = createClient()

  useEffect(() => {
    const fetchUsage = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('is_pro, pro_expires_at, is_patron, patron_expires_at, role')
        .eq('id', user.id)
        .single()

      if (!profile) return
      const realPro = isProUser(profile)
      setIsPro(realPro)
      const unlimited = hasUnlimitedPerks(profile)
      setUnlimitedPerks(unlimited)

      if (!unlimited) {
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)
        const { count } = await supabase
          .from('recommendations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', startOfMonth.toISOString())
        setMonthlyCount(count ?? 0)
      }
    }
    fetchUsage()
  }, [supabase])

  const atRecLimit   = unlimitedPerks === false && monthlyCount !== null && monthlyCount >= FREE_LIMITS.recommendations_per_month
  const nearRecLimit = unlimitedPerks === false && monthlyCount !== null && monthlyCount >= FREE_LIMITS.recommendations_per_month - 5
  const usagePct     = monthlyCount !== null ? Math.min(100, Math.round((monthlyCount / FREE_LIMITS.recommendations_per_month) * 100)) : 0

  const { register, handleSubmit, control, watch, setValue, getValues, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      title:              prefillTitle,
      author:             prefillAuthor,
      artist:             prefillArtist,
      description:        prefillDescription,
      type:               (prefillType as any) || undefined,
      status:             (prefillStatus as any) || undefined,
      cover_url:          prefillCover,
      genres:             prefillGenres,
      official_platforms: [],
      official_links:     [],
      content_rating:     'all_ages',
      why_recommend:      '',
      alternative_titles: [],
      more_info_link:     '',
      ...(prefillYear     ? { year_released: Number(prefillYear)     } : {}),
      ...(prefillChapters ? { chapter_count: Number(prefillChapters) } : {}),
    },
  })

  const descValue = watch('description') || ''
  const whyValue  = watch('why_recommend') || ''

  useEffect(() => {
    if (prefillTitle) {
      duplicateDebounceRef.current = setTimeout(() => checkDuplicate(prefillTitle), 300)
    }
    return () => { if (duplicateDebounceRef.current) clearTimeout(duplicateDebounceRef.current) }
  }, [prefillTitle])

  const checkDuplicate = async (title: string) => {
    if (title.trim().length < 2) { setDuplicateWarning(null); setSimilarWarnings([]); return }
    setCheckingDuplicate(true)
    try {
      const res  = await fetch(`/api/recommendations/check-duplicate?title=${encodeURIComponent(title.trim())}`)
      const data = await res.json()
      setDuplicateWarning(data.duplicate ?? null)
      setSimilarWarnings(data.similar ?? [])
      setDismissedSimilar(false)
    } catch { /* silent */ } finally { setCheckingDuplicate(false) }
  }
 
  const saveCurrentFormAsDraft = async () => {
    const data = getValues()
    const response = await fetch('/api/recommendations', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...data, ...externalIds, save_as_draft: true }),
    })
    if (!response.ok) {
      const result = await response.json().catch(() => ({}))
      throw new Error(result?.error || 'Failed to save draft')
    }
  }

  const onSubmit = async (data: FormValues) => {
    if (duplicateWarning) return
    if (atRecLimit) {
      setLimitModal({ open: true, limitType: 'monthly' })
      return
    }
    setSubmitting(true)
    try {
      const response = await fetch('/api/recommendations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...data, ...externalIds }),
      })
      const result = await response.json()

      // ── Peak hour — system saved as draft automatically ──
      if (response.status === 202 && result.peak_hour) {
        setPeakHourModal({
          open:        true,
          messageType: result.message === 'peak_cap' ? 'peak_cap' : 'peak_spike',
          draftId:     result.draft_id,
        })
        return
      }

      if (response.status === 409 && result.error === 'duplicate') {
        toast(result.is_approved ? 'Already on Compicfy!' : 'Pending review already', {
          description: result.is_approved
            ? 'Upvote it, review it, or save it instead — the community builds it up together.'
            : 'This comic is already submitted and pending review.',
          action: result.is_approved
            ? { label: 'View & Upvote', onClick: () => router.push(`/comic/${result.existing_id}`) }
            : undefined,
          duration: 6000,
        })
        return
      }

      // Monthly limit reached
      if (response.status === 403) {
        setLimitModal({ open: true, limitType: 'monthly' })
        return
      }

      // Daily limit reached
      if (response.status === 429) {
        setLimitModal({ open: true, limitType: 'daily' })
        return
      }

      if (!response.ok) { toast.error(result.error || 'Failed to submit'); return }

      toast.success(
        result.recommendation.is_approved
          ? 'Recommendation published!'
          : 'Recommendation submitted for review!'
      )
      router.push(isPro ? '/pro/reader/dashboard/recommendations' : '/reader/dashboard/recommendations')
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMangaSelect = (result: any) => {
    setValue('title',       result.title              || '')
    setValue('author',      result.author             || '')
    setValue('artist',      result.artist             || '')
    setValue('description', result.description?.slice(0, 2000) || '')
    setValue('type',        result.type               || 'manga')
    setValue('status',      result.status             || 'ongoing')
    if (result.year)     setValue('year_released', result.year)
    if (result.chapters) setValue('chapter_count', result.chapters)
    if (Array.isArray(result.alternativeTitles) && result.alternativeTitles.length > 0) {
      const deduped = Array.from(new Set(
        result.alternativeTitles
          .filter((t: string) => t && t.trim() && t.trim().toLowerCase() !== (result.title ?? '').trim().toLowerCase())
      )).slice(0, 5) as string[]
      setValue('alternative_titles', deduped)
    }
    if (result.title)    checkDuplicate(result.title)
    const validGenres = ['Action','Adventure','Comedy','Drama','Fantasy','Horror','Mystery','Romance','Sci-Fi','Slice of Life','Sports','Supernatural','Thriller','Isekai','Martial Arts','School Life','Historical','Psychological','Shounen','Shoujo','Seinen','Josei','Yuri','Yaoi']
    setValue('genres', result.genres?.filter((g: string) => validGenres.includes(g)).slice(0, 5) || [])
    if (result.coverUrl && !getValues('cover_url')) setValue('cover_url', result.coverUrl)

    const id: string = result.id ?? ''
    if (id.startsWith('mangaupdates-')) setExternalIds(prev => ({ ...prev, mangaupdates_id: id.replace('mangaupdates-', '') }))
    else if (id.startsWith('anilist-'))  setExternalIds(prev => ({ ...prev, anilist_id:     id.replace('anilist-', '')     }))
    else if (id.startsWith('jikan-'))    setExternalIds(prev => ({ ...prev, mal_id:          id.replace('jikan-', '')       }))
    else if (id.startsWith('mangadex-')) setExternalIds(prev => ({ ...prev, mangadex_id:     id.replace('mangadex-', '')    }))
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

      {/* Monthly usage bar */}
      {unlimitedPerks === false && monthlyCount !== null && (
        <div className={cn(
          'rounded-2xl border p-4 space-y-3',
          atRecLimit  ? 'border-red-500/30 bg-red-500/5' :
          nearRecLimit ? 'border-amber-500/20 bg-amber-500/5' :
                         'border-border bg-card'
        )}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen size={13} className={atRecLimit ? 'text-red-500' : nearRecLimit ? 'text-amber-500' : 'text-muted-foreground'} />
              <span className="text-xs font-semibold">
                {monthlyCount} / {FREE_LIMITS.recommendations_per_month} recommendations this month
              </span>
            </div>
            {(atRecLimit || nearRecLimit) && (
              <Link href="/guidelines#submission-limits" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline shrink-0">
                <CalendarClock size={10} />
                About limits
              </Link>
            )}
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                usagePct >= 100 ? 'bg-red-500' : usagePct >= 85 ? 'bg-amber-500' : 'bg-primary'
              )}
              style={{ width: `${usagePct}%` }}
            />
          </div>
          {atRecLimit && (
            <div className="flex items-start gap-2">
              <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 font-medium">
                You've used all {FREE_LIMITS.recommendations_per_month} recommendations for this month. It resets on the 1st, in the meantime your entry can be saved as a draft.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Auto-fill banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl border border-primary/20 bg-primary/5">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={13} className="text-primary-foreground" />
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-sm font-bold text-primary">Auto-fill from external database</p>
          <MangaSearch onSelect={handleMangaSelect} />
        </div>
      </div>

      <SubmissionGuidelineBanner />

      {/* Basic Info */}
      <FormSection icon={BookOpen} title="Basic Info">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="shrink-0">
            <Controller
              name="cover_url"
              control={control}
              render={({ field }) => (
                <CoverUpload value={field.value} onChange={field.onChange} userId={userId} />
              )}
            />
          </div>
          <div className="flex-1 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-sm font-semibold">Title <span className="text-destructive">*</span></Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="e.g. One Piece, Solo Leveling, Tower of God…"
                className="h-11 text-base"
                onChange={(e) => {
                  register('title').onChange(e)
                  if (duplicateDebounceRef.current) clearTimeout(duplicateDebounceRef.current)
                  duplicateDebounceRef.current = setTimeout(() => checkDuplicate(e.target.value), 600)
                }}
              />
              {checkingDuplicate && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 size={11} className="animate-spin" /> Checking for duplicates…
                </p>
              )}
              {duplicateWarning && (
                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <Sparkles size={14} className="text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        "{duplicateWarning.title}" is already on ComPicfy!
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {duplicateWarning.is_approved
                          ? "Instead of a duplicate entry, join in on this one, upvote it, leave your own review, or save it. That's how the community builds it up together."
                          : "It's currently pending review, once it's live you'll be able to upvote it, review it, or save it."}
                      </p>
                    </div>
                  </div>
                  {duplicateWarning.is_approved && (
                    <div className="flex flex-wrap gap-2 pl-[26px]">
                      <Link href={`/comic/${duplicateWarning.id}`}>
                        <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1.5">
                          View & Upvote
                        </Button>
                      </Link>
                      <Link href={`/comic/${duplicateWarning.id}#reviews`}>
                        <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1.5">
                          Write a Review
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
              {!duplicateWarning && similarWarnings.length > 0 && !dismissedSimilar && (
                <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-foreground">
                        This looks similar to {similarWarnings.length === 1 ? 'an existing comic' : `${similarWarnings.length} existing comics`}
                      </p>
                      <div className="mt-1.5 space-y-1">
                        {similarWarnings.slice(0, 3).map(s => (
                          <p key={s.id} className="text-xs text-muted-foreground">
                            "{s.title}" <span className="text-muted-foreground/60">({s.similarity}% similar)</span>
                          </p>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                        If this is genuinely a different title, you can continue. If it's the same comic under a different name, please search for it above instead of submitting a duplicate.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 pl-[26px]">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setDismissedSimilar(true)}
                    >
                      This is a different comic, continue
                    </Button>
                  </div>
                </div>
              )}
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="author" className="text-sm font-semibold">Author</Label>
                <Input id="author" {...register('author')} placeholder="Author name" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="artist" className="text-sm font-semibold">Artist</Label>
                <Input id="artist" {...register('artist')} placeholder="Artist name" className="h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="year_released" className="text-sm font-semibold">Year</Label>
                <Input id="year_released" type="number" {...register('year_released')} placeholder="e.g. 2020" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="chapter_count" className="text-sm font-semibold">Chapters</Label>
                <Input id="chapter_count" type="number" {...register('chapter_count')} placeholder="e.g. 100" className="h-10" />
              </div>
            </div>
          </div>
        </div>
      </FormSection>

      {/* Classification */}
      <FormSection icon={Tag} title="Classification" accent="bg-blue-500">
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Type <span className="text-destructive">*</span></Label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {TYPES.map(({ value, label, desc, activeClass }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => field.onChange(value)}
                    className={cn(
                      'flex flex-col items-center gap-0.5 px-2 py-2.5 rounded-xl border text-sm font-semibold transition-all',
                      field.value === value
                        ? activeClass
                        : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    )}
                  >
                    {label}
                    <span className={cn('text-[10px] font-normal', field.value === value ? 'opacity-75' : 'opacity-60')}>{desc}</span>
                  </button>
                ))}
              </div>
            )}
          />
          {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Status <span className="text-destructive">*</span></Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {STATUSES.map(({ value, label, dot }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => field.onChange(value)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all',
                        field.value === value
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                          : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                      )}
                    >
                      <span className={cn('w-2 h-2 rounded-full shrink-0', field.value === value ? 'bg-primary-foreground/80' : dot)} />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            />
            {errors.status && <p className="text-xs text-destructive">{errors.status.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Content Rating</Label>
            <Controller
              name="content_rating"
              control={control}
              render={({ field }) => (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {RATINGS.map(({ value, label, emoji }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => field.onChange(value)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all',
                          field.value === value
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                            : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                        )}
                      >
                        <span className="leading-none">{emoji}</span>
                        {label}
                      </button>
                    ))}
                  </div>
                  {field.value === 'adult' && (
                    <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 space-y-2">
                      <p className="text-xs font-black text-destructive flex items-center gap-1.5">
                        <AlertTriangle size={12} /> Adult Content Rules
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside leading-relaxed">
                        <li>Must link to a verified official platform</li>
                        <li>Cover must be official promotional art, no explicit imagery</li>
                        <li>Requires manual admin approval</li>
                        <li>Violations result in removal &amp; account suspension</li>
                      </ul>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" className="mt-0.5 accent-destructive" onChange={(e) => setValue('adult_content_confirmed', e.target.checked)} />
                        <span className="text-xs text-muted-foreground">I confirm this submission follows all adult content rules</span>
                      </label>
                    </div>
                  )}
                </div>
              )}
            />
          </div>
        </div>
      </FormSection>

      {/* Genres */}
      <FormSection icon={Tag} title="Genres" accent="bg-rose-500">
        <Controller
          name="genres"
          control={control}
          render={({ field }) => (
            <GenreSelector value={field.value} onChange={field.onChange} error={errors.genres?.message} />
          )}
        />
      </FormSection>

      {/* Description */}
      <FormSection icon={FileText} title="Description" accent="bg-amber-500">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="description" className="text-sm font-semibold">Description <span className="text-destructive">*</span></Label>
            <span className="text-xs text-muted-foreground">{descValue.length}/2000</span>
          </div>
          <Textarea id="description" {...register('description')} placeholder="What is this comic about?" rows={4} className="resize-none" />
          {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
        </div>
        <div className="space-y-1.5 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="why_recommend" className="text-sm font-black text-primary">
                Why do you recommend it?
              </Label>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Optional, but recs with a personal reason get far more votes.
              </p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{whyValue.length}/1000</span>
          </div>
          <Textarea
            id="why_recommend"
            {...register('why_recommend')}
            placeholder='e.g. "If you loved Tower of God, this hits the same notes but with better art."'
            rows={3}
            className="resize-none border-primary/20 focus:border-primary bg-background"
          />
        </div>
      </FormSection>

      {/* Platforms */}
      <FormSection icon={Globe} title="Official Platforms" accent="bg-teal-500">
        <Controller
          name="official_platforms"
          control={control}
          render={({ field: platformField }) => (
            <Controller
              name="official_links"
              control={control}
              render={({ field: linksField }) => (
                <PlatformSelector
                  value={platformField.value}
                  onChange={platformField.onChange}
                  links={linksField.value}
                  onLinksChange={linksField.onChange}
                  error={errors.official_platforms?.message}
                />
              )}
            />
          )}
        />
      </FormSection>

      <FormSection icon={Link2} title="More Info Link" accent="bg-sky-500">
        <div className="space-y-1.5">
          <Label htmlFor="more_info_link" className="text-sm font-semibold">
            External reference <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="more_info_link"
            {...register('more_info_link')}
            placeholder="e.g. https://www.mangaupdates.com/series/..."
            className="h-10"
          />
          <p className="text-[11px] text-muted-foreground leading-snug">
            Link to a MangaUpdates entry or similar database page. Leave blank and we'll try to find one automatically.
          </p>
          {errors.more_info_link && <p className="text-xs text-destructive">{errors.more_info_link.message}</p>}
        </div>
      </FormSection>

      {/* Info notice */}
      <div className="flex gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/15">
        <Info size={15} className="text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Your recommendation will be reviewed by our team before being published.
        </p>
      </div>

      {/* Submit row */}
      <div className="flex items-center justify-between pt-1">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            submitting ||
            !!duplicateWarning ||
            atRecLimit ||
            (watch('content_rating') === 'adult' && !watch('adult_content_confirmed'))
          }
          className="gap-2 min-w-44"
        >
          {atRecLimit ? (
            <><CalendarClock size={15} /> Monthly Limit Reached</>
          ) : submitting ? (
            <><Loader2 size={15} className="animate-spin" /> Submitting…</>
          ) : (
            <><BookOpen size={15} /> Submit Recommendation</>
          )}
        </Button>
      </div>

      <PeakHourModal
        isOpen={peakHourModal.open}
        onClose={() => setPeakHourModal(p => ({ ...p, open: false }))}
        messageType={peakHourModal.messageType}
        onSaveDraft={async () => {
          // Draft was already auto-saved by the server — just redirect to dashboard
          router.push(
            isPro
              ? '/pro/reader/dashboard/recommendations'
              : '/reader/dashboard/recommendations'
          )
          router.refresh()
        }}
      />

      <LimitReachedModal
        isOpen={limitModal.open}
        onClose={() => setLimitModal(m => ({ ...m, open: false }))}
        limitType={limitModal.limitType}
        onSaveDraft={saveCurrentFormAsDraft}
      />
    </form>
  )
}