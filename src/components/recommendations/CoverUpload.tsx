'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Upload, X, ImageIcon, Loader2, Link as LinkIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CoverUploadProps {
  value: string
  onChange: (url: string) => void
  userId: string
}

const MAX_SIZE_MB = 5
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function CoverUpload({ value, onChange, userId }: CoverUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [mode, setMode] = useState<'upload' | 'url'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Please upload a JPG, PNG, or WebP image')
      return
    }

    if (file.size > MAX_SIZE_BYTES) {
      toast.error(`Image must be under ${MAX_SIZE_MB}MB`)
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('covers')
        .getPublicUrl(fileName)

      onChange(publicUrl)
      toast.success('Cover image uploaded!')
    } catch (error) {
      console.error(error)
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return
    try {
      new URL(urlInput)
      onChange(urlInput.trim())
      setUrlInput('')
      toast.success('Cover URL set!')
    } catch {
      toast.error('Please enter a valid URL')
    }
  }

  const handleRemove = () => {
    onChange('')
    setUrlInput('')
  }

  return (
    <div className="space-y-3">
      <Label>Cover Image</Label>

      {/* Preview */}
      {value ? (
        <div className="relative w-32 rounded-lg overflow-hidden border border-border group">
          <div className="aspect-[3/4]">
            <img
              src={value}
              alt="Cover preview"
              className="w-full h-full object-cover"
              onError={() => {
                toast.error('Failed to load image')
                onChange('')
              }}
            />
          </div>
          <button
            type="button"
                      onClick={handleRemove}
                      aria-label="Remove cover image"
  title="Remove cover image"
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={12} className="text-white" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => mode === 'upload' && fileInputRef.current?.click()}
          className={cn(
            'w-32 aspect-[3/4] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1',
            mode === 'upload' && 'cursor-pointer hover:border-primary transition-colors'
          )}
        >
          <ImageIcon size={24} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground text-center px-1">
            {mode === 'upload' ? 'Click to upload' : 'No cover'}
          </span>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === 'upload' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('upload')}
          className="gap-1.5"
        >
          <Upload size={13} />
          Upload
        </Button>
        <Button
          type="button"
          variant={mode === 'url' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('url')}
          className="gap-1.5"
        >
          <LinkIcon size={13} />
          URL
        </Button>
      </div>

      {/* Upload input */}
      {mode === 'upload' && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
                      onChange={handleFileUpload}
                      aria-label="Upload cover image"
                      title="Upload cover image"
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-1.5 w-full"
          >
            {uploading ? (
              <><Loader2 size={13} className="animate-spin" />Uploading...</>
            ) : (
              <><Upload size={13} />Choose Image</>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, WebP · Max {MAX_SIZE_MB}MB
          </p>
        </>
      )}

      {/* URL input */}
      {mode === 'url' && (
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com/cover.jpg"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleUrlSubmit())}
            className="text-sm"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleUrlSubmit}
            disabled={!urlInput.trim()}
          >
            Set
          </Button>
        </div>
      )}
    </div>
  )
}