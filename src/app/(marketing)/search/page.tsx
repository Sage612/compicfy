'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Search, BookOpen, X, Loader2, Flame, ArrowRight,
  ExternalLink, Plus, Star, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { SearchResult } from '@/app/api/search/route'

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500',
  manhwa:  'bg-violet-500/10 text-violet-500',
  manhua:  'bg-amber-500/10  text-amber-500',
  webtoon: 'bg-teal-500/10   text-teal-500',
  comic:   'bg-blue-500/10   text-blue-500',
  other:   'bg-zinc-500/10   text-zinc-400',
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  local:       { label: 'Compicfy',    color: 'bg-primary/10 text-primary border-primary/20'         },
  jikan:       { label: 'MAL',         color: 'bg-blue-500/10 text-blue-500 border-blue-500/20'       },
  anilist:     { label: 'AniList',     color: 'bg-teal-500/10 text-teal-500 border-teal-500/20'       },
  mangadex:    { label: 'MangaDex',    color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  mangaupdates:{ label: 'MU',          color: 'bg-violet-500/10 text-violet-500 border-violet-500/20' },
}

const QUICK_LINKS = [
  { label: '🔥 Trending',       href: '/browse?sort=trending' },
  { label: '🆕 New this week', href: '/browse?sort=recent'   },
  { label: '❤️ Top rated',     href: '/browse?sort=score'    },
  { label: '⚔️ Action',        href: '/browse?genre=Action'  },
  { label: '🌸 Romance',       href: '/browse?genre=Romance' },
  { label: '✨ Fantasy',       href: '/browse?genre=Fantasy' },
  { label: '👻 Horror',        href: '/browse?genre=Horror'  },
  { label: '🎭 Drama',         href: '/browse?genre=Drama'   },
]

// Now accepts basePath to dynamically route to /pro or /dashboard
function buildPrefillUrl(result: SearchResult, basePath: string): string {
  if (!result.prefill) return `${basePath}/recommendations/new`
  const p = result.prefill
  const params = new URLSearchParams()
  if (p.title)              params.set('title',        p.title)
  if (p.type)               params.set('type',         p.type)
  if (p.status)             params.set('status',       p.status)
  if (p.description)        params.set('description',  p.description.slice(0, 2000))
  if (p.author)             params.set('author',       p.author)
  if (p.artist)             params.set('artist',       p.artist)
  if (p.cover_url)          params.set('cover_url',    p.cover_url)
  if (p.year_released)      params.set('year',         String(p.year_released))
  if (p.chapter_count)      params.set('chapters',     String(p.chapter_count))
  if (p.genres?.length)     params.set('genres',       p.genres.join(','))
  return `${basePath}/recommendations/new?${params.toString()}`
}

