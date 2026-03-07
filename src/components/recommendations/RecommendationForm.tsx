'use client'

import { useState, useRef, useEffect } from 'react' // Added useRef and useEffect
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link' // Added Link
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { CoverUpload } from './CoverUpload'
import { GenreSelector } from './GenreSelector'
import { PlatformSelector } from './PlatformSelector'
import { toast } from 'sonner'
import { Loader2, BookOpen, Info, AlertTriangle } from 'lucide-react' // Added AlertTriangle
import { cn } from '@/lib/utils'
import { MangaSearch } from './MangaSearch'

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
  { value: 'manga', label: 'Manga', desc: 'Japanese' },
  { value: 'manhwa', label: 'Manhwa', desc: 'Korean' },
  { value: 'manhua', label: 'Manhua', desc: 'Chinese' },
  { value: 'webtoon', label: 'Webtoon', desc: 'Vertical scroll' },
  { value: 'comic', label: 'Comic', desc: 'Western' },
  { value: 'other', label: 'Other', desc: 'Misc' },
] as const

const STATUSES = [
  { value: 'ongoing', label: 'Ongoing', color: 'text-green-500' },
  { value: 'completed', label: 'Completed', color: 'text-blue-500' },
  { value: 'hiatus', label: 'On Hiatus', color: 'text-yellow-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'text-destructive' },
] as const

const RATINGS = [
  { value: 'all_ages', label: 'All Ages' },
  { value: 'teen', label: 'Teen (13+)' },
  { value: 'mature', label: 'Mature (17+)' },
  { value: 'adult', label: 'Adult (18+)' },
] as const

interface Props {
  userId: string
}

export function RecommendationForm({ userId }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  
  // New Duplicate Check State
  const [duplicateWarning, setDuplicateWarning] = useState<{ id: string; title: string; is_approved: boolean } | null>(null)
  const [checkingDuplicate, setCheckingDuplicate] = useState(false)
  const duplicateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      genres: [],
      official_platforms: [],
      cover_url: '',
      content_rating: 'all_ages',
      why_recommend: '',
      author: '',
      artist: '',
    },
  })

  const descValue = watch('description') || ''
  const whyValue = watch('why_recommend') || ''

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (duplicateDebounceRef.current) clearTimeout(duplicateDebounceRef.current)
    }
  }, [])

  const checkDuplicate = async (title: string) => {
    if (title.trim().length < 2) {
      setDuplicateWarning(null)
      return
    }
    setCheckingDuplicate(true)
    try {
      const res = await fetch(
        `/api/recommendations/check-duplicate?title=${encodeURIComponent(title.trim())}`
      )
      const data = await res.json()
      setDuplicateWarning(data.duplicate ?? null)
    } catch {
      // silent fail
    } finally {
      setCheckingDuplicate(false)
    }
  }

  const onSubmit = async (data: FormValues) => {
    if (duplicateWarning) return; // Guard clause
    setSubmitting(true)
    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.status === 409 && result.error === 'duplicate') {
        toast.error(result.message, {
          description: result.is_approved
            ? 'View the existing recommendation instead.'
            : 'This comic is already pending review.',
          action: result.is_approved
            ? {
                label: 'View Comic',
                onClick: () => router.push(`/comic/${result.existing_id}`),
              }
            : undefined,
          duration: 6000,
        })
        return
      }

      if (!response.ok) {
        toast.error(result.error || 'Failed to submit')
        return
      }

      toast.success(
        result.recommendation.is_approved
          ? 'Recommendation published!'
          : 'Recommendation submitted for review!'
      )

      router.push('/dashboard/recommendations')
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMangaSelect = (result: any) => {
    setValue('title', result.title || '')
    setValue('author', result.author || '')
    setValue('artist', result.artist || '')
    setValue('description', result.description?.slice(0, 2000) || '')
    setValue('type', result.type || 'manga')
    setValue('status', result.status || 'ongoing')
    if (result.year) setValue('year_released', result.year)
    if (result.chapters) setValue('chapter_count', result.chapters)

    // Run duplicate check on the selected title
    if (result.title) checkDuplicate(result.title)

    const validGenres = [
      'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
      'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports',
      'Supernatural', 'Thriller', 'Isekai', 'Martial Arts', 'School Life',
      'Historical', 'Psychological', 'Shounen', 'Shoujo', 'Seinen', 'Josei','Yuri', 'Yaoi',
    ]
    const matchedGenres = result.genres
      ?.filter((g: string) => validGenres.includes(g))
      .slice(0, 5) || []
    setValue('genres', matchedGenres)

    if (result.coverUrl && !getValues('cover_url')) {
      setValue('cover_url', result.coverUrl)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Manga API Search */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-4">
        <MangaSearch onSelect={handleMangaSelect} />
      </div>

      <Separator />

      {/* Cover + Title row */}
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="shrink-0">
          <Controller
            name="cover_url"
            control={control}
            render={({ field }) => (
              <CoverUpload
                value={field.value}
                onChange={field.onChange}
                userId={userId}
              />
            )}
          />
        </div>

        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="e.g. One Piece, Solo Leveling, Tower of God..."
              className="text-base"
              onChange={(e) => {
                register('title').onChange(e) // Vital: keeps react-hook-form in sync
                if (duplicateDebounceRef.current) clearTimeout(duplicateDebounceRef.current)
                duplicateDebounceRef.current = setTimeout(() => checkDuplicate(e.target.value), 600)
              }}
            />
            
            {/* Checking status */}
            {checkingDuplicate && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 size={11} className="animate-spin" />
                Checking for duplicates...
              </p>
            )}

            {/* Duplicate warning block */}
            {duplicateWarning && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs text-destructive font-medium">
                    This comic has already been recommended!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    "{duplicateWarning.title}" already exists.{' '}
                    {duplicateWarning.is_approved ? (
                      <Link
                        href={`/comic/${duplicateWarning.id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        View it here →
                      </Link>
                    ) : (
                      'It is currently pending review.'
                    )}
                  </p>
                </div>
              </div>
            )}

            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input id="author" {...register('author')} placeholder="Author name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artist">Artist</Label>
              <Input id="artist" {...register('artist')} placeholder="Artist name" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="year_released">Year Released</Label>
              <Input
                id="year_released"
                type="number"
                {...register('year_released')}
                placeholder="e.g. 2020"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chapter_count">Chapters</Label>
              <Input
                id="chapter_count"
                type="number"
                {...register('chapter_count')}
                placeholder="e.g. 100"
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Type selection */}
      <div className="space-y-3">
        <Label>Type <span className="text-destructive">*</span></Label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {TYPES.map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => field.onChange(value)}
                  className={cn(
                    'flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all',
                    field.value === value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:border-primary text-muted-foreground hover:text-foreground'
                  )}
                >
                  {label}
                  <span className={cn(
                    'text-[10px] font-normal',
                    field.value === value ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  )}>
                    {desc}
                  </span>
                </button>
              ))}
            </div>
          )}
        />
        {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Status */}
        <div className="space-y-3">
          <Label>Status <span className="text-destructive">*</span></Label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-2">
                {STATUSES.map(({ value, label, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => field.onChange(value)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                      field.value === value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:border-primary text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <span className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      field.value === value ? 'bg-primary-foreground' : color.replace('text-', 'bg-')
                    )} />
                    {label}
                  </button>
                ))}
              </div>
            )}
          />
          {errors.status && <p className="text-xs text-destructive">{errors.status.message}</p>}
        </div>

       {/* Content Rating */}
        <div className="space-y-3">
          <Label>Content Rating</Label>
          <Controller
            name="content_rating"
            control={control}
            render={({ field }) => (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {RATINGS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => field.onChange(value)}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                        field.value === value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:border-primary text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Adult warning box */}
                {field.value === 'adult' && (
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 space-y-2">
                    <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                      <AlertTriangle size={13} />
                      Adult Content Rules
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Must link to a verified official platform (Lezhin,Toomics etc.)</li>
                      <li>Cover image must be official promotional art — no explicit imagery</li>
                      <li>All adult submissions require manual admin approval</li>
                      <li>Violations will result in removal and account suspension</li>
                    </ul>
                    <label className="flex items-start gap-2 mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-destructive"
                        onChange={(e) => setValue('adult_content_confirmed', e.target.checked)}
                      />
                      <span className="text-xs text-muted-foreground">
                        I confirm this submission follows all adult content rules above
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label>Genres <span className="text-destructive">*</span></Label>
        <Controller
          name="genres"
          control={control}
          render={({ field }) => (
            <GenreSelector
              value={field.value}
              onChange={field.onChange}
              error={errors.genres?.message}
            />
          )}
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
          <span className="text-xs text-muted-foreground">{descValue.length}/2000</span>
        </div>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="What is this comic about?..."
          rows={4}
          className="resize-none"
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="why_recommend">Why do you recommend it? <span className="text-muted-foreground font-normal ml-1">(optional)</span></Label>
          <span className="text-xs text-muted-foreground">{whyValue.length}/1000</span>
        </div>
        <Textarea
          id="why_recommend"
          {...register('why_recommend')}
          placeholder="What makes this special?..."
          rows={3}
          className="resize-none"
        />
      </div>

      <Separator />

      <div className="space-y-3">
        <Label>Official Platforms <span className="text-destructive">*</span></Label>
        <Controller
          name="official_platforms"
          control={control}
          render={({ field }) => (
            <PlatformSelector
              value={field.value}
              onChange={field.onChange}
              error={errors.official_platforms?.message}
            />
          )}
        />
      </div>

      <Separator />

      <div className="flex gap-2 p-3 rounded-lg bg-muted/50 border border-border">
        <Info size={16} className="text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Your recommendation will be reviewed by our team before being published.
        </p>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting || !!duplicateWarning || (watch('content_rating') === 'adult' && !watch('adult_content_confirmed'))}
          className="gap-2 min-w-36"
        >
          {submitting ? (
            <><Loader2 size={15} className="animate-spin" />Submitting...</>
          ) : (
            <><BookOpen size={15} />Submit Recommendation</>
          )}
        </Button>
      </div>
    </form>
  )
}