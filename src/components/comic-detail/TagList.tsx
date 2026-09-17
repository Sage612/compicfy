// src/components/comic-detail/TagList.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Loader2 } from 'lucide-react'
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

interface Props {
  recommendationId: string
  isLoggedIn:        boolean
}

export function TagList({ recommendationId, isLoggedIn }: Props) {
  const [tags,        setTags]        = useState<RecommendationTag[]>([])
  const [loading,      setLoading]     = useState(true)
  const [showPicker,   setShowPicker]  = useState(false)
  const [allTags,      setAllTags]     = useState<Tag[]>([])
  const [adding,       setAdding]      = useState<string | null>(null)

  const loadTags = useCallback(async () => {
    try {
      // Comic pages don't have a dedicated GET-tags-for-comic endpoint
      // yet — fetching via the same list the comic detail page's server
      // component could have passed down, but since this is a client
      // component wired in after the fact, it pulls directly. Kept
      // simple: a small, comic-scoped select via the public REST-style
      // filter Supabase's PostgREST already exposes through
      // recommendation_tags, joined to tags.
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

  if (loading) return null // no skeleton — tags are a secondary detail, don't shift layout for a brief load

  return (
    <div className="flex flex-wrap justify-center md:justify-start gap-1.5 items-center">
      {tags.map(({ relationId, tag }) => (
        <div
          key={relationId}
          className="group relative inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-[11px] font-medium border border-dossier-foreground/10 text-dossier-foreground/60 hover:border-dossier-foreground/25 transition-colors"
        >
          <span className={tag.category === 'trope' ? 'text-violet-400/90' : 'text-sky-400/90'}>
            {tag.name}
          </span>
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

      {!showPicker ? (
        <button
          onClick={openPicker}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-dashed border-dossier-foreground/15 text-dossier-foreground/40 hover:border-dossier-foreground/30 hover:text-dossier-foreground/70 transition-colors"
        >
          <Plus size={10} />
          Add tag
        </button>
      ) : (
        <div className="w-full mt-2 p-3 rounded-xl border border-dossier-foreground/10 bg-dossier-panel/40 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-dossier-foreground/40 font-[family-name:var(--font-mono)]">
              Add a tag
            </p>
            <button onClick={() => setShowPicker(false)} className="text-dossier-foreground/40 hover:text-dossier-foreground/70">
              <X size={12} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {allTags
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
              ))}
          </div>
        </div>
      )}
    </div>
  )
}