export default function SearchPage() {
  const router          = useRouter()
  const searchParams    = useSearchParams()
  const pathname        = usePathname() // <-- ADDED
  const initialQ        = searchParams.get('q') ?? ''

  // Determine base path instantly from the URL
  const basePath = pathname.startsWith('/pro') ? '/pro' : '/dashboard'

  const [query,   setQuery]   = useState(initialQ)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef    = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setSearched(false); return }
    setLoading(true)
    setSearched(true)
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=16`)
      const data = await res.json()
      setResults(data.results ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialQ.length >= 2) doSearch(initialQ)
    inputRef.current?.focus()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (value: string) => {
    setQuery(value)
    // Update URL using the dynamic pathname instead of hardcoding '/search'
    const url = value.trim() ? `${pathname}?q=${encodeURIComponent(value.trim())}` : pathname
    window.history.replaceState(null, '', url)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 350)
  }

  const local    = results.filter(r => r.source === 'local')
  const external = results.filter(r => r.source !== 'local')

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

      {/* ── Search input ── */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleChange(e.target.value)}
            placeholder="Search manga, manhwa, manhua, webtoons…"
            className={cn(
              'w-full h-14 pl-12 pr-12 rounded-2xl border border-border bg-card',
              'text-base outline-none placeholder:text-muted-foreground',
              'focus:border-primary transition-colors shadow-sm'
            )}
          />
          {loading ? (
            <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : query ? (
            <button
              onClick={() => { setQuery(''); setResults([]); setSearched(false) }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>

        {query.trim().length >= 2 && (
          <p className="text-xs text-muted-foreground px-1">
            {loading ? 'Searching Compicfy + MAL, AniList, MangaDex, MangaUpdates…' : (
              results.length > 0
                ? `${results.length} result${results.length !== 1 ? 's' : ''} · ${local.length} on Compicfy, ${external.length} from external sources`
                : searched ? 'No results found' : ''
            )}
          </p>
        )}
      </div>

      {/* ── Results ── */}
      {results.length > 0 && (
        <div className="space-y-6">

          {/* Local results */}
          {local.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-primary" />
                <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  On Compicfy
                </h2>
              </div>
              <div className="space-y-1.5">
                {local.map(r => (
                  <LocalResultCard key={r.id} result={r} />
                ))}
              </div>
            </div>
          )}

          {/* External results */}
          {external.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ExternalLink size={13} className="text-muted-foreground" />
                <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Not on Compicfy yet
                </h2>
                <span className="text-[10px] text-muted-foreground/60">· tap to recommend</span>
              </div>
              <div className="space-y-1.5">
                {external.map(r => (
                  <ExternalResultCard key={r.id} result={r} basePath={basePath} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ── */}
      {searched && !loading && results.length === 0 && query.trim().length >= 2 && (
        <div className="text-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <BookOpen size={24} className="text-muted-foreground opacity-40" />
          </div>
          <div>
            <p className="font-black text-lg">Nothing found for "{query}"</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try a different title, author name, or be the first to recommend it!
            </p>
          </div>
          <Link href={`${basePath}/recommendations/new`}>
            <Button className="gap-2 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0">
              <Plus size={15} />
              Recommend it yourself
            </Button>
          </Link>
        </div>
      )}

      {/* ── Quick links (shown when no query) ── */}
      {query.trim().length < 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-muted-foreground">
            <Flame size={11} />
            Quick Explore
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Local result card (links to comic page) ───────────────────────
function LocalResultCard({ result: r }: { result: SearchResult }) {
  return (
    <Link
      href={`/comic/${r.id}`}
      className="group flex items-center gap-3 p-3 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200"
    >
      <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
        {r.cover_url
          ? <img src={r.cover_url} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center"><BookOpen size={12} className="text-muted-foreground opacity-40" /></div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{r.title}</p>
          <SourceBadge source={r.source} />
        </div>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize', TYPE_COLORS[r.type] ?? TYPE_COLORS.other)}>
            {r.type}
          </span>
          {r.author && <span className="text-[10px] text-muted-foreground truncate">{r.author}</span>}
          {r.genres?.slice(0, 2).map(g => (
            <span key={g} className="text-[10px] text-muted-foreground/60">{g}</span>
          ))}
        </div>
      </div>
      <ArrowRight size={13} className="text-muted-foreground/30 group-hover:text-primary shrink-0 transition-colors" />
    </Link>
  )
}

// ── External result card (prompts to recommend) ───────────────────
// Now accepts basePath
function ExternalResultCard({ result: r, basePath }: { result: SearchResult, basePath: string }) {
  const prefillUrl = buildPrefillUrl(r, basePath)

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card/60 hover:border-primary/20 transition-all duration-200">
      <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
        {r.cover_url
          ? <img src={r.cover_url} alt={r.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><BookOpen size={12} className="text-muted-foreground opacity-40" /></div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold truncate">{r.title}</p>
          <SourceBadge source={r.source} />
        </div>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize', TYPE_COLORS[r.type] ?? TYPE_COLORS.other)}>
            {r.type}
          </span>
          {r.author && <span className="text-[10px] text-muted-foreground truncate">{r.author}</span>}
        </div>
      </div>
      {/* Recommend CTA */}
      <Link href={prefillUrl} className="shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/60 transition-all"
        >
          <BookOpen size={11} />
          Recommend
        </Button>
      </Link>
    </div>
  )
}

function SourceBadge({ source }: { source: string }) {
  const meta = SOURCE_LABELS[source]
  if (!meta) return null
  return (
    <span className={cn('text-[9px] font-black px-1.5 py-0.5 rounded-full border uppercase tracking-wide', meta.color)}>
      {meta.label}
    </span>
  )
}