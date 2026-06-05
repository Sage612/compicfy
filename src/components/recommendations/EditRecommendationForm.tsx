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
import { Loader2, BookOpen, Tag, FileText, Globe, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

const formSchema = z.object({
  title:              z.string().min(1, 'Title is required').max(200),
  description:        z.string().min(10, 'At least 10 characters').max(2000),
  type:               z.enum(['manga', 'manhwa', 'manhua', 'webtoon', 'comic', 'other']),
  status:             z.enum(['ongoing', 'completed', 'hiatus', 'cancelled']),
  genres:             z.array(z.string()).min(1, 'Select at least one genre').max(5),
  official_platforms: z.array(z.string()).min(1, 'Select at least one platform'),
  cover_url:          z.string().default(''),
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
})

type FormValues = z.infer<typeof formSchema>

const TYPES = [
  { value: 'manga',   label: 'Manga',   desc: 'Japanese', activeClass: 'bg-rose-500   border-rose-500   text-white' },
  { value: 'manhwa',  label: 'Manhwa',  desc: 'Korean',   activeClass: 'bg-teal-500   border-teal-500   text-white' },
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
      cover_url:          rec.cover_url          ?? '',
      content_rating:     (rec.content_rating === 'all' ? 'all_ages' : rec.content_rating) ?? 'all_ages',
      why_recommend:      rec.why_recommend      ?? '',
      author:             rec.author             ?? '',
      artist:             rec.artist             ?? '',
      year_released:      rec.year_released      ?? undefined,
      chapter_count:      rec.chapter_count      ?? undefined,
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
              <Label htmlFor="title" className="text-sm font-semibold">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input id="title" {...register('title')} placeholder="e.g. One Piece, Solo Leveling…" className="h-11 text-base" />
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
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Content Rating</Label>
            <Controller
              name="content_rating"
              control={control}
              render={({ field }) => (
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
            <Label htmlFor="description" className="text-sm font-semibold">
              Description <span className="text-destructive">*</span>
            </Label>
            <span className="text-xs text-muted-foreground">{descValue.length}/2000</span>
          </div>
          <Textarea id="description" {...register('description')} placeholder="What is this comic about?" rows={4} className="resize-none" />
          {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="why_recommend" className="text-sm font-semibold">
              Why do you recommend it?
              <span className="text-muted-foreground font-normal ml-1">(optional)</span>
            </Label>
            <span className="text-xs text-muted-foreground">{whyValue.length}/1000</span>
          </div>
          <Textarea id="why_recommend" {...register('why_recommend')} placeholder="What makes this special?" rows={3} className="resize-none" />
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

      {/* Submit row */}
      <div className="flex items-center justify-between pt-1">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(isProPath ? '/pro/reader/dashboard/recommendations' : '/reader/dashboard/recommendations')}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting || !isDirty}
          className="gap-2 min-w-44"
        >
          {submitting
            ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
            : <><Save size={15} /> Save Changes</>
          }
        </Button>
      </div>
    </form>
  )
}
