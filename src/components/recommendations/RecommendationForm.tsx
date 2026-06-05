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
import {
  Loader2, BookOpen, Info, AlertTriangle, Sparkles,
  Tag, FileText, Globe, Crown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MangaSearch } from './MangaSearch'
import { createClient } from '@/lib/supabase/client'

const FREE_REC_LIMIT = 50

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Max 200 characters'),
  description: z.string().min(10, 'At least 10 characters').max(2000, 'Max 2000 characters'),
  type: z.enum(['manga', 'manhwa', 'manhua', 'webtoon', 'comic', 'other']),
  status: z.enum(['ongoing', 'completed', 'hiatus', 'cancelled']),
  genres: z.array(z.string()).min(1, 'Select at least one genre').max(5),
  official_platforms: z.array(z.string()).min(1, 'Select at least one platform'),
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
  const [checkingDuplicate,  setCheckingDuplicate]  = useState(false)
  const duplicateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [externalIds, setExternalIds] = useState<{
    mangaupdates_id?: string
    anilist_id?:      string
    mal_id?:          string
    mangadex_id?:     string
  }>({})

  const [monthlyCount, setMonthlyCount] = useState<number | null>(null)
  const [isPro,        setIsPro]        = useState<boolean | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchUsage = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('is_pro, pro_expires_at, role')
        .eq('id', user.id)
        .single()

      if (!profile) return

      const proStatus =
        profile.role === 'admin' ||
        ['admin', 'moderator'].includes(profile.role) ||
        (profile.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))

      setIsPro(proStatus)

      if (!proStatus) {
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

  const atRecLimit   = isPro === false && monthlyCount !== null && monthlyCount >= FREE_REC_LIMIT
  const nearRecLimit = isPro === false && monthlyCount !== null && monthlyCount >= FREE_REC_LIMIT - 5
  const usagePct     = monthlyCount !== null ? Math.min(100, Math.round((monthlyCount / FREE_REC_LIMIT) * 100)) : 0

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
      content_rating:     'all_ages',
      why_recommend:      '',
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
    if (title.trim().length < 2) { setDuplicateWarning(null); return }
    setCheckingDuplicate(true)
    try {
      const res  = await fetch(`/api/recommendations/check-duplicate?title=${encodeURIComponent(title.trim())}`)
      const data = await res.json()
      setDuplicateWarning(data.duplicate ?? null)
    } catch { /* silent */ } finally { setCheckingDuplicate(false) }
  }

  const onSubmit = async (data: FormValues) => {
    if (duplicateWarning) return
    if (atRecLimit) {
      toast.error('Monthly limit reached. Upgrade to Pro for unlimited submissions.')
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

      if (response.status === 409 && result.error === 'duplicate') {
        toast.error(result.message, {
          description: result.is_approved ? 'View the existing recommendation instead.' : 'This comic is already pending review.',
          action: result.is_approved ? { label: 'View Comic', onClick: () => router.push(`/comic/${result.existing_id}`) } : undefined,
          duration: 6000,
        })
        return
      }

      if (response.status === 403) {
        toast.error(
          <div className="flex flex-col gap-1.5">
            <p className="font-black text-sm">Monthly limit reached</p>
            <p className="text-xs text-muted-foreground">{result.message}</p>
            <Link href="/pricing" className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1 mt-0.5">
              <Crown size={11} />
              Upgrade to Pro for unlimited
            </Link>
          </div>,
          { duration: 6000 }
        )
        return
      }

      if (!response.ok) { toast.error(result.error || 'Failed to submit'); return }
      toast.success(result.recommendation.is_approved ? 'Recommendation published!' : 'Recommendation submitted for review!')
      router.push(isPro ? '/pro/reader/dashboard/recommendations' : '/reader/dashboard/recommendations')
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong')
    } finally { setSubmitting(false) }
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
      {isPro === false && monthlyCount !== null && (
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
                {monthlyCount} / {FREE_REC_LIMIT} recommendations this month
              </span>
            </div>
            {(atRecLimit || nearRecLimit) && (
              <Link href="/pricing" className="inline-flex items-center gap-1 text-xs font-bold text-amber-500 hover:underline shrink-0">
                <Crown size={10} className="fill-amber-500" />
                Go unlimited
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
                You've used all {FREE_REC_LIMIT} recommendations for this month.{' '}
                <Link href="/pricing" className="underline font-bold">Upgrade to Pro</Link> for unlimited submissions.
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
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                  <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-destructive">Already recommended!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      "{duplicateWarning.title}" exists.{' '}
                      {duplicateWarning.is_approved
                        ? <Link href={`/comic/${duplicateWarning.id}`} className="text-primary hover:underline font-semibold">View it →</Link>
                        : 'Currently pending review.'}
                    </p>
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
          render={({ field }) => (
            <PlatformSelector value={field.value} onChange={field.onChange} error={errors.official_platforms?.message} />
          )}
        />
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
          className={cn(
            'gap-2 min-w-44',
            atRecLimit && 'bg-gradient-to-r from-amber-400 to-orange-500 border-0 shadow-lg shadow-amber-500/20 cursor-not-allowed'
          )}
        >
          {atRecLimit ? (
            <><Crown size={15} /> Limit Reached, Upgrade</>
          ) : submitting ? (
            <><Loader2 size={15} className="animate-spin" /> Submitting…</>
          ) : (
            <><BookOpen size={15} /> Submit Recommendation</>
          )}
        </Button>
      </div>
    </form>
  )
}
