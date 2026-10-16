'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CoverUpload } from './CoverUpload'
import { GenreSelector } from './GenreSelector'
import { PlatformSelector } from './PlatformSelector'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const formSchema = z.object({
  title:              z.string().min(1, 'Title is required').max(200),
  description:        z.string().min(10, 'At least 10 characters').max(2000),
  type:               z.enum(['manga', 'manhwa', 'manhua', 'webtoon', 'comic', 'other']),
  status:             z.enum(['ongoing', 'completed', 'hiatus', 'cancelled']),
  genres:             z.array(z.string()).min(1, 'Select at least one genre').max(5),
  official_platforms: z.array(z.string()).min(1, 'Select at least one platform'),
  official_links:     z.array(z.string()).default([]),
  cover_url:          z.string().default(''),
  banner_url:         z.string().default(''),
  content_rating:     z.enum(['all_ages', 'teen', 'mature', 'adult']).default('all_ages'),
  why_recommend:      z.string().max(1000).default(''),
  author:             z.string().max(100).default(''),
  artist:             z.string().max(100).default(''),
  year_released: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(1900).max(new Date().getFullYear() + 1).optional()
  ),
  chapter_count: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(1).optional()
  ),
  more_info_link: z.string().max(500).default('').refine(
    (val) => !val || /^https?:\/\/.+/.test(val),
    { message: 'Must be a valid URL starting with http:// or https://' }
  ),
})

type FormValues = z.infer<typeof formSchema>

const TYPES = [
  { value: 'manga',   label: 'Manga',   desc: 'Japanese' },
  { value: 'manhwa',  label: 'Manhwa',  desc: 'Korean'   },
  { value: 'manhua',  label: 'Manhua',  desc: 'Chinese'  },
  { value: 'webtoon', label: 'Webtoon', desc: 'Vertical' },
  { value: 'comic',   label: 'Comic',   desc: 'Western'  },
  { value: 'other',   label: 'Other',   desc: 'Misc'     },
] as const

