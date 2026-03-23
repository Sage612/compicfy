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
  source: 'jikan' | 'mangadex' | 'anilist'
}

interface Props {
  onSelect: (result: MangaResult) => void
}

const sourceColors = {
  jikan:    'bg-blue-500/10   text-blue-600   border-blue-500/20',
  mangadex: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  anilist:  'bg-purple-500/10 text-purple-600 border-purple-500/20',
}

const sourceLabels = {
  jikan:    'MAL',
  mangadex: 'MangaDex',
  anilist:  'AniList',
}

export function MangaSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MangaResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<MangaResult | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
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
      {/* Search label */}
      <div className="flex items-center gap-2">
        <Sparkles size={15} className="text-primary" />
        <p className="text-sm font-semibold">Auto-fill from Database</p>
        <Badge variant="secondary" className="text-xs">Optional</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Search across MyAnimeList, MangaDex, and AniList to auto-fill the form.
      </p>

      {/* Search input — wrapped in ref container */}
      <div className="relative" ref={containerRef}>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={handleChange}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search manga title..."
            className="pl-9 pr-9"
          />
          {loading && (
            <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
          )}
          {selected && !loading && (
            <button
              onClick={handleClear}
              aria-label="Clear selection"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Results dropdown */}
        {open && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              {results.map((result) => (
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
                    <p className="text-sm font-semibold line-clamp-1">{result.title}</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge
                        variant="outline"
                        className={cn('text-xs border', sourceColors[result.source])}
                      >
                        {sourceLabels[result.source]}
                      </Badge>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {result.type}
                      </Badge>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {result.status}
                      </Badge>
                      {result.score && (
                        <Badge variant="secondary" className="text-xs">
                          ⭐ {result.score.toFixed(1)}
                        </Badge>
                      )}
                    </div>
                    {result.author && (
                      <p className="text-xs text-muted-foreground truncate">
                        by {result.author}
                        {result.year ? ` · ${result.year}` : ''}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="px-3 py-2 bg-muted/50 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {results.length} results from MAL, MangaDex & AniList
              </p>
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
            Form auto-filled from {sourceLabels[selected.source]} — review and adjust below
          </p>
        </div>
      )}
    </div>
  )
}