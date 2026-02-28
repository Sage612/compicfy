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
import { Separator } from '@/components/ui/separator'
import { AvatarUpload } from './AvatarUpload'
import { toast } from 'sonner'
import { Loader2, X } from 'lucide-react'
import { GENRES } from '@/lib/utils/constants'
import type { Profile, Database } from '@/types/database.types'

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

interface Props {
  profile: Profile
  userId: string
}

export function SettingsForm({ profile, userId }: Props) {
  const supabase = createClient()
  const [saving, setSubmitting] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url)
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    profile.favorite_genres || []
  )

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      username: profile.username,
      display_name: profile.display_name || '',
      bio: profile.bio || '',
      website: profile.website || '',
    },
  })

  const bioValue = watch('bio') || ''

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : prev.length >= 10
        ? prev
        : [...prev, genre]
    )
  }

  const onSubmit = async (data: SettingsFormValues) => {
    setSubmitting(true)
    try {
      // Check username uniqueness if changed
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

     const updateData: Database['public']['Tables']['profiles']['Update'] = {
  username: data.username.toLowerCase(),
  display_name: data.display_name || null,
  bio: data.bio || null,
  website: data.website || null,
  favorite_genres: selectedGenres,
  updated_at: new Date().toISOString(),
}

const { error } = await (supabase as any)
  .from('profiles')
  .update(updateData)
  .eq('id', userId)

      if (error) throw error

      toast.success('Profile updated!')
    } catch (error) {
      console.error(error)
      toast.error('Failed to save changes')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

      {/* Avatar section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Profile Photo</h2>
          <p className="text-sm text-muted-foreground">
            This will be shown on your profile and recommendations
          </p>
        </div>
        <AvatarUpload
          userId={userId}
          currentUrl={avatarUrl}
          displayName={profile.display_name || profile.username}
          onUploadComplete={(url) => setAvatarUrl(url || null)}
        />
      </div>

      <Separator />

      {/* Basic info */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Basic Information</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              {...register('username')}
              placeholder="comicfan123"
            />
            {errors.username && (
              <p className="text-xs text-destructive">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              {...register('display_name')}
              placeholder="Comic Fan"
            />
            {errors.display_name && (
              <p className="text-xs text-destructive">{errors.display_name.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="bio">Bio</Label>
            <span className="text-xs text-muted-foreground">
              {bioValue.length}/500
            </span>
          </div>
          <Textarea
            id="bio"
            {...register('bio')}
            placeholder="Tell the community about yourself and what you love to read..."
            rows={3}
            className="resize-none"
          />
          {errors.bio && (
            <p className="text-xs text-destructive">{errors.bio.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            {...register('website')}
            placeholder="https://yoursite.com"
            type="url"
          />
          {errors.website && (
            <p className="text-xs text-destructive">{errors.website.message}</p>
          )}
        </div>
      </div>

      <Separator />

      {/* Favorite genres */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Favorite Genres</h2>
          <p className="text-sm text-muted-foreground">
            Select up to 10 genres · {selectedGenres.length}/10 selected
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {GENRES.map((genre) => {
            const isSelected = selectedGenres.includes(genre)
            return (
              <button
                key={genre}
                type="button"
                onClick={() => toggleGenre(genre)}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border text-muted-foreground hover:border-primary hover:text-foreground'
                }`}
              >
                {genre}
                {isSelected && <X size={12} />}
              </button>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* Save button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Your profile is public and visible to all users
        </p>
        <Button type="submit" disabled={saving} className="gap-2 min-w-28">
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  )
}