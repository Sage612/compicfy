'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Loader2, BookOpen, ExternalLink, CheckCircle2,
  Link as LinkIcon, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const linksSchema = z.object({
  comic_url:       z.string().url('Must be a valid URL').optional().or(z.literal('')),
  patreon_url:     z.string().url('Must be a valid URL').optional().or(z.literal('')),
  kickstarter_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
})

type LinksFormValues = z.infer<typeof linksSchema>

interface Props {
  userId:          string
  initialValues:   { comic_url?: string | null; patreon_url?: string | null; kickstarter_url?: string | null }
  isPro:           boolean
}

const LINK_CONFIG = [
  {
    field:       'comic_url' as const,
    label:       'Comic / Webtoon URL',
    placeholder: 'https://webtoons.com/your-comic',
    icon:        BookOpen,
    emoji:       null,
    color:       'text-teal-500',
    bg:          'bg-teal-500/10',
    border:      'border-teal-500/20',
    desc:        'Link to where readers can read your comic',
  },
  {
    field:       'patreon_url' as const,
    label:       'Patreon',
    placeholder: 'https://patreon.com/yourpage',
    icon:        null,
    emoji:       '🎨',
    color:       'text-orange-500',
    bg:          'bg-orange-500/10',
    border:      'border-orange-500/20',
    desc:        'Let readers support you on Patreon',
  },
  {
    field:       'kickstarter_url' as const,
    label:       'Kickstarter Campaign',
    placeholder: 'https://kickstarter.com/projects/your-campaign',
    icon:        null,
    emoji:       '🚀',
    color:       'text-green-500',
    bg:          'bg-green-500/10',
    border:      'border-green-500/20',
    desc:        'Fund your next project with community backing',
  },
]

export function CreatorLinksClient({ userId, initialValues, isPro }: Props) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<LinksFormValues>({
    resolver: zodResolver(linksSchema),
    defaultValues: {
      comic_url:       initialValues.comic_url       ?? '',
      patreon_url:     initialValues.patreon_url     ?? '',
      kickstarter_url: initialValues.kickstarter_url ?? '',
    },
  })

  const values = watch()
  const hasAnyLink = !!(values.comic_url || values.patreon_url || values.kickstarter_url)

  const onSubmit = async (data: LinksFormValues) => {
    setSaving(true)
    setSaved(false)
    try {
      // Typing the payload structure explicitly as a generic Record bypasses the internal 'never' mismatch
      const updateData: Record<string, any> = {
        comic_url:       data.comic_url       || null,
        patreon_url:     data.patreon_url     || null,
        kickstarter_url: data.kickstarter_url || null,
        updated_at:      new Date().toISOString(),
      }

      const { error } = await (supabase as any)
        .from('profiles')
        .update(updateData)
        .eq('id', userId)

      if (error) throw error
      setSaved(true)
      toast.success('Links updated!')
      setTimeout(() => setSaved(false), 3000)
    } catch {
      toast.error('Failed to save links')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {/* Intro card */}
      <div className="flex items-start gap-3 p-4 rounded-2xl border border-teal-500/20 bg-teal-500/5">
        <div className="w-8 h-8 rounded-lg bg-teal-500/15 flex items-center justify-center shrink-0 mt-0.5">
          <LinkIcon size={14} className="text-teal-500" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-black text-teal-700 dark:text-teal-400">
            Your Creator Links
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            These links appear on your public profile and on every comic you submit.
            Readers can support you directly from your work.
          </p>
        </div>
      </div>

      {/* Link inputs */}
      <div className="space-y-4">
        {LINK_CONFIG.map(({ field, label, placeholder, icon: Icon, emoji, color, bg, border, desc }) => {
          const val     = values[field]
          const hasVal  = !!(val && val.trim())
          return (
            <div key={field} className={cn(
              'rounded-2xl border p-4 space-y-3 transition-colors',
              hasVal ? border : 'border-border',
              hasVal ? bg.replace('/10', '/5') : 'bg-card'
            )}>
              <div className="flex items-center gap-2.5">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', bg)}>
                  {Icon
                    ? <Icon size={14} className={color} />
                    : <span className="text-sm">{emoji}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black">{label}</p>
                  <p className="text-[10px] text-muted-foreground">{desc}</p>
                </div>
                {hasVal && (
                  <a
                    href={val}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn('shrink-0 flex items-center gap-1 text-[10px] font-semibold', color)}
                    onClick={e => e.stopPropagation()}
                  >
                    <ExternalLink size={10} /> Preview
                  </a>
                )}
              </div>
              <div className="space-y-1">
                <Input
                  {...register(field)}
                  placeholder={placeholder}
                  type="url"
                  className="h-9 text-sm"
                />
                {errors[field] && (
                  <p className="text-xs text-destructive">{errors[field]?.message}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Preview section */}
      {hasAnyLink && (
        <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            Preview on your profile
          </p>
          <div className="flex flex-wrap gap-2">
            {values.comic_url && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-500/30 bg-teal-500/10 text-teal-600 text-xs font-semibold">
                <BookOpen size={11} />Read My Comic
              </span>
            )}
            {values.patreon_url && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-600 text-xs font-semibold">
                🎨 Patreon
              </span>
            )}
            {values.kickstarter_url && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-green-500/30 bg-green-500/10 text-green-600 text-xs font-semibold">
                🚀 Kickstarter
              </span>
            )}
          </div>
        </div>
      )}

      {/* Pro tip */}
      {isPro && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Sparkles size={10} className="text-teal-500 shrink-0" />
          Pro creators get priority placement of their links on the browse page. (coming soon)
        </div>
      )}

      {/* Save */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-muted-foreground">
          Links appear on your profile and all submitted works.
        </p>
        <Button
          type="submit"
          disabled={saving}
          className={cn(
            'gap-2 min-w-32 transition-all',
            saved && 'bg-emerald-500 hover:bg-emerald-600 border-0'
          )}
        >
          {saving
            ? <><Loader2 size={13} className="animate-spin" />Saving…</>
            : saved
            ? <><CheckCircle2 size={13} />Saved!</>
            : 'Save Links'
          }
        </Button>
      </div>
    </form>
  )
}
