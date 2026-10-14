'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AvatarUpload } from './AvatarUpload'
import { DeleteAccountSection } from '@/components/user/DeleteAccountSection'
import { toast } from 'sonner'
import { Sun, Moon, Monitor } from 'lucide-react'
import { GENRES } from '@/lib/utils/constants'
import type { Profile } from '@/types/app.types'
import { AdultContentToggle } from '@/components/user/AdultContentToggle'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

const settingsSchema = z.object({
  username:        z.string().min(3, 'At least 3 characters').max(30, 'Max 30 characters').regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, underscores only'),
  display_name:    z.string().max(50, 'Max 50 characters').optional(),
  bio:             z.string().max(500, 'Max 500 characters').optional(),
  website:         z.string().url('Must be a valid URL').optional().or(z.literal('')),
})

type SettingsFormValues = z.infer<typeof settingsSchema>

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
  profile:        Profile
  userId:         string
  isPro:          boolean
  defaultSection?: string
}

export function SettingsForm({ profile, userId, isPro }: Props) {
  const supabase     = createClient()
  const { setTheme } = useTheme()

  const [saving,           setSubmitting]      = useState(false)
  const [avatarUrl,        setAvatarUrl]        = useState(profile.avatar_url)
  const [selectedGenres,   setSelectedGenres]   = useState<string[]>(profile.favorite_genres || [])
  const [themePreference,  setThemePreference]  = useState<'dark' | 'light' | 'system'>(
    profile.theme_preference === 'dark' || profile.theme_preference === 'light'
      ? profile.theme_preference
      : 'system'
  )

  const { register, handleSubmit, watch, formState: { errors } } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      username:        profile.username,
      display_name:    profile.display_name || '',
      bio:             profile.bio || '',
      website:         profile.website || '',
    },
  })

  const bioValue = watch('bio') || ''

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : prev.length >= 10 ? prev : [...prev, genre]
    )
  }

  // Apply theme immediately on click for everyone
  const handleThemeChange = (value: 'dark' | 'light' | 'system') => {
    setThemePreference(value)
    setTheme(value)
  }

  const onSubmit = async (data: SettingsFormValues) => {
    setSubmitting(true)
    try {
      if (data.username !== profile.username) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', data.username.toLowerCase())
          .neq('id', userId)
          .single()
        if (existing) {
          toast.error('Username is already taken')
          setSubmitting(false)
          return
        }
      }

      const updateData: any = {
        username:        data.username.toLowerCase(),
        display_name:    data.display_name || null,
        bio:             data.bio || null,
        website:         data.website || null,
        favorite_genres: selectedGenres,
        updated_at:      new Date().toISOString(),
      }

      // Only save theme to DB for pro/admin — free users get it applied locally only
      if (isPro) updateData.theme_preference = themePreference

      const { error } = await (supabase as any)
        .from('profiles')
        .update(updateData)
        .eq('id', userId)

      if (error) throw error

      toast.success('Profile updated')
    } catch (error) {
      console.error(error)
      toast.error('Failed to save changes')
    } finally {
      setSubmitting(false)
    }
  }

  const themeOptions = [
    { value: 'light'  as const, label: 'Light',  icon: Sun,     desc: 'Always light'         },
    { value: 'dark'   as const, label: 'Dark',   icon: Moon,    desc: 'Always dark'          },
    { value: 'system' as const, label: 'System', icon: Monitor, desc: 'Follows your OS theme' },
  ]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

      <FormSection title="Profile photo">
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground">Shown on your profile and recommendations</p>
          <AvatarUpload
            userId={userId}
            currentUrl={avatarUrl}
            displayName={profile.display_name || profile.username}
            onUploadComplete={(url) => setAvatarUrl(url || null)}
          />
        </div>
      </FormSection>

      <FormSection title="Basic information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-sm">Username</Label>
            <Input id="username" {...register('username')} placeholder="comicfan123" className="h-10" />
            {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="display_name" className="text-sm">Display name</Label>
            <Input id="display_name" {...register('display_name')} placeholder="Comic Fan" className="h-10" />
            {errors.display_name && <p className="text-xs text-destructive">{errors.display_name.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="bio" className="text-sm">Bio</Label>
            <span className="text-xs text-muted-foreground tabular-nums">{bioValue.length}/500</span>
          </div>
          <Textarea
            id="bio"
            {...register('bio')}
            placeholder="Tell the community about yourself and what you love to read…"
            rows={3}
            className="resize-none"
          />
          {errors.bio && <p className="text-xs text-destructive">{errors.bio.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="website" className="text-sm">Website</Label>
          <Input id="website" {...register('website')} placeholder="https://yoursite.com" type="url" className="h-10" />
          {errors.website && <p className="text-xs text-destructive">{errors.website.message}</p>}
        </div>
      </FormSection>

      <FormSection title="Theme">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {isPro
              ? 'Saved to your account and applied across all sessions.'
              : 'Applied to this browser only. Upgrade to Pro to save your theme across all sessions.'
            }
          </p>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map(({ value, label, icon: Icon, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleThemeChange(value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-lg border text-center transition-colors',
                  themePreference === value
                    ? 'border-foreground bg-muted text-foreground'
                    : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                )}
              >
                <Icon size={16} />
                <span className="text-xs font-medium leading-none">{label}</span>
                <span className="text-[10px] leading-tight opacity-70">{desc}</span>
              </button>
            ))}
          </div>
        </div>
      </FormSection>

      <FormSection title="Favourite genres">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Select up to 10 <span className="ml-1 text-foreground tabular-nums">{selectedGenres.length}/10</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((genre) => {
              const isSelected = selectedGenres.includes(genre)
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm border transition-colors',
                    isSelected
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                  )}
                >
                  {genre}
                </button>
              )
            })}
          </div>
        </div>
      </FormSection>

      <FormSection title="Content preferences">
        <AdultContentToggle userId={userId} initialEnabled={profile.adult_content_enabled ?? false} />
      </FormSection>

      <div className="flex items-center justify-between gap-4 pt-1">
        <p className="text-xs text-muted-foreground">Username changes take effect immediately across the platform</p>
        <Button type="submit" disabled={saving} className="min-w-32">
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>

      <FormSection title="Danger zone" danger>
        <DeleteAccountSection />
      </FormSection>

    </form>
  )
}