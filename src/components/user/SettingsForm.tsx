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
import { Loader2, X, User, Heart, Shield, Globe, Sun, Moon, Monitor, Palette, AlertTriangle } from 'lucide-react'
import { GENRES } from '@/lib/utils/constants'
import type { Profile } from '@/types/database.types'
import { AdultContentToggle } from '@/components/user/AdultContentToggle'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

const settingsSchema = z.object({
  username: z
    .string()
    .min(3, 'At least 3 characters')
    .max(30, 'Max 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, underscores only'),
  display_name: z.string().max(50, 'Max 50 characters').optional(),
  bio: z.string().max(500, 'Max 500 characters').optional(),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
})

type SettingsFormValues = z.infer<typeof settingsSchema>

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
  profile: Profile
  userId: string
  isPro: boolean
}

export function SettingsForm({ profile, userId, isPro }: Props) {
  const supabase    = createClient()
  const { setTheme } = useTheme()
  const [saving,          setSubmitting]    = useState(false)
  const [avatarUrl,       setAvatarUrl]     = useState(profile.avatar_url)
  const [selectedGenres,  setSelectedGenres] = useState<string[]>(profile.favorite_genres || [])
  const [themePreference, setThemePreference] = useState<'dark' | 'light' | 'system'>(
    profile.theme_preference ?? 'system'
  )

  const { register, handleSubmit, watch, formState: { errors } } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      username:     profile.username,
      display_name: profile.display_name || '',
      bio:          profile.bio || '',
      website:      profile.website || '',
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

      if (isPro) updateData.theme_preference = themePreference

      const { error } = await (supabase as any)
        .from('profiles')
        .update(updateData)
        .eq('id', userId)

      if (error) throw error
      if (isPro) setTheme(themePreference)

      toast.success('Profile updated!')
    } catch (error) {
      console.error(error)
      toast.error('Failed to save changes')
    } finally {
      setSubmitting(false)
    }
  }

  const themeOptions = [
    { value: 'light'  as const, label: 'Light',  icon: Sun,     desc: 'Always light'         },
    { value: 'dark'   as const, label: 'Dark',   icon: Moon,    desc: 'Always dark'           },
    { value: 'system' as const, label: 'System', icon: Monitor, desc: 'Follows your OS theme' },
  ]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

      {/* Profile Photo */}
      <FormSection icon={User} title="Profile Photo">
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

      {/* Basic Information */}
      <FormSection icon={User} title="Basic Information" accent="bg-violet-500">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-sm font-semibold">Username</Label>
            <Input id="username" {...register('username')} placeholder="comicfan123" className="h-10" />
            {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="display_name" className="text-sm font-semibold">Display Name</Label>
            <Input id="display_name" {...register('display_name')} placeholder="Comic Fan" className="h-10" />
            {errors.display_name && <p className="text-xs text-destructive">{errors.display_name.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="bio" className="text-sm font-semibold">Bio</Label>
            <span className="text-xs text-muted-foreground">{bioValue.length}/500</span>
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
          <Label htmlFor="website" className="text-sm font-semibold flex items-center gap-1.5">
            <Globe size={13} />
            Website
          </Label>
          <Input
            id="website"
            {...register('website')}
            placeholder="https://yoursite.com"
            type="url"
            className="h-10"
          />
          {errors.website && <p className="text-xs text-destructive">{errors.website.message}</p>}
        </div>
      </FormSection>

      {/* Theme Preference — Pro/Admin only */}
      {isPro && (
        <FormSection icon={Palette} title="Theme Preference" accent="bg-amber-500">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Saved to your account and applied across all sessions.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setThemePreference(value)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all duration-150',
                    themePreference === value
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm'
                      : 'border-border bg-card text-muted-foreground hover:border-amber-500/30 hover:text-foreground'
                  )}
                >
                  <Icon size={18} />
                  <span className="text-xs font-bold leading-none">{label}</span>
                  <span className="text-[10px] leading-tight opacity-70">{desc}</span>
                </button>
              ))}
            </div>
          </div>
        </FormSection>
      )}

      {/* Favourite Genres */}
      <FormSection icon={Heart} title="Favourite Genres" accent="bg-rose-500">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Select up to 10 genres
            <span className={cn('ml-1.5 font-semibold', selectedGenres.length >= 10 ? 'text-amber-500' : 'text-primary')}>
              {selectedGenres.length}/10
            </span>
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
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                      : 'bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  )}
                >
                  {genre}
                  {isSelected && <X size={11} />}
                </button>
              )
            })}
          </div>
        </div>
      </FormSection>

      {/* Content Preferences */}
      <FormSection icon={Shield} title="Content Preferences" accent="bg-zinc-600">
        <AdultContentToggle userId={userId} initialEnabled={profile.adult_content_enabled ?? false} />
      </FormSection>

      {/* Save row */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-muted-foreground">Username changes take effect immediately across the platform</p>
        <Button
          type="submit"
          disabled={saving}
          className="gap-2 min-w-32"
        >
          {saving
            ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
            : 'Save Changes'
          }
        </Button>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-destructive/20 bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-destructive/15 bg-destructive/5">
          <div className="w-7 h-7 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0">
            <AlertTriangle size={13} className="text-destructive" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-widest text-destructive">Danger Zone</h3>
        </div>
        <div className="p-5">
          <DeleteAccountSection />
        </div>
      </div>

    </form>
  )
}