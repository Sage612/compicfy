'use client'

import { X } from 'lucide-react'
import { GENRES } from '@/lib/utils/constants'
import { cn } from '@/lib/utils'

interface GenreSelectorProps {
  value: string[]
  onChange: (genres: string[]) => void
  max?: number
  error?: string
}

export function GenreSelector({
  value,
  onChange,
  max = 5,
  error,
}: GenreSelectorProps) {
  const toggle = (genre: string) => {
    if (value.includes(genre)) {
      onChange(value.filter((g) => g !== genre))
    } else if (value.length < max) {
      onChange([...value, genre])
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Select up to {max} genres
        </span>
        <span className={cn(
          'text-xs font-medium',
          value.length === max ? 'text-destructive' : 'text-muted-foreground'
        )}>
          {value.length}/{max}
        </span>
      </div>

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

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}