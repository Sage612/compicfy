'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Loader2, Sparkles, BookOpen, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface MangaResult {
  id: string
  title: string
  alternativeTitles: string[]
  author: string
  artist: string
  description: string
  genres: string[]
  type: string
  status: string
  coverUrl: string
  year: number | null
  chapters: number | null
  score: number | null
  source: 'jikan' | 'mangadex' | 'anilist' | 'mangaupdates'
}

interface Props {
  onSelect: (result: MangaResult) => void
}

const sourceColors: Record<string, string> = {
  jikan:        'bg-blue-500/10   text-blue-600   border-blue-500/20',
  mangadex:     'bg-orange-500/10 text-orange-600 border-orange-500/20',
  anilist:      'bg-purple-500/10 text-purple-600 border-purple-500/20',
  mangaupdates: 'bg-teal-500/10   text-teal-600   border-teal-500/20',
}

const sourceLabels: Record<string, string> = {
  jikan:        'MAL',
  mangadex:     'MangaDex',
  anilist:      'AniList',
  mangaupdates: 'MangaUpdates',
}

export function MangaSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MangaResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<MangaResult | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/manga-search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results ?? [])
      setOpen(true)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 500)
  }

  const handleSelect = (result: MangaResult) => {
    setSelected(result)
    setQuery(result.title)
    setOpen(false)
    onSelect(result)
  }

  const handleClear = () => {
    setSelected(null)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div className="space-y-3">

      {/* Label */}
      <div className="flex items-center gap-2">
        <Sparkles size={15} className="text-primary" />
        <p className="text-sm font-semibold">Auto-fill from Database</p>
        <Badge variant="secondary" className="text-xs">Optional</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Search across MyAnimeList, MangaDex, AniList and MangaUpdates to auto-fill the form.
      </p>

      {/* Search input */}
      <div className="relative" ref={containerRef}>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={handleChange}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search manga, manhwa, manhua title..."
            className="pl-9 pr-9"
          />
          {loading && (
            <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
          )}
          {selected && !loading && (
            <button
              onClick={handleClear}
              aria-label="Clear selection"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Results dropdown */}
        {open && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              {results.map((result) => {
                const sourceColor = sourceColors[result.source] ?? 'bg-muted text-muted-foreground border-border'
                const sourceLabel = sourceLabels[result.source] ?? result.source

                return (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    className="w-full flex items-start gap-3 p-3 hover:bg-accent transition-colors text-left border-b border-border last:border-0"
                  >
                    {/* Cover */}
                    <div className="w-10 h-14 rounded-md overflow-hidden bg-muted shrink-0">
                      {result.coverUrl ? (
                        <img
                          src={result.coverUrl}
                          alt={result.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen size={14} className="text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Title */}
                      <p className="text-sm font-semibold line-clamp-1">
                        {result.title || 'Untitled'}
                      </p>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-1">
                        <Badge
                          variant="outline"
                          className={cn('text-xs border', sourceColor)}
                        >
                          {sourceLabel}
                        </Badge>
                        {result.type && (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {result.type}
                          </Badge>
                        )}
                        {result.status && (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {result.status}
                          </Badge>
                        )}
                        {result.score != null && result.score > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            ⭐ {result.score.toFixed(1)}
                          </Badge>
                        )}
                      </div>

                      {/* Author + year */}
                      <p className="text-xs text-muted-foreground truncate">
                        {result.author
                          ? `by ${result.author}${result.artist && result.artist !== result.author ? ` · art by ${result.artist}` : ''}${result.year ? ` · ${result.year}` : ''}`
                          : result.year
                            ? `${result.year}`
                            : ''}
                      </p>

                      {/* Genres preview */}
                      {result.genres && result.genres.length > 0 && (
                        <p className="text-[10px] text-muted-foreground/70 truncate">
                          {result.genres.slice(0, 4).join(' · ')}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 bg-muted/50 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </p>
              <div className="flex gap-1">
                {(['jikan', 'mangadex', 'anilist', 'mangaupdates'] as const).map(src => (
                  <span
                    key={src}
                    className={cn('text-[9px] px-1.5 py-0.5 rounded-full border font-semibold', sourceColors[src])}
                  >
                    {sourceLabels[src]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* No results */}
        {open && !loading && results.length === 0 && query.length >= 2 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-border bg-card shadow-xl p-4 text-center">
            <p className="text-sm text-muted-foreground">No results found for "{query}"</p>
            <p className="text-xs text-muted-foreground mt-1">Fill the form manually below</p>
          </div>
        )}
      </div>

      {/* Selected confirmation */}
      {selected && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Sparkles size={14} className="text-primary shrink-0" />
          <p className="text-xs text-primary font-medium">
            Form auto-filled from {sourceLabels[selected.source] ?? selected.source} — review and adjust below
          </p>
        </div>
      )}
    </div>
  )
}