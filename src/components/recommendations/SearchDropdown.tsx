'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { BookOpen, Loader2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: string
  title: string
  type: string
  cover_url: string | null
  author: string | null
  genres: string[]
}

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/15 text-rose-500',
  manhwa:  'bg-violet-500/15 text-violet-500',
  manhua:  'bg-amber-500/15 text-amber-500',
  webtoon: 'bg-teal-500/15 text-teal-500',
  comic:   'bg-blue-500/15 text-blue-500',
  other:   'bg-zinc-500/15 text-zinc-500',
}

interface Props {
  query: string
  adult?: boolean
  onSelect?: () => void
}

export function SearchDropdown({ query, adult = false, onSelect }: Props) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }

    // Abort previous request
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setLoading(true)

    const params = new URLSearchParams({
      q: query,
      limit: '6',
      adult: adult ? 'true' : 'false',
    })

    fetch(`/api/recommendations?${params}`, {
      signal: abortRef.current.signal,
    })
      .then(r => r.json())
      .then(data => {
        setResults(data.recommendations ?? [])
        setLoading(false)
      })
      .catch(err => {
        if (err.name !== 'AbortError') setLoading(false)
      })

    return () => abortRef.current?.abort()
  }, [query, adult])

  if (query.trim().length < 2) return null
  if (!loading && results.length === 0) return null

  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
          <Loader2 size={13} className="animate-spin" />
          Searching…
        </div>
      ) : (
        <>
          <div className="px-3 pt-2 pb-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Results for "{query}"
            </p>
          </div>
          {results.map((rec) => (
            <Link
              key={rec.id}
              href={`/comic/${rec.id}`}
              onClick={onSelect}
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors"
            >
              {/* Cover */}
              <div className="w-8 h-11 rounded-lg overflow-hidden bg-muted shrink-0">
                {rec.cover_url ? (
                  <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen size={10} className="text-muted-foreground opacity-40" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{rec.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn(
                    'text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize',
                    TYPE_COLORS[rec.type] ?? 'bg-muted text-muted-foreground'
                  )}>
                    {rec.type}
                  </span>
                  {rec.author && (
                    <span className="text-[10px] text-muted-foreground truncate">
                      {rec.author}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}

          {/* View all results */}
          <div className="border-t border-border">
            <Link
              href={`${adult ? '/browse/adult' : '/browse'}?q=${encodeURIComponent(query)}`}
              onClick={onSelect}
              className="flex items-center gap-2 px-3 py-2.5 text-xs text-primary font-semibold hover:bg-muted/50 transition-colors"
            >
              <Search size={11} />
              See all results for "{query}"
            </Link>
          </div>
        </>
      )}
    </div>
  )
}