'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { CoverUpload } from './CoverUpload'
import { GenreSelector } from './GenreSelector'
import { PlatformSelector } from './PlatformSelector'
import { toast } from 'sonner'
import { Loader2, BookOpen, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Max 200 characters'),
  description: z.string().min(10, 'At least 10 characters').max(2000, 'Max 2000 characters'),
  type: z.enum(['manga', 'manhwa', 'manhua', 'webtoon', 'comic', 'other']),
  status: z.enum(['ongoing', 'completed', 'hiatus', 'cancelled']),
  genres: z.array(z.string()).min(1, 'Select at least one genre').max(5),
  official_platforms: z.array(z.string()).min(1, 'Select at least one platform'),
  cover_url: z.string().default(''),
  content_rating: z.enum(['all', 'teen', 'mature', 'adult']).default('all'),
  why_recommend: z.string().max(1000).default(''),
  author: z.string().max(100).default(''),
  artist: z.string().max(100).default(''),
  // ✅ Zod v4 fix — preprocess instead of coerce for proper number typing
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
  { value: 'all', label: 'All Ages' },
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

  // ✅ Explicitly pass FormValues as generic to fix SubmitHandler mismatch
const {
  register,
  handleSubmit,
  control,
  watch,
  formState: { errors },
} = useForm<FormValues>({
  resolver: zodResolver(formSchema) as any,
  defaultValues: {
    genres: [],
    official_platforms: [],
    cover_url: '',
    content_rating: 'all',
    why_recommend: '',
    author: '',
    artist: '',
  },
})

  const descValue = watch('description') || ''
  const whyValue = watch('why_recommend') || ''

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true)
    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

      {/* Cover + Title row */}
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Cover upload */}
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

        {/* Title + basic info */}
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
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Author + Artist */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                {...register('author')}
                placeholder="Author name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artist">Artist</Label>
              <Input
                id="artist"
                {...register('artist')}
                placeholder="Artist name"
              />
            </div>
          </div>

          {/* Year + Chapters */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="year_released">Year Released</Label>
              <Input
                id="year_released"
                type="number"
                {...register('year_released')}
                placeholder="e.g. 2020"
                min={1900}
                max={new Date().getFullYear() + 1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chapter_count">Chapters</Label>
              <Input
                id="chapter_count"
                type="number"
                {...register('chapter_count')}
                placeholder="e.g. 100"
                min={1}
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Type selection */}
      <div className="space-y-3">
        <Label>
          Type <span className="text-destructive">*</span>
        </Label>
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
        {errors.type && (
          <p className="text-xs text-destructive">{errors.type.message}</p>
        )}
      </div>

      {/* Status + Rating row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Status */}
        <div className="space-y-3">
          <Label>
            Status <span className="text-destructive">*</span>
          </Label>
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
          {errors.status && (
            <p className="text-xs text-destructive">{errors.status.message}</p>
          )}
        </div>

        {/* Content Rating */}
        <div className="space-y-3">
          <Label>Content Rating</Label>
          <Controller
            name="content_rating"
            control={control}
            render={({ field }) => (
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
            )}
          />
        </div>
      </div>

      <Separator />

      {/* Genres */}
      <div className="space-y-3">
        <Label>
          Genres <span className="text-destructive">*</span>
        </Label>
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

      {/* Description */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="description">
            Description <span className="text-destructive">*</span>
          </Label>
          <span className="text-xs text-muted-foreground">
            {descValue.length}/2000
          </span>
        </div>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="What is this comic about? Give readers a good overview of the story, setting, and main characters..."
          rows={4}
          className="resize-none"
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Why recommend */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="why_recommend">
            Why do you recommend it?
            <span className="text-muted-foreground font-normal ml-1">(optional)</span>
          </Label>
          <span className="text-xs text-muted-foreground">
            {whyValue.length}/1000
          </span>
        </div>
        <Textarea
          id="why_recommend"
          {...register('why_recommend')}
          placeholder="What makes this special? Why should someone read it? What type of reader would enjoy it most?"
          rows={3}
          className="resize-none"
        />
      </div>

      <Separator />

      {/* Platforms */}
      <div className="space-y-3">
        <div>
          <Label>
            Official Platforms <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            Where can readers find this legally?
          </p>
        </div>
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

      {/* Info notice */}
      <div className="flex gap-2 p-3 rounded-lg bg-muted/50 border border-border">
        <Info size={16} className="text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Your recommendation will be reviewed by our team before being published. This usually takes less than 24 hours. Admins and moderators are published instantly.
        </p>
      </div>

      {/* Submit */}
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
          disabled={submitting}
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