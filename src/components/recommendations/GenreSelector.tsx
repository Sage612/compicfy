'use client'

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { GENRES } from '@/lib/utils/constants'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface GenreSelectorProps {
  value: string[]
  onChange: (genres: string[]) => void
  max?: number
  error?: string
}

export function GenreSelector({ value, onChange, max = 5, error }: GenreSelectorProps) {
  const [customInput, setCustomInput] = useState('')

  const toggle = (genre: string) => {
    if (value.includes(genre)) {
      onChange(value.filter((g) => g !== genre))
    } else if (value.length < max) {
      onChange([...value, genre])
    }
  }

  const addCustom = () => {
    const trimmed = customInput.trim()
    if (!trimmed || value.includes(trimmed)) return
    if (value.length >= max) return
    onChange([...value, trimmed])
    setCustomInput('')
  }

  const remove = (genre: string) => {
    onChange(value.filter((g) => g !== genre))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Select up to {max} genres</span>
        <span className={cn(
          'text-xs font-medium',
          value.length === max ? 'text-destructive' : 'text-muted-foreground'
        )}>
          {value.length}/{max}
        </span>
      </div>

      {/* Preset genres */}
      <div className="flex flex-wrap gap-2">
        {GENRES.map((genre) => {
          const isSelected = value.includes(genre)
          const isDisabled = !isSelected && value.length >= max
          return (
            <button
              key={genre}
              type="button"
              onClick={() => toggle(genre)}
              disabled={isDisabled}
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-all',
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : isDisabled
                  ? 'opacity-40 cursor-not-allowed border-border text-muted-foreground'
                  : 'border-border text-muted-foreground hover:border-primary hover:text-foreground cursor-pointer'
              )}
            >
              {genre}
              {isSelected && <X size={10} />}
            </button>
          )
        })}
      </div>

      {/* Custom genre input */}
      <div className="flex gap-2">
        <Input
          placeholder="Add custom genre..."
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
          disabled={value.length >= max}
          className="text-sm h-8"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addCustom}
          disabled={!customInput.trim() || value.length >= max}
          className="h-8 gap-1"
        >
          <Plus size={13} />
          Add
        </Button>
      </div>

      {/* Custom genres (non-preset) */}
      {value.filter(g => !GENRES.includes(g as typeof GENRES[number])).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value
            .filter(g => !GENRES.includes(g as typeof GENRES[number]))
            .map((genre) => (
              <span
                key={genre}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground"
              >
                {genre}
                <button type="button" onClick={() => remove(genre)}>
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