// src/components/recommendations/TagPicker.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { Loader2, Plus, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Tag {
  id:       string
  name:     string
  category: 'trope' | 'mood'
}

interface Props {
  value:    string[] // array of tag IDs
  onChange: (ids: string[]) => void
  error?:   string
  max?:     number
}

const MAX_TAGS_DEFAULT = 10 // deliberately lower than the 15 hard cap
                             // enforced server-side (per-comic total,
                             // including tags added later by others) —
                             // leaves headroom for community additions
                             // after submission rather than a submitter
                             // maxing it out alone.

export function TagPicker({ value, onChange, error, max = MAX_TAGS_DEFAULT }: Props) {
  const [tags,          setTags]          = useState<Tag[]>([])
  const [loading,        setLoading]       = useState(true)
  const [query,          setQuery]         = useState('')
  const [activeCategory, setActiveCategory] = useState<'trope' | 'mood'>('trope')
  const [showSuggestForm, setShowSuggestForm] = useState(false)
  const [suggestName,     setSuggestName]     = useState('')
  const [suggesting,      setSuggesting]      = useState(false)

  useEffect(() => {
    fetch('/api/tags')
      .then(r => r.json())
      .then(d => setTags(d.tags ?? []))
      .catch(() => setTags([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tags
      .filter(t => t.category === activeCategory)
      .filter(t => !q || t.name.toLowerCase().includes(q))
  }, [tags, activeCategory, query])

  const selectedTags = useMemo(
    () => value.map(id => tags.find(t => t.id === id)).filter(Boolean) as Tag[],
    [value, tags]
  )

  const toggle = (tagId: string) => {
    if (value.includes(tagId)) {
      onChange(value.filter(id => id !== tagId))
      return
    }
    if (value.length >= max) {
      toast.error(`You can select up to ${max} tags`)
      return
    }
    onChange([...value, tagId])
  }

  const handleSuggest = async () => {
    if (!suggestName.trim()) return
    setSuggesting(true)
    try {
      const res = await fetch('/api/tags/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: suggestName.trim(), category: activeCategory }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to suggest tag')
        return
      }
      toast.success(`"${suggestName.trim()}" suggested — it'll appear once approved`)
      setSuggestName('')
      setShowSuggestForm(false)
    } catch {
      toast.error('Failed to suggest tag')
    } finally {
      setSuggesting(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map(tag => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all',
                tag.category === 'trope'
                  ? 'bg-violet-500/10 text-violet-600 border-violet-500/30'
                  : 'bg-sky-500/10 text-sky-600 border-sky-500/30'
              )}
            >
              {tag.name}
              <X size={10} className="opacity-60" />
            </button>
          ))}
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-1.5">
        {(['trope', 'mood'] as const).map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-bold border transition-all capitalize',
              activeCategory === cat
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
            )}
          >
            {cat}s
          </button>
        ))}
        <span className="ml-auto text-[11px] text-muted-foreground self-center">
          {value.length}/{max}
        </span>
      </div>

      {/* Search box */}
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={`Search ${activeCategory} tags…`}
        className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary/50 transition-colors"
      />

      {/* Tag grid */}
      {loading ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
          {filtered.map(tag => {
            const isSelected = value.includes(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggle(tag.id)}
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                  isSelected
                    ? 'bg-primary/10 text-primary border-primary/40'
                    : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                )}
              >
                {isSelected && <Check size={10} />}
                {tag.name}
              </button>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-2">
          {query ? `No ${activeCategory} tags match "${query}"` : `No ${activeCategory} tags yet`}
        </p>
      )}

      {/* Suggest new tag */}
      {!showSuggestForm ? (
        <button
          type="button"
          onClick={() => { setShowSuggestForm(true); setSuggestName(query) }}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <Plus size={11} />
          Can't find the right {activeCategory} tag? Suggest one
        </button>
      ) : (
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-border">
          <input
            value={suggestName}
            onChange={e => setSuggestName(e.target.value)}
            placeholder={`New ${activeCategory} tag name…`}
            maxLength={40}
            className="flex-1 h-8 px-2.5 rounded-md border border-border bg-background text-xs outline-none focus:border-primary/50"
            autoFocus
          />
          <button
            type="button"
            onClick={handleSuggest}
            disabled={!suggestName.trim() || suggesting}
            className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
          >
            {suggesting ? <Loader2 size={11} className="animate-spin" /> : 'Suggest'}
          </button>
          <button
            type="button"
            onClick={() => { setShowSuggestForm(false); setSuggestName('') }}
            className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground flex items-center justify-center"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Tags are optional. Anyone can add more tags to this comic later — no single person knows every trope or mood that applies.
      </p>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}