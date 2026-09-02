'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search, Loader2, BookOpen, X, ArrowRight,
  Database, Globe, Plus, TrendingUp, Star, Radar,
  Users, Crown, ShieldCheck, UserCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AuthPromptModal } from '@/components/ui/auth-prompt-modal'

function proxyCover(url: string | null | undefined): string {
  if (!url) return "" // Returning an empty string satisfies the 'string' requirement
  if (url.startsWith('data:')) return url
  if (url.startsWith('/')) return url
  if (url.includes('/api/image-proxy')) return url

  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

// ── Types ─────────────────────────────────────────────────────────

interface DBResult {
  source:    'ComPicfy'
  id:        string
  title:     string
  type:      string
  cover_url: string | null
  author:    string | null
  genres:    string[]
  status:    string
  upvotes:   number
  score:     number
}

interface ExternalResult {
  source:            'jikan' | 'mangadex' | 'anilist' | 'mangaupdates'
  id:                string
  title:             string
  type:              string
  coverUrl:          string
  author:            string
  artist:            string
  genres:            string[]
  status:            string
  year:              number | null
  chapters:          number | null
  score:             number | null
  description:       string
  alternativeTitles: string[]
}

interface UserResult {
  id:          string
  username:    string
  displayName: string | null
  avatarUrl:   string | null
  bio:         string | null
  isPro:       boolean
  isPatron:    boolean
  isAdmin:     boolean
}

// ── Constants ─────────────────────────────────────────────────────

const QUICK_LINKS = [
  { label: '🔥 Trending',      href: '/browse?sort=trending' },
  { label: '🆕 New this week', href: '/browse?sort=recent'   },
  { label: '❤️ Top rated',     href: '/browse?sort=score'    },
  { label: '⚔️ Action',        href: '/browse?genre=Action'  },
  { label: '🌸 Romance',       href: '/browse?genre=Romance' },
  { label: '✨ Fantasy',       href: '/browse?genre=Fantasy' },
  { label: '👻 Horror',        href: '/browse?genre=Horror'  },
  { label: '🎭 Drama',         href: '/browse?genre=Drama'   },
  { label: '🚀 Sci-Fi',        href: '/browse?genre=Sci-Fi'  },
  { label: '😂 Comedy',        href: '/browse?genre=Comedy'  },
]

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-teal-500/10 text-teal-500 border-teal-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
  other:   'bg-zinc-500/10   text-zinc-400   border-zinc-500/20',
}

const TYPE_FILTERS = ['all', 'manhwa', 'manga', 'manhua', 'webtoon', 'comic'] as const
type TypeFilter = typeof TYPE_FILTERS[number]

type SearchMode = 'comics' | 'users'

// ── Pre-fill URL builder ───────────────────────────────────────────

function buildPrefillUrl(result: ExternalResult, isPro: boolean): string {
  const base   = isPro
    ? '/pro/reader/dashboard/recommendations/new'
    : '/reader/dashboard/recommendations/new'
  const params = new URLSearchParams({
    title:       result.title                        ?? '',
    author:      result.author                       ?? '',
    artist:      result.artist                       ?? '',
    description: result.description?.slice(0, 2000) ?? '',
    type:        result.type                         ?? 'manga',
    status:      result.status                       ?? 'ongoing',
    cover_url:   result.coverUrl                     ?? '',
    ...(result.year     ? { year_released: String(result.year)     } : {}),
    ...(result.chapters ? { chapter_count: String(result.chapters) } : {}),
    genres: (result.genres ?? []).slice(0, 5).join(','),
  })
  return `${base}?${params.toString()}`
}

// ── DB result card ────────────────────────────────────────────────

function DBCard({ result }: { result: DBResult }) {
  const typeColor = TYPE_COLORS[result.type] ?? TYPE_COLORS.other
  return (
    <Link
      href={`/comic/${result.id}`}
      className="group flex gap-3 p-3.5 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200"
    >
      <div className="w-12 h-[68px] rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm">
        {result.cover_url
          ? <img src={proxyCover(result.cover_url)} alt={result.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center"><BookOpen size={14} className="text-muted-foreground opacity-40" /></div>
        }
      </div>
      <div className="flex-1 min-w-0 space-y-1 py-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="font-black text-sm line-clamp-2 leading-snug group-hover:text-primary transition-colors">{result.title}</p>
          <ArrowRight size={12} className="text-muted-foreground/30 group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-primary/10 text-primary border-primary/20">
            <Database size={8} />
            ComPicfy
          </span>
          <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize', typeColor)}>
            {result.type}
          </span>
          <span className="text-[10px] text-muted-foreground capitalize">{result.status}</span>
        </div>
        {result.author && <p className="text-xs text-muted-foreground truncate">by {result.author}</p>}
        {result.upvotes > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <TrendingUp size={9} className="text-emerald-500" />
            {result.upvotes} upvotes
          </span>
        )}
      </div>
    </Link>
  )
}

