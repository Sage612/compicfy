'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  BookOpen, Globe, Lock, Bookmark, BookmarkCheck,
  ArrowLeft, Loader2, Trash2, Plus,
} from 'lucide-react'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { cn } from '@/lib/utils'
import type { Recommendation } from '@/types/database.types'

interface CollectionItem {
  id:                string
  position:          number
  note:              string | null
  recommendations:   Recommendation
}

interface Collection {
  id:           string
  user_id:      string
  title:        string
  description:  string | null
  cover_url:    string | null
  theme_color:  string
  is_published: boolean
  save_count:   number
  view_count:   number
  created_at:   string
  profiles: {
    username:             string
    display_name:         string | null
    avatar_url:           string | null
    verified_recommender: boolean
  } | null
  collection_items: CollectionItem[]
}

const THEME_STYLES: Record<string, { gradient: string; border: string; text: string }> = {
  primary: { gradient: 'from-primary/25 via-primary/10',       border: 'border-primary/30',     text: 'text-primary'     },
  violet:  { gradient: 'from-violet-500/25 via-violet-500/10', border: 'border-violet-500/30',  text: 'text-violet-500'  },
  rose:    { gradient: 'from-rose-500/25 via-rose-500/10',     border: 'border-rose-500/30',    text: 'text-rose-500'    },
  amber:   { gradient: 'from-amber-500/25 via-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-500'   },
  emerald: { gradient: 'from-emerald-500/25 via-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-500' },
  indigo:  { gradient: 'from-indigo-500/25 via-indigo-500/10', border: 'border-indigo-500/30',  text: 'text-indigo-500'  },
}

interface Props {
  collection:  Collection
  isSaved:     boolean
  isOwner:     boolean
  isLoggedIn:  boolean
}

export function CollectionDetailClient({ collection, isSaved: initialSaved, isOwner, isLoggedIn }: Props) {
  const [saved,        setSaved]        = useState(initialSaved)
  const [savingState,  setSavingState]  = useState(false)
  const [removingId,   setRemovingId]   = useState<string | null>(null)
  const [items,        setItems]        = useState<CollectionItem[]>(collection.collection_items ?? [])

  const theme = THEME_STYLES[collection.theme_color] ?? THEME_STYLES.primary

  const handleSave = async () => {
    if (!isLoggedIn) { toast.error('Log in to save collections'); return }
    setSavingState(true)
    try {
      const method = saved ? 'DELETE' : 'POST'
      await fetch(`/api/collections/${collection.id}/save`, { method })
      setSaved(!saved)
      toast.success(saved ? 'Removed from saved' : 'Collection saved!')
    } catch {
      toast.error('Failed to update')
    } finally {
      setSavingState(false)
    }
  }

  const handleRemoveItem = async (itemId: string, recId: string) => {
    if (!confirm('Remove this comic from the collection?')) return
    setRemovingId(itemId)
    try {
      await fetch(`/api/collections/${collection.id}/items`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recommendation_id: recId }),
      })
      setItems(prev => prev.filter(i => i.id !== itemId))
      toast.success('Removed from collection')
    } catch {
      toast.error('Failed to remove')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* Back */}
      <Link href="/collections" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={13} />
        All Collections
      </Link>

      {/* Header card */}
      <div className={cn('rounded-2xl border overflow-hidden', theme.border)}>
        {/* Banner */}
        <div className={cn('h-28 md:h-36 bg-gradient-to-br to-transparent relative overflow-hidden', theme.gradient)}>
          {collection.cover_url && (
            <img src={collection.cover_url} alt={collection.title} className="absolute inset-0 w-full h-full object-cover opacity-30" />
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
        </div>

        <div className="px-6 pb-6 -mt-8 space-y-4">
          {/* Title + actions */}
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-tight leading-tight">{collection.title}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                {collection.is_published
                  ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600"><Globe size={9} /> Public</span>
                  : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground"><Lock size={9} /> Draft</span>
                }
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] text-muted-foreground">{items.length} comic{items.length !== 1 ? 's' : ''}</span>
                {collection.save_count > 0 && (
                  <>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">{collection.save_count} saves</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 pb-1">
              {!isOwner && (
                <Button
                  size="sm"
                  variant={saved ? 'default' : 'outline'}
                  onClick={handleSave}
                  disabled={savingState}
                  className={cn('gap-1.5 h-8 text-xs', saved && 'bg-primary')}
                >
                  {savingState
                    ? <Loader2 size={12} className="animate-spin" />
                    : saved
                    ? <BookmarkCheck size={12} />
                    : <Bookmark size={12} />
                  }
                  {saved ? 'Saved' : 'Save'}
                </Button>
              )}
              {isOwner && (
                <Link href={`/dashboard/collections/${collection.id}/edit`}>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    Edit Collection
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Description */}
          {collection.description && (
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
              {collection.description}
            </p>
          )}

          {/* Curator credit */}
          {collection.profiles && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Curated by</span>
              <Link href={`/profile/${collection.profiles.username}`} className={cn('font-semibold hover:underline', theme.text)}>
                @{collection.profiles.username}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Comics grid */}
      {items.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto">
            <BookOpen size={20} className="text-muted-foreground opacity-40" />
          </div>
          <p className="font-black text-sm">No comics in this collection yet</p>
          {isOwner && (
            <p className="text-xs text-muted-foreground">
              Add comics from any comic detail page using the "Add to Collection" button.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Comics in this collection
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 relative">
            {items.map((item) => (
              <div key={item.id} className="relative group/item">
                <ComicCard recommendation={item.recommendations} />
                {/* Remove button for owner */}
                {isOwner && (
                  <button
                    onClick={() => handleRemoveItem(item.id, item.recommendations.id)}
                    disabled={removingId === item.id}
                    className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-destructive/80 text-white flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-destructive"
                    title="Remove from collection"
                  >
                    {removingId === item.id
                      ? <Loader2 size={10} className="animate-spin" />
                      : <Trash2 size={10} />
                    }
                  </button>
                )}
                {/* Note */}
                {item.note && (
                  <p className="text-[10px] text-muted-foreground mt-1 px-1 line-clamp-2 italic">
                    "{item.note}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}