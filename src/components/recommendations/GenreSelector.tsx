'use client'

import { useState } from 'react'
import { X, Plus, ChevronUp, ChevronDown, Star } from 'lucide-react'
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

  const moveUp = (index: number) => {
    if (index === 0) return
    const next = [...value]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    onChange(next)
  }

  const moveDown = (index: number) => {
    if (index === value.length - 1) return
    const next = [...value]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    onChange(next)
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

      {/* Selected genres — reorderable. First one is the primary genre,
          used to decide which single "Browse by Genre" section this
          comic shows up in on the browse page. */}
      {value.length > 0 && (
        <div className="space-y-1.5 rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-xs font-semibold text-muted-foreground">
            Order matters the first genre is this comic's <span className="text-foreground">primary genre</span>.
          </p>
          <div className="space-y-1.5">
            {value.map((genre, index) => (
              <div
                key={genre}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border bg-card',
                  index === 0 ? 'border-primary/40' : 'border-border'
                )}
              >
                {index === 0 ? (
                  <Star size={12} className="text-primary shrink-0" fill="currentColor" />
                ) : (
                  <span className="w-3 shrink-0" />
                )}

                <span className="flex-1 text-sm font-medium truncate">{genre}</span>

                {index === 0 && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-primary shrink-0">
                    Primary
                  </span>
                )}

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    aria-label={`Move ${genre} up`}
                    className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(index)}
                    disabled={index === value.length - 1}
                    aria-label={`Move ${genre} down`}
                    className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronDown size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}