// ── External result card ──────────────────────────────────────────

function ExternalCard({
  result,
  isPro,
  isLoggedIn,
  onAuthRequired,
}: {
  result:         ExternalResult
  isPro:          boolean
  isLoggedIn:     boolean
  onAuthRequired: (prefillUrl: string, title: string) => void
}) {
  const typeColor  = TYPE_COLORS[result.type] ?? TYPE_COLORS.other
  const prefillUrl = buildPrefillUrl(result, isPro)
  const detailUrl  = `/external/${result.source}/${result.id}`

  const handleRecommendClick = (e: React.MouseEvent) => {
    e.stopPropagation() // don't trigger the card's own navigation
    if (!isLoggedIn) {
      e.preventDefault()
      onAuthRequired(prefillUrl, result.title)
    }
  }

  return (
    <Link
      href={detailUrl}
      className="group flex gap-3 p-3.5 rounded-2xl border border-border bg-card/60 hover:border-primary/30 hover:shadow-md transition-all duration-200"
    >
      <div className="w-12 h-[68px] rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm">
        {result.coverUrl
          ? <img src={result.coverUrl} alt={result.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center"><BookOpen size={14} className="text-muted-foreground opacity-40" /></div>
        }
      </div>
      <div className="flex-1 min-w-0 space-y-1 py-0.5">
        <p className="font-black text-sm line-clamp-2 leading-snug group-hover:text-primary transition-colors">{result.title}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-primary/10 text-primary border-primary/20">
            <Globe size={8} />
            External
          </span>
          <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize', typeColor)}>
            {result.type}
          </span>
          <span className="text-[10px] text-muted-foreground capitalize">{result.status}</span>
          {result.score != null && result.score > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-500 font-bold">
              <Star size={9} className="fill-amber-400" />
              {result.score.toFixed(1)}
            </span>
          )}
        </div>
        {result.author && <p className="text-xs text-muted-foreground truncate">by {result.author}</p>}
        {result.description && (
          <p className="text-[11px] text-muted-foreground/70 line-clamp-2 leading-relaxed">
            {result.description}
          </p>
        )}
        <div className="pt-0.5">
          <Link href={prefillUrl} onClick={handleRecommendClick}>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-[11px] border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 transition-all"
            >
              <Plus size={10} />
              Recommend to ComPicfy
            </Button>
          </Link>
        </div>
      </div>
    </Link>
  )
}

// ── User result card ──────────────────────────────────────────────

