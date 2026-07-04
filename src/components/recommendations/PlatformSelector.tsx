'use client'

import { useState } from 'react'
import { PLATFORMS } from '@/lib/utils/constants'
import { validatePlatformLink } from '@/lib/utils/platformLinks'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X, Plus, Link2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PlatformSelectorProps {
  value: string[]
  onChange: (platforms: string[]) => void
  links: string[]
  onLinksChange: (links: string[]) => void
  error?: string
}

export function PlatformSelector({ value, onChange, links, onLinksChange, error }: PlatformSelectorProps) {
  const [customInput, setCustomInput] = useState('')
  // Per-platform-index validation message, shown only after the user has
  // typed something in that link field (so we're not yelling at empty fields).
  const [linkErrors, setLinkErrors] = useState<Record<number, string>>({})

  const toggle = (platform: string) => {
    if (value.includes(platform)) {
      const idx = value.indexOf(platform)
      onChange(value.filter((p) => p !== platform))
      onLinksChange(links.filter((_, i) => i !== idx))
      setLinkErrors((prev) => {
        const next = { ...prev }
        delete next[idx]
        return next
      })
    } else {
      onChange([...value, platform])
      onLinksChange([...links, ''])
    }
  }

  const addCustom = () => {
    const trimmed = customInput.trim()
    if (!trimmed || value.includes(trimmed)) return
    onChange([...value, trimmed])
    onLinksChange([...links, ''])
    setCustomInput('')
  }

  const remove = (platform: string) => {
    const idx = value.indexOf(platform)
    onChange(value.filter((p) => p !== platform))
    onLinksChange(links.filter((_, i) => i !== idx))
    setLinkErrors((prev) => {
      const next = { ...prev }
      delete next[idx]
      return next
    })
  }

  const handleLinkChange = (idx: number, url: string) => {
    const nextLinks = [...links]
    nextLinks[idx] = url
    onLinksChange(nextLinks)

    if (!url.trim()) {
      setLinkErrors((prev) => {
        const next = { ...prev }
        delete next[idx]
        return next
      })
      return
    }

    const result = validatePlatformLink(url)
    setLinkErrors((prev) => ({
      ...prev,
      ...(result.valid ? {} : { [idx]: result.reason ?? 'Invalid link' }),
    }))
    if (result.valid) {
      setLinkErrors((prev) => {
        const next = { ...prev }
        delete next[idx]
        return next
      })
    }
  }

  return (
    <div className="space-y-3">
      {/* Preset platforms */}
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((platform) => {
          const isSelected = value.includes(platform)
          return (
            <button
              key={platform}
              type="button"
              onClick={() => toggle(platform)}
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-all',
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary hover:text-foreground'
              )}
            >
              {platform}
              {isSelected && <X size={10} />}
            </button>
          )
        })}
      </div>

      {/* Custom platform input */}
      <div className="flex gap-2">
        <Input
          placeholder="Add custom platform..."
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
          className="text-sm h-8"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addCustom}
          disabled={!customInput.trim()}
          className="h-8 gap-1"
        >
          <Plus size={13} />
          Add
        </Button>
      </div>

      {/* Selected custom platforms (non-preset) */}
      {value.filter(p => !PLATFORMS.includes(p as typeof PLATFORMS[number])).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value
            .filter(p => !PLATFORMS.includes(p as typeof PLATFORMS[number]))
            .map((platform) => (
              <span
                key={platform}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground"
              >
                {platform}
                    <button type="button" onClick={() => remove(platform)}>

                  <X size={10} />
                </button>
              </span>
            ))}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Per-platform link inputs — one per selected platform, paired by index. */}
      {value.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Link2 size={12} />
            Reading links <span className="font-normal text-muted-foreground/70">(optional, but recommended)</span>
          </p>
          {value.map((platform, idx) => {
            const linkValue = links[idx] ?? ''
            const linkError = linkErrors[idx]
            const isValid   = linkValue.trim() && !linkError
            return (
              <div key={platform} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-28 shrink-0 truncate">
                    {platform}
                  </span>
                  <div className="relative flex-1">
                    <Input
                      value={linkValue}
                      onChange={(e) => handleLinkChange(idx, e.target.value)}
                      placeholder={`https://...`}
                      className={cn(
                        'h-8 text-xs pr-7',
                        linkError && 'border-destructive focus-visible:ring-destructive/30'
                      )}
                    />
                    {linkValue.trim() && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2">
                        {isValid
                          ? <CheckCircle2 size={13} className="text-emerald-500" />
                          : <AlertCircle size={13} className="text-destructive" />}
                      </span>
                    )}
                  </div>
                </div>
                {linkError && (
                  <p className="text-[11px] text-destructive pl-[7.5rem] leading-snug">{linkError}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}