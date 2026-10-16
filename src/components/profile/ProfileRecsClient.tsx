'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Search, X, Loader2, BookOpen } from 'lucide-react'
import type { Recommendation } from '@/types/app.types'
import { toast } from 'sonner'
import { proxyCover } from './shrine/util'

const TYPES = [
  { value: '',        label: 'All'     },
  { value: 'manga',   label: 'Manga'   },
  { value: 'manhwa',  label: 'Manhwa'  },
  { value: 'manhua',  label: 'Manhua'  },
  { value: 'webtoon', label: 'Webtoon' },
  { value: 'comic',   label: 'Comic'   },
  { value: 'other',   label: 'Other'   },
]

const SORTS = [
  { value: 'recent', label: 'Newest'     },
  { value: 'top',    label: 'Top rated'  },
  { value: 'votes',  label: 'Most voted' },
]

const STATUSES = [
  { value: '',          label: 'Any'       },
  { value: 'ongoing',   label: 'Ongoing'   },
  { value: 'completed', label: 'Completed' },
  { value: 'hiatus',    label: 'Hiatus'    },
  { value: 'cancelled', label: 'Cancelled' },
]

const PAGE_SIZE = 24

interface Props {
  username:     string
  userId:       string
  initialItems: Recommendation[]
  initialTotal: number
}

function PillRow({
  label, options, value, onChange,
}: {
  label:    string
  options:  { value: string; label: string }[]
  value:    string
  onChange: (v: string) => void
}) {
  return (
    <div className="sh-fgroup">
      <span className="sh-label">{label}</span>
      <div className="sh-fpills" role="group" aria-label={label}>
        {options.map(o => (
          <button
            key={o.value || 'all'}
            type="button"
            className="sh-fpill"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ProfileRecsClient({ username, userId, initialItems, initialTotal }: Props) {
  const [q,      setQ]      = useState('')
  const [type,   setType]   = useState('')
  const [status, setStatus] = useState('')
  const [sort,   setSort]   = useState('recent')

  const [items,       setItems]       = useState<Recommendation[]>(initialItems)
  const [total,       setTotal]       = useState(initialTotal)
  // offset tracks how many items have actually been loaded
  const [offset,      setOffset]      = useState(initialItems.length)
  const [fetching,    setFetching]    = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  const hasFilters = !!(q || type || status)

  // append=true loads more; false replaces the list after a filter change
  const fetchRecs = useCallback(async (
    filters: { q: string; type: string; status: string; sort: string },
    fetchOffset: number,
    append: boolean,
  ) => {
    if (append) setLoadingMore(true)
    else        setFetching(true)

    try {
      const params = new URLSearchParams()
      params.set('user_id',       userId)
      params.set('offset',        String(fetchOffset))
      params.set('limit',         String(PAGE_SIZE))
      params.set('exclude_adult', 'true')
      params.set('sort',          filters.sort)
      if (filters.q)      params.set('q',      filters.q)
      if (filters.type)   params.set('type',   filters.type)
      if (filters.status) params.set('status', filters.status)

      const res  = await fetch(`/api/profile/${username}/recommendations?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')

      const incoming = (data.recommendations ?? []) as Recommendation[]

      if (append) {
        setItems(prev => [...prev, ...incoming])
        setOffset(prev => prev + incoming.length)
      } else {
        setItems(incoming)
        setTotal(data.total ?? incoming.length)
        setOffset(incoming.length)
      }
    } catch {
      toast.error('Failed to load recommendations')
    } finally {
      setFetching(false)
      setLoadingMore(false)
    }
  }, [username, userId])

  // Re-fetch when a pill changes (skip the server-rendered first mount)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    fetchRecs({ q, type, status, sort }, 0, false)
  }, [type, status, sort]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = (value: string) => {
    setQ(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchRecs({ q: value, type, status, sort }, 0, false)
    }, 400)
  }

  const clearAll = () => {
    setQ(''); setType(''); setStatus(''); setSort('recent')
    fetchRecs({ q: '', type: '', status: '', sort: 'recent' }, 0, false)
  }

  const loadMore = () => fetchRecs({ q, type, status, sort }, offset, true)
  const hasMore  = items.length < total

  return (
    <div className="sh-recs">
      <div className="sh-card sh-fbar">
        <div style={{ position: 'relative' }}>
          <Search size={15} className="sh-search-ico" />
          <input
            className="sh-input"
            style={{ paddingLeft: 34, paddingRight: q ? 34 : undefined }}
            value={q}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search recommendations…"
            aria-label="Search recommendations"
          />
          {q && (
            <button type="button" className="sh-search-clear" aria-label="Clear search" onClick={() => handleSearchChange('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <PillRow label="Sort"   options={SORTS}    value={sort}   onChange={setSort} />
        <PillRow label="Type"   options={TYPES}    value={type}   onChange={setType} />
        <PillRow label="Status" options={STATUSES} value={status} onChange={setStatus} />

        <div className="sh-fmeta">
          <span>
            {fetching
              ? <><Loader2 size={12} className="sh-spin" /> Filtering…</>
              : <>{total} recommendation{total !== 1 ? 's' : ''}{hasFilters ? ' · filtered' : ''}</>}
          </span>
          {hasFilters && (
            <button type="button" className="sh-flink" onClick={clearAll}>Clear all</button>
          )}
        </div>
      </div>

      {fetching ? (
        <div className="sh-grid" style={{ marginTop: 18 }} aria-hidden>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="sh-rec">
              <div className="sh-rec-cover sh-skel" />
              <div className="sh-skel" style={{ height: 12, width: '75%', borderRadius: 6, marginTop: 10 }} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="sh-empty" style={{ marginTop: 18 }}>
          {hasFilters ? <Search size={22} /> : <BookOpen size={22} />}
          <p className="sh-empty-title">{hasFilters ? 'No matches found' : 'No recommendations yet'}</p>
          <p className="sh-empty-hint">
            {hasFilters ? 'Try adjusting your filters or clearing the search.' : `@${username} hasn't shared any recommendations yet.`}
          </p>
          {hasFilters && <a href="#" onClick={e => { e.preventDefault(); clearAll() }}>Clear filters</a>}
        </div>
      ) : (
        <>
          <div className="sh-grid" style={{ marginTop: 18 }}>
            {items.map(rec => (
              <Link key={rec.id} href={`/comic/${rec.id}`} className="sh-rec">
                <div className="sh-rec-cover">
                  {rec.cover_url
                    ? <img src={proxyCover(rec.cover_url)} alt={rec.title} loading="lazy" />
                    : <span className="sh-pin-fallback">{rec.title}</span>}
                </div>
                <p className="sh-rec-title">{rec.title}</p>
                <p className="sh-rec-meta">{[rec.type, rec.status].filter(Boolean).join(' · ')}</p>
              </Link>
            ))}
          </div>

          {hasMore && (
            <button type="button" className="sh-more sh-more-btn" onClick={loadMore} disabled={loadingMore}>
              {loadingMore
                ? <><Loader2 size={14} className="sh-spin" /> Loading…</>
                : <>Load {Math.min(PAGE_SIZE, total - items.length)} more · {total - items.length} left</>}
            </button>
          )}
        </>
      )}
    </div>
  )
}