const STATUSES = [
  { value: 'ongoing',   label: 'Ongoing'   },
  { value: 'completed', label: 'Completed' },
  { value: 'hiatus',    label: 'On Hiatus' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

const RATINGS = [
  { value: 'all_ages', label: 'All Ages'   },
  { value: 'teen',     label: 'Teen 13+'   },
  { value: 'mature',   label: 'Mature 17+' },
  { value: 'adult',    label: 'Adult 18+'  },
] as const

function FormSection({ title, danger = false, children }: {
  title:    string
  danger?:  boolean
  children: React.ReactNode
}) {
  return (
    <section className={cn('rounded-xl border bg-card overflow-hidden', danger ? 'border-destructive/30' : 'border-border')}>
      <div className="px-5 py-3.5 border-b border-border">
        <h3 className={cn('text-[11px] uppercase tracking-widest', danger ? 'text-destructive' : 'text-muted-foreground')}>{title}</h3>
      </div>
      <div className="p-5 space-y-5">{children}</div>
    </section>
  )
}

interface Props {
  recommendation: any
  userId: string
}

export function EditRecommendationForm({ recommendation: rec, userId }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const isProPath = pathname.startsWith('/pro')
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, control, watch, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      title:              rec.title              ?? '',
      description:        rec.description        ?? '',
      type:               rec.type               ?? 'manga',
      status:             rec.status             ?? 'ongoing',
      genres:             rec.genres             ?? [],
      official_platforms: rec.official_platforms ?? [],
      official_links:     rec.official_links     ?? [],
      cover_url:          rec.cover_url          ?? '',
      banner_url:         rec.banner_url         ?? '',
      content_rating:     (rec.content_rating === 'all' ? 'all_ages' : rec.content_rating) ?? 'all_ages',
      why_recommend:      rec.why_recommend      ?? '',
      author:             rec.author             ?? '',
      artist:             rec.artist             ?? '',
      year_released:      rec.year_released      ?? undefined,
      chapter_count:      rec.chapter_count      ?? undefined,
      more_info_link:     rec.more_info_link     ?? '',
    },
  })

  const descValue = watch('description') || ''
  const whyValue  = watch('why_recommend') || ''

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/recommendations/${rec.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      })
      const result = await response.json()
      if (!response.ok) { toast.error(result.error || 'Failed to update'); return }
      toast.success('Recommendation updated! It will be reviewed before going live.')
      router.push(isProPath ? '/pro/reader/dashboard/recommendations' : '/reader/dashboard/recommendations')
      router.refresh()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

      {/* Basic Info */}
      <FormSection title="Basic Info">
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
              <Label htmlFor="title" className="text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input id="title" {...register('title')} placeholder="e.g. One Piece, Solo Leveling…" className="h-11 text-base" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="author" className="text-sm font-medium">Author</Label>
                <Input id="author" {...register('author')} placeholder="Author name" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="artist" className="text-sm font-medium">Artist</Label>
                <Input id="artist" {...register('artist')} placeholder="Artist name" className="h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="year_released" className="text-sm font-medium">Year</Label>
                <Input id="year_released" type="number" {...register('year_released')} placeholder="e.g. 2020" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="chapter_count" className="text-sm font-medium">Chapters</Label>
                <Input id="chapter_count" type="number" {...register('chapter_count')} placeholder="e.g. 100" className="h-10" />
              </div>
            </div>
          </div>
        </div>
        <div className="pt-2">
          <Controller
            name="banner_url"
            control={control}
            render={({ field }) => (
              <CoverUpload variant="banner" value={field.value ?? ''} onChange={field.onChange} userId={userId} />
            )}
          />
        </div>
      </FormSection>

      {/* Classification */}
      <FormSection title="Classification">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Type <span className="text-destructive">*</span></Label>
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
                      'flex flex-col items-center gap-0.5 px-2 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                      field.value === value
                        ? 'bg-foreground text-background border-foreground'
                        : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                    )}
                  >
                    {label}
                    <span className={cn('text-[10px] font-normal', field.value === value ? 'opacity-75' : 'opacity-60')}>{desc}</span>
                  </button>
                ))}
              </div>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status <span className="text-destructive">*</span></Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {STATUSES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => field.onChange(value)}
                      className={cn(
                        'flex items-center justify-center px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                        field.value === value
                          ? 'bg-foreground text-background border-foreground'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Content Rating</Label>
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
                        'flex items-center justify-center px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                        field.value === value
                          ? 'bg-foreground text-background border-foreground'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
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
      </FormSection>

      {/* Genres */}
      <FormSection title="Genres">
        <Controller
          name="genres"
          control={control}
          render={({ field }) => (
            <GenreSelector value={field.value} onChange={field.onChange} error={errors.genres?.message} />
          )}
        />
      </FormSection>

      {/* Description */}
      <FormSection title="Description">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="description" className="text-sm font-medium">
              Description <span className="text-destructive">*</span>
            </Label>
            <span className="text-xs text-muted-foreground tabular-nums">{descValue.length}/2000</span>
          </div>
          <Textarea id="description" {...register('description')} placeholder="What is this comic about?" rows={4} className="resize-none" />
          {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="why_recommend" className="text-sm font-medium">
              Why do you recommend it?
              <span className="text-muted-foreground font-normal ml-1">(optional)</span>
            </Label>
            <span className="text-xs text-muted-foreground tabular-nums">{whyValue.length}/1000</span>
          </div>
          <Textarea id="why_recommend" {...register('why_recommend')} placeholder="What makes this special?" rows={3} className="resize-none" />
        </div>
      </FormSection>

      {/* Platforms */}
      <FormSection title="Official Platforms">
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

      {/* More Info Link */}
      <FormSection title="More Info Link">
        <div className="space-y-1.5">
          <Label htmlFor="more_info_link" className="text-sm font-medium">
            External reference <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="more_info_link"
            {...register('more_info_link')}
            placeholder="e.g. https://www.mangaupdates.com/series/..."
            className="h-10"
          />
          <p className="text-[11px] text-muted-foreground leading-snug">
            Link to a MangaUpdates entry or similar database page.
          </p>
          {errors.more_info_link && <p className="text-xs text-destructive">{errors.more_info_link.message}</p>}
        </div>
      </FormSection>

      {/* Submit row */}
      <div className="flex items-center justify-between pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push(isProPath ? '/pro/reader/dashboard/recommendations' : '/reader/dashboard/recommendations')}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting || !isDirty}
          size="sm"
          className="min-w-44"
        >
          {submitting
            ? <><Loader2 size={14} className="animate-spin mr-2" />Saving…</>
            : 'Save Changes'
          }
        </Button>
      </div>
    </form>
  )
}