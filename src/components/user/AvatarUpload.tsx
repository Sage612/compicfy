'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Camera, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AvatarUploadProps {
  userId: string
  currentUrl: string | null
  displayName: string
  onUploadComplete: (url: string) => void
}

const MAX_SIZE_MB = 2
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export function AvatarUpload({
  userId,
  currentUrl,
  displayName,
  onUploadComplete,
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const initials = displayName.slice(0, 2).toUpperCase()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Please upload a JPG, PNG, WebP, or GIF image')
      return
    }

    // Validate size
    if (file.size > MAX_SIZE_BYTES) {
      toast.error(`Image must be under ${MAX_SIZE_MB}MB`)
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    // Upload
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${userId}/avatar.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Add cache-busting timestamp
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const { error: updateError } = await (supabase as any)
  .from('profiles')
  .update({ avatar_url: urlWithCacheBust })
  .eq('id', userId)

      if (updateError) throw updateError

      onUploadComplete(urlWithCacheBust)
      toast.success('Avatar updated!')
    } catch (error) {
      console.error(error)
      toast.error('Failed to upload avatar')
      setPreview(null)
    } finally {
      setUploading(false)
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveAvatar = async () => {
    setUploading(true)
    try {
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
await (supabase as any)
  .from('profiles')
  .update({ avatar_url: null })
  .eq('id', userId)
        .eq('id', userId)

      setPreview(null)
      onUploadComplete('')
      toast.success('Avatar removed')
    } catch {
      toast.error('Failed to remove avatar')
    } finally {
      setUploading(false)
    }
  }

  const displayUrl = preview || currentUrl || undefined

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar preview */}
      <div className="relative group">
        <Avatar className="h-24 w-24 border-4 border-border">
          <AvatarImage src={displayUrl} alt={displayName} />
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Overlay on hover */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={cn(
            'absolute inset-0 rounded-full bg-black/50 flex items-center justify-center',
            'opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer',
            uploading && 'opacity-100'
          )}
          title="Change avatar"
        >
          {uploading ? (
            <Loader2 size={20} className="text-white animate-spin" />
          ) : (
            <Camera size={20} className="text-white" />
          )}
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Upload avatar"
      />

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-1.5"
        >
          <Camera size={14} />
          {uploading ? 'Uploading...' : 'Change Photo'}
        </Button>

        {(currentUrl || preview) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemoveAvatar}
            disabled={uploading}
            className="gap-1.5 text-destructive hover:text-destructive"
          >
            <X size={14} />
            Remove
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        JPG, PNG, WebP or GIF · Max {MAX_SIZE_MB}MB
      </p>
    </div>
  )
}