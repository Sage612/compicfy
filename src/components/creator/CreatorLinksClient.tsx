'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

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
    desc:        'Where readers can read your comic',
    previewLabel: 'Read my comic',
  },
  {
    field:       'patreon_url' as const,
    label:       'Patreon',
    placeholder: 'https://patreon.com/yourpage',
    desc:        'Let readers support you on Patreon',
    previewLabel: 'Patreon',
  },
  {
    field:       'kickstarter_url' as const,
    label:       'Kickstarter campaign',
    placeholder: 'https://kickstarter.com/projects/your-campaign',
    desc:        'Fund your next project with community backing',
    previewLabel: 'Kickstarter',
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
      // Typing the payload as a generic Record bypasses the internal 'never' mismatch
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
      toast.success('Links updated')
      setTimeout(() => setSaved(false), 3000)
    } catch {
      toast.error('Failed to save links')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      <p className="text-sm text-muted-foreground leading-relaxed">
        These links appear on your public profile and on every comic you submit.
        Readers can support you directly from your work.
      </p>

      <div className="space-y-3">
        {LINK_CONFIG.map(({ field, label, placeholder, desc }) => {
          const val    = values[field]
          const hasVal = !!(val && val.trim())
          return (
            <div key={field} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-dashboard-serif text-base text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                {hasVal && (
                  <a
                    href={val}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors"
                  >
                    Preview
                  </a>
                )}
              </div>
              <div className="space-y-1">
                <Input {...register(field)} placeholder={placeholder} type="url" className="h-9 text-sm" />
                {errors[field] && <p className="text-xs text-destructive">{errors[field]?.message}</p>}
              </div>
            </div>
          )
        })}
      </div>

      {hasAnyLink && (
        <div className="rounded-xl border border-dashed border-border p-4 space-y-2">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Preview on your profile</p>
          <div className="flex flex-wrap gap-2">
            {LINK_CONFIG.filter(c => values[c.field]).map(c => (
              <span key={c.field} className="px-3 py-1.5 rounded-full border border-border text-xs text-foreground">
                {c.previewLabel}
              </span>
            ))}
          </div>
        </div>
      )}

      {isPro && (
        <p className="text-xs text-muted-foreground">
          Pro creators get priority placement of their links on the browse page (coming soon).
        </p>
      )}

      <div className="flex items-center justify-between gap-4 pt-1">
        <p className="text-xs text-muted-foreground">Links appear on your profile and all submitted works.</p>
        <Button type="submit" disabled={saving} className="min-w-32">
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save links'}
        </Button>
      </div>
    </form>
  )
}
