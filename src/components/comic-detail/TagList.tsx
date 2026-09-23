// src/components/comic-detail/TagList.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, X, Loader2, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { ReportButton } from '@/components/recommendations/ReportButton'

interface Tag {
  id:       string
  name:     string
  category: 'trope' | 'mood'
}

interface RecommendationTag {
  relationId: string // recommendation_tags.id — what gets reported/flagged
  tag:        Tag
}

interface LeadingItem {
  label: string
  href?: string
}

interface Props {
  recommendationId: string
  isLoggedIn:        boolean
  /** Section heading. Defaults to 'Tags'. Pass 'Genres & Tags' when
   *  leadingItems (genres) are also supplied, so there's one heading
   *  covering both instead of two stacked headings for the same block. */
  heading?:           string
  /** Read-only pills rendered before the fetched/editable tags — used
   *  for the comic's genres, which aren't part of the tags system and
   *  have no add/report affordance of their own. */
  leadingItems?:      LeadingItem[]
  /** When true, the whole section becomes an expand/collapse accordion
   *  (collapsed by default) instead of always-open. */
  collapsible?:       boolean
}

export function TagList({
  recommendationId,
  isLoggedIn,
  heading = 'Tags',
  leadingItems = [],
  collapsible = false,
}: Props) {
  const [tags,        setTags]        = useState<RecommendationTag[]>([])
  const [loading,      setLoading]     = useState(true)
  const [showPicker,   setShowPicker]  = useState(false)
  const [allTags,      setAllTags]     = useState<Tag[]>([])
  const [adding,       setAdding]      = useState<string | null>(null)
  const [expanded,     setExpanded]    = useState(!collapsible)

  const [showSuggestForm, setShowSuggestForm] = useState(false)
  const [suggestName,     setSuggestName]     = useState('')
  const [suggestCategory, setSuggestCategory] = useState<'trope' | 'mood'>('trope')
  const [suggesting,      setSuggesting]      = useState(false)

  const loadTags = useCallback(async () => {
    try {
      const res = await fetch(`/api/recommendation-tags?recommendation_id=${recommendationId}`)
      const data = await res.json()
      setTags(data.tags ?? [])
    } catch {
      setTags([])
    } finally {
      setLoading(false)
    }
  }, [recommendationId])

  useEffect(() => { loadTags() }, [loadTags])

  const openPicker = async () => {
    setShowPicker(true)
    if (allTags.length === 0) {
      const res = await fetch('/api/tags')
      const data = await res.json()
      setAllTags(data.tags ?? [])
    }
  }

  const alreadyAttachedIds = new Set(tags.map(t => t.tag.id))

  const handleAdd = async (tagId: string) => {
    setAdding(tagId)
    try {
      const res = await fetch('/api/recommendation-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendation_id: recommendationId, tag_id: tagId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to add tag')
        return
      }
      const addedTag = allTags.find(t => t.id === tagId)
      if (addedTag) {
        setTags(prev => [...prev, { relationId: data.relation.id, tag: addedTag }])
      }
    } catch {
      toast.error('Failed to add tag')
    } finally {
      setAdding(null)
    }
  }

  const handleSuggest = async () => {
    if (!suggestName.trim()) return
    setSuggesting(true)
    try {
      const res = await fetch('/api/tags/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: suggestName.trim(), category: suggestCategory }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to suggest tag')
        return
      }
      toast.success(`"${suggestName.trim()}" suggested — it'll be selectable once approved`)
      setSuggestName('')
      setShowSuggestForm(false)
    } catch {
      toast.error('Failed to suggest tag')
    } finally {
      setSuggesting(false)
    }
  }

  if (loading) return null

  // Nothing attached, no genres passed in, and the viewer can't add
  // anything (logged out) — don't render an empty section at all.
  if (tags.length === 0 && leadingItems.length === 0 && !isLoggedIn) return null

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => collapsible && setExpanded(v => !v)}
        className="w-full flex items-center justify-between"
        disabled={!collapsible}
      >
        <h2 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-dossier-foreground/40">
          {heading}
        </h2>
        {collapsible && (
          <ChevronDown
            size={13}
            className={`text-dossier-foreground/40 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {expanded && (
        <div className="flex flex-wrap justify-center md:justify-start gap-1.5 items-center">
          {leadingItems.map(item => (
            item.href ? (
              <Link key={item.label} href={item.href}>
                <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium border border-dossier-foreground/10 text-dossier-foreground/60 hover:border-dossier-foreground/30 hover:text-dossier-foreground transition-colors">
                  {item.label}
                </span>
              </Link>
            ) : (
              <span
                key={item.label}
                className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium border border-dossier-foreground/10 text-dossier-foreground/60"
              >
                {item.label}
              </span>
            )
          ))}

          {tags.map(({ relationId, tag }) => (
            <div
              key={relationId}
              className="group relative inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-[11px] font-medium border border-dossier-foreground/10 text-dossier-foreground/60 hover:border-dossier-foreground/30 hover:text-dossier-foreground transition-colors"
            >
              <span>{tag.name}</span>
              {isLoggedIn && (
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ReportButton
                    entityType="recommendation_tag"
                    entityId={relationId}
                    isLoggedIn={isLoggedIn}
                    compact
                  />
                </span>
              )}
            </div>
          ))}

          {isLoggedIn && !showPicker && !showSuggestForm && (
            <button
              onClick={openPicker}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-dashed border-dossier-foreground/15 text-dossier-foreground/40 hover:border-dossier-foreground/30 hover:text-dossier-foreground/70 transition-colors"
            >
              <Plus size={10} />
              Add tag
            </button>
          )}
        </div>
      )}

      {expanded && showPicker && (
        <div className="w-full p-3 rounded-xl border border-dossier-foreground/10 bg-dossier-panel/40 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-dossier-foreground/40 font-[family-name:var(--font-mono)]">
              Add an existing tag
            </p>
            <button onClick={() => setShowPicker(false)} className="text-dossier-foreground/40 hover:text-dossier-foreground/70">
              <X size={12} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {allTags.filter(t => !alreadyAttachedIds.has(t.id)).length === 0 ? (
              <p className="text-[11px] text-dossier-foreground/40 py-1">
                Every existing tag is already on this comic.
              </p>
            ) : (
              allTags
                .filter(t => !alreadyAttachedIds.has(t.id))
                .map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleAdd(t.id)}
                    disabled={adding === t.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-dossier-foreground/10 text-dossier-foreground/60 hover:border-dossier-foreground/30 hover:text-dossier-foreground transition-colors disabled:opacity-50"
                  >
                    {adding === t.id && <Loader2 size={9} className="animate-spin" />}
                    {t.name}
                  </button>
                ))
            )}
          </div>

          <div className="pt-2 border-t border-dossier-foreground/10">
            {!showSuggestForm ? (
              <button
                onClick={() => setShowSuggestForm(true)}
                className="inline-flex items-center gap-1.5 text-[11px] text-dossier-foreground/40 hover:text-dossier-foreground/70 transition-colors"
              >
                <Plus size={10} />
                Can't find the right tag? Suggest one
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-1.5">
                  {(['trope', 'mood'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSuggestCategory(cat)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all capitalize ${
                        suggestCategory === cat
                          ? 'bg-dossier-foreground text-dossier border-dossier-foreground'
                          : 'border-dossier-foreground/15 text-dossier-foreground/50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={suggestName}
                    onChange={e => setSuggestName(e.target.value)}
                    placeholder={`New ${suggestCategory} tag name…`}
                    maxLength={40}
                    className="flex-1 h-8 px-2.5 rounded-md border border-dossier-foreground/15 bg-dossier text-xs text-dossier-foreground outline-none focus:border-dossier-foreground/40"
                    autoFocus
                  />
                  <button
                    onClick={handleSuggest}
                    disabled={!suggestName.trim() || suggesting}
                    className="h-8 px-3 rounded-md bg-dossier-foreground text-dossier text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    {suggesting ? <Loader2 size={11} className="animate-spin" /> : 'Suggest'}
                  </button>
                  <button
                    onClick={() => { setShowSuggestForm(false); setSuggestName('') }}
                    className="h-8 w-8 rounded-md text-dossier-foreground/40 hover:text-dossier-foreground/70 flex items-center justify-center shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}