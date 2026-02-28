'use client'

import { useState } from 'react'
import { PLATFORMS } from '@/lib/utils/constants'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PlatformSelectorProps {
  value: string[]
  onChange: (platforms: string[]) => void
  error?: string
}

export function PlatformSelector({ value, onChange, error }: PlatformSelectorProps) {
  const [customInput, setCustomInput] = useState('')

  const toggle = (platform: string) => {
    if (value.includes(platform)) {
      onChange(value.filter((p) => p !== platform))
    } else {
      onChange([...value, platform])
    }
  }

  const addCustom = () => {
    const trimmed = customInput.trim()
    if (!trimmed || value.includes(trimmed)) return
    onChange([...value, trimmed])
    setCustomInput('')
  }

  const remove = (platform: string) => {
    onChange(value.filter((p) => p !== platform))
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
                        aria-label="Remove platform"
  title="Remove platform"

                  <X size={10} />
                </button>
              </span>
            ))}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}