function UserCard({ result }: { result: UserResult }) {
  return (
    <Link
      href={`/profile/${result.username}`}
      className="group flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200"
    >
      <div className="w-11 h-11 rounded-full overflow-hidden bg-muted shrink-0 shadow-sm">
        {result.avatarUrl
          ? <img src={proxyCover(result.avatarUrl)} alt={result.username} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><UserCircle2 size={20} className="text-muted-foreground opacity-40" /></div>
        }
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-1.5">
          <p className="font-black text-sm truncate group-hover:text-primary transition-colors">
            {result.displayName || result.username}
          </p>
          {result.isAdmin && <ShieldCheck size={12} className="text-primary shrink-0" />}
          {result.isPatron && <Crown size={12} className="text-violet-500 shrink-0" />}
          {!result.isPatron && result.isPro && <Crown size={12} className="text-amber-500 shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground truncate">@{result.username}</p>
        {result.bio && (
          <p className="text-[11px] text-muted-foreground/70 line-clamp-1 leading-relaxed">{result.bio}</p>
        )}
      </div>
      <ArrowRight size={12} className="text-muted-foreground/30 group-hover:text-primary shrink-0 transition-colors" />
    </Link>
  )
}

// ── Main Component ────────────────────────────────────────────────

interface Props {
  initialQuery: string
  isPro:        boolean
  isLoggedIn:   boolean
}

export function SearchPageClient({ initialQuery, isPro, isLoggedIn }: Props) {
  const router = useRouter()

  const [mode,             setMode]            = useState<SearchMode>('comics')
  const [query,           setQuery]           = useState(initialQuery)
  const [inputValue,      setInputValue]      = useState(initialQuery)
  const [dbResults,       setDbResults]       = useState<DBResult[]>([])
  const [externalResults, setExternalResults] = useState<ExternalResult[]>([])
  const [userResults,     setUserResults]     = useState<UserResult[]>([])
  const [loadingDB,       setLoadingDB]       = useState(false)
  const [loadingExternal, setLoadingExternal] = useState(false)
  const [loadingUsers,    setLoadingUsers]    = useState(false)
  const [hasSearched,     setHasSearched]     = useState(!!initialQuery)
  const [suggestions,     setSuggestions]     = useState<DBResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Source tab: all / ComPicfy / web
  const [activeTab,  setActiveTab]  = useState<'all' | 'ComPicfy' | 'web'>('all')
  // Type filter: all / manhwa / manga / manhua / webtoon / comic
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const [showAuthModal,  setShowAuthModal]  = useState(false)
  const [authPrefillUrl, setAuthPrefillUrl] = useState('')
  const [authComicTitle, setAuthComicTitle] = useState('')

  const inputRef        = useRef<HTMLInputElement>(null)
  const suggDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef    = useRef<HTMLDivElement>(null)

  const isLoading = mode === 'comics' ? (loadingDB || loadingExternal) : loadingUsers

  const filteredExternal = externalResults.filter(r =>
    !dbResults.some(d => d.title.toLowerCase() === r.title.toLowerCase())
  )

  // Apply type filter across both result sets
  const visibleDB = typeFilter === 'all'
    ? dbResults
    : dbResults.filter(r => r.type === typeFilter)

  const visibleExternal = typeFilter === 'all'
    ? filteredExternal
    : filteredExternal.filter(r => r.type === typeFilter)

  const totalResults = mode === 'comics'
    ? dbResults.length + filteredExternal.length
    : userResults.length
  const visibleTotal = mode === 'comics'
    ? visibleDB.length + visibleExternal.length
    : userResults.length

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (initialQuery.trim().length >= 2) runSearch(initialQuery, mode)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSuggestions = useCallback(async (q: string) => {
    if (mode !== 'comics') return // no live-suggestion dropdown for user search
    if (q.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return }
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`)
      const data = await res.json()
      setSuggestions(data.results ?? [])
      setShowSuggestions(true)
    } catch {
      setSuggestions([])
    }
  }, [mode])

  const runSearch = useCallback(async (q: string, searchMode: SearchMode) => {
    const trimmed = q.trim()
    if (trimmed.length < 2) return

    setShowSuggestions(false)
    setHasSearched(true)
    setQuery(trimmed)
    setActiveTab('all')
    setTypeFilter('all')

    const url = new URL(window.location.href)
    url.searchParams.set('q', trimmed)
    window.history.replaceState({}, '', url.toString())

    if (searchMode === 'users') {
      setLoadingUsers(true)
      fetch(`/api/search/users?q=${encodeURIComponent(trimmed)}&limit=20`)
        .then(r => r.json())
        .then(d => setUserResults(d.results ?? []))
        .catch(() => setUserResults([]))
        .finally(() => setLoadingUsers(false))
      return
    }

    setLoadingDB(true)
    fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=20`)
      .then(r => r.json())
      .then(d => setDbResults(d.results ?? []))
      .catch(() => setDbResults([]))
      .finally(() => setLoadingDB(false))

    setLoadingExternal(true)
    fetch(`/api/manga-search?q=${encodeURIComponent(trimmed)}`)
      .then(r => r.json())
      .then(d => setExternalResults(d.results ?? []))
      .catch(() => setExternalResults([]))
      .finally(() => setLoadingExternal(false))
  }, [])

  const handleModeChange = (next: SearchMode) => {
    if (next === mode) return
    setMode(next)
    setShowSuggestions(false)
    // Re-run the current query against the new mode, if there is one —
    // switching modes mid-search should show that same query's results
    // in the new mode, not silently clear the search.
    if (query.trim().length >= 2) runSearch(query, next)
  }

  const handleInputChange = (value: string) => {
    setInputValue(value)
    if (suggDebounceRef.current) clearTimeout(suggDebounceRef.current)
    suggDebounceRef.current = setTimeout(() => fetchSuggestions(value), 200)
  }

  const handleSearch = () => {
    if (inputValue.trim().length < 2) return
    runSearch(inputValue, mode)
  }

  const handleClear = () => {
    setInputValue('')
    setDbResults([])
    setExternalResults([])
    setUserResults([])
    setHasSearched(false)
    setShowSuggestions(false)
    setQuery('')
    setTypeFilter('all')
    const url = new URL(window.location.href)
    url.searchParams.delete('q')
    window.history.replaceState({}, '', url.toString())
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch()
    if (e.key === 'Escape') setShowSuggestions(false)
  }

  const handleSuggestionClick = (s: DBResult) => {
    setShowSuggestions(false)
    router.push(`/comic/${s.id}`)
  }

  const handleAuthRequired = (prefillUrl: string, title: string) => {
    setAuthPrefillUrl(prefillUrl)
    setAuthComicTitle(title)
    setShowAuthModal(true)
  }

  const sourceTabs = [
    { key: 'all',      label: 'All',      count: totalResults            },
    ...(dbResults.length > 0        ? [{ key: 'ComPicfy', label: 'ComPicfy', count: dbResults.length        }] : []),
    ...(filteredExternal.length > 0 ? [{ key: 'web',      label: 'External', count: filteredExternal.length }] : []),
  ]

  // Only show type filters that have at least one result
  const availableTypes = TYPE_FILTERS.filter(t => {
    if (t === 'all') return true
    const inDB  = dbResults.some(r => r.type === t)
    const inExt = filteredExternal.some(r => r.type === t)
    return inDB || inExt
  })

  return (
    <div className="min-h-screen">

      {/* ── Sticky search bar ── */}
      {/* Uses position:sticky + top-[var(--header-h)] so it always sits just below the header.
          When not yet searched it renders as a centred hero instead. */}
      <div className={cn(
        'z-30 transition-all duration-300',
        hasSearched
          ? 'sticky top-14 bg-background/95 backdrop-blur-lg border-b border-border py-3 px-4 shadow-sm'
          : 'py-16 px-4'
      )}>
        <div className={cn('mx-auto', hasSearched ? 'max-w-3xl' : 'max-w-xl text-center')}>

          {!hasSearched && (
            <div className="mb-8 space-y-3">
              <h1 className="text-4xl font-black tracking-tight">
                Find your next{' '}
                <span className="text-primary">obsession</span>
              </h1>
              <p className="text-muted-foreground">
                Search ComPicfy and external databases instantly
              </p>
            </div>
          )}

          {/* Comics / Users mode toggle */}
          <div className={cn('flex justify-center mb-3', hasSearched && 'justify-start')}>
            <div className="inline-flex p-0.5 rounded-full bg-muted/70 border border-border">
              <button
                onClick={() => handleModeChange('comics')}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all',
                  mode === 'comics'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <BookOpen size={12} />
                Comics
              </button>
              <button
                onClick={() => handleModeChange('users')}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all',
                  mode === 'users'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Users size={12} />
                Users
              </button>
            </div>
          </div>

          {/* Search input */}
          <div className="relative w-full" ref={containerRef}>
            <div className={cn(
              'flex items-center gap-2 sm:gap-3 transition-all w-full',
              hasSearched
                ? 'px-3 sm:px-4 py-2 rounded-full bg-muted/60'
                : 'px-4 sm:px-5 py-3.5 rounded-full bg-muted/50 shadow-lg shadow-primary/5'
            )}>
              <Search size={hasSearched ? 14 : 17} className="text-muted-foreground shrink-0 transition-all" />
              <input
                ref={inputRef}
                value={inputValue}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder={mode === 'comics' ? 'Search manga, manhwa…' : 'Search by username or name…'}
                className={cn(
                  'flex-1 bg-transparent outline-none focus:outline-none focus:ring-0 border-none placeholder:text-muted-foreground text-foreground min-w-0 w-0',
                  hasSearched ? 'text-sm' : 'text-base'
                )}
                autoFocus={!initialQuery}
              />
              {isLoading && <Loader2 size={14} className="animate-spin text-muted-foreground shrink-0" />}
              {inputValue && !isLoading && (
                <button onClick={handleClear} className="text-muted-foreground hover:text-foreground transition-colors p-1 shrink-0">
                  <X size={14} />
                </button>
              )}
              <Button
                onClick={handleSearch}
                disabled={inputValue.trim().length < 2}
                size="sm"
                className="shrink-0 h-8 px-4 rounded-full font-bold"
              >
                Search
              </Button>
            </div>

            {/* Live suggestions dropdown — comics mode only */}
            {mode === 'comics' && showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 overflow-hidden z-50">
                <div className="py-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSuggestionClick(s)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="w-7 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                        {s.cover_url
                          ? <img src={proxyCover(s.cover_url)} alt={s.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><BookOpen size={10} className="text-muted-foreground opacity-40" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{s.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize border', TYPE_COLORS[s.type] ?? TYPE_COLORS.other)}>{s.type}</span>
                          {s.author && <span className="text-[10px] text-muted-foreground truncate">{s.author}</span>}
                        </div>
                      </div>
                      <ArrowRight size={11} className="text-muted-foreground/30 shrink-0" />
                    </button>
                  ))}
                  <button
                    onClick={handleSearch}
                    className="w-full flex items-center gap-3 px-4 py-2.5 border-t border-border hover:bg-primary/5 transition-colors text-left mt-1"
                  >
                    <div className="w-7 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Search size={10} className="text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-primary">Search all sources for "{inputValue}"</p>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick browse — hero only, comics mode only */}
          {!hasSearched && mode === 'comics' && (
            <div className="mt-6 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">
                Quick browse
              </p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 justify-start sm:justify-center sm:flex-wrap">
                {QUICK_LINKS.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all whitespace-nowrap shrink-0"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Results ── */}
      {hasSearched && (
        <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">

          {/* USERS MODE — simple flat list, no source tabs, no type filters */}
          {mode === 'users' && (
            <>
              {!isLoading && userResults.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-black text-foreground">{userResults.length}</span>{' '}
                  {userResults.length === 1 ? 'person' : 'people'} for <span className="font-semibold">"{query}"</span>
                </p>
              )}

              {isLoading && (
                <div className="space-y-2.5">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-[68px] rounded-2xl bg-muted/40 animate-pulse" />
                  ))}
                </div>
              )}

              {!isLoading && userResults.length > 0 && (
                <div className="space-y-2">
                  {userResults.map(u => <UserCard key={u.id} result={u} />)}
                </div>
              )}

              {!isLoading && userResults.length === 0 && (
                <div className="text-center py-20 space-y-4">
                  <Users size={40} className="text-muted-foreground/30 mx-auto" />
                  <div>
                    <p className="font-black text-lg">No one found for "{query}"</p>
                    <p className="text-sm text-muted-foreground mt-1">Try a username or display name spelling</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* COMICS MODE — original DB/External split, unchanged */}
          {mode === 'comics' && (
            <>
              {/* Source tabs + type filter row */}
              {!isLoading && totalResults > 0 && (
                <div className="space-y-3">

                  {/* Top row: count + source tabs */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-black text-foreground">{visibleTotal}</span>
                      {visibleTotal !== totalResults && (
                        <span className="text-muted-foreground"> of {totalResults}</span>
                      )}{' '}
                      results for <span className="font-semibold">"{query}"</span>
                    </p>
                    <div className="flex gap-1">
                      {sourceTabs.map(tab => (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key as typeof activeTab)}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                            activeTab === tab.key
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                          )}
                        >
                          {tab.label}{tab.count > 0 && ` (${tab.count})`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Type filter pills — only shown when >1 type available */}
                  {availableTypes.length > 2 && (
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                      {availableTypes.map(t => (
                        <button
                          key={t}
                          onClick={() => setTypeFilter(t)}
                          className={cn(
                            'px-3 py-1 rounded-full text-xs font-semibold border transition-all whitespace-nowrap shrink-0',
                            typeFilter === t
                              ? t === 'all'
                                ? 'bg-foreground text-background border-foreground'
                                : cn(TYPE_COLORS[t], 'border-current opacity-100')
                              : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                          )}
                        >
                          {t === 'all' ? 'All types' : t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Loading skeleton */}
              {isLoading && (
                <div className="space-y-2.5">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-24 rounded-2xl bg-muted/40 animate-pulse" />
                  ))}
                </div>
              )}

              {/* DB results */}
              {!isLoading && (activeTab === 'all' || activeTab === 'ComPicfy') && visibleDB.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                      <Database size={10} className="text-primary" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">In ComPicfy</p>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  {visibleDB.map(r => <DBCard key={r.id} result={r} />)}
                </div>
              )}

              {/* External results */}
              {!isLoading && (activeTab === 'all' || activeTab === 'web') && visibleExternal.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                      <Globe size={10} className="text-primary" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      From External Databases
                    </p>
                    <div className="flex-1 h-px bg-border" />
                    {loadingExternal && <Loader2 size={11} className="animate-spin text-muted-foreground" />}
                  </div>
                  {visibleExternal.map(r => (
                    <ExternalCard
                      key={r.id}
                      result={r}
                      isPro={isPro}
                      isLoggedIn={isLoggedIn}
                      onAuthRequired={handleAuthRequired}
                    />
                  ))}
                </div>
              )}

              {/* ComPicfy tab empty */}
              {!isLoading && activeTab === 'ComPicfy' && visibleDB.length === 0 && (
                <div className="text-center py-10 rounded-2xl border border-dashed border-border space-y-2">
                  <Database size={24} className="text-muted-foreground/30 mx-auto" />
                  <p className="text-sm font-semibold">Not in ComPicfy yet</p>
                  <p className="text-xs text-muted-foreground">Check the External tab to find it and add it</p>
                </div>
              )}

              {/* External tab empty */}
              {!isLoading && activeTab === 'web' && visibleExternal.length === 0 && (
                <div className="text-center py-10 rounded-2xl border border-dashed border-border space-y-2">
                  <Globe size={24} className="text-muted-foreground/30 mx-auto" />
                  <p className="text-sm font-semibold">Nothing found in external databases</p>
                  <p className="text-xs text-muted-foreground">Try a different title or spelling</p>
                </div>
              )}

              {/* Type filter empty state */}
              {!isLoading && totalResults > 0 && visibleTotal === 0 && typeFilter !== 'all' && (
                <div className="text-center py-10 rounded-2xl border border-dashed border-border space-y-2">
                  <p className="text-sm font-semibold">No {typeFilter} results for "{query}"</p>
                  <button
                    onClick={() => setTypeFilter('all')}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    Show all types →
                  </button>
                </div>
              )}

              {/* Zero results */}
              {!isLoading && totalResults === 0 && (
                <div className="text-center py-20 space-y-4">
                  <div className="relative w-28 h-28 mx-auto mb-2">
                    <div className="absolute top-0 left-2 w-16 h-[88px] rounded-xl border-2 border-border bg-muted/60 rotate-[-8deg]" />
                    <div className="absolute top-2 left-5 w-16 h-[88px] rounded-xl border-2 border-border bg-muted/80 rotate-[-3deg]" />
                    <div className="absolute top-4 left-8 w-16 h-[88px] rounded-xl border-2 border-primary/20 bg-card flex items-center justify-center shadow-lg">
                      <Search size={18} className="text-muted-foreground opacity-40" />
                    </div>
                  </div>
                  <div>
                    <p className="font-black text-lg">Nothing found for "{query}"</p>
                    <p className="text-sm text-muted-foreground mt-1">Try a different spelling, or check the original title</p>
                  </div>
                  <div className="flex gap-3 justify-center flex-wrap pt-2">
                    <Link href="/browse">
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Radar size={13} />
                        Browse all comics
                      </Button>
                    </Link>
                    <Link href={isPro ? '/pro/reader/dashboard/recommendations/new' : '/reader/dashboard/recommendations/new'}>
                      <Button size="sm" className="gap-1.5">
                        <BookOpen size={13} />
                        Add it yourself
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Auth prompt modal */}
      <AuthPromptModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        config={{
          action:     `recommend "${authComicTitle}" to ComPicfy`,
          comicTitle: authComicTitle,
          icon:       <Plus size={24} className="text-primary" />,
          nextPath:   authPrefillUrl,
        }}
      />
    </div>
  )
}