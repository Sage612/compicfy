'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Globe, Lock, Bookmark, BookmarkCheck,
  ArrowLeft, Loader2, Trash2, Share2, BookOpen, LayoutGrid,
} from 'lucide-react'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { cn } from '@/lib/utils'
import type { Recommendation } from '@/types/database.types'

interface CollectionItem {
  id:              string
  position:        number
  note:            string | null
  recommendations: Recommendation
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
  primary: { gradient: 'from-primary/30 via-primary/10',         border: 'border-primary/30',     text: 'text-primary'     },
  violet:  { gradient: 'from-violet-500/30 via-violet-500/10',   border: 'border-violet-500/30',  text: 'text-violet-500'  },
  rose:    { gradient: 'from-rose-500/30 via-rose-500/10',       border: 'border-rose-500/30',    text: 'text-rose-500'    },
  amber:   { gradient: 'from-amber-500/30 via-amber-500/10',     border: 'border-amber-500/30',   text: 'text-amber-500'   },
  emerald: { gradient: 'from-emerald-500/30 via-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-500' },
  indigo:  { gradient: 'from-indigo-500/30 via-indigo-500/10',   border: 'border-indigo-500/30',  text: 'text-indigo-500'  },
}

interface Props {
  collection: Collection
  isSaved:    boolean
  isOwner:    boolean
  isLoggedIn: boolean
}

export function CollectionDetailClient({ collection, isSaved: initialSaved, isOwner, isLoggedIn }: Props) {
  const [saved,       setSaved]       = useState(initialSaved)
  const [savingState, setSavingState] = useState(false)
  const [removingId,  setRemovingId]  = useState<string | null>(null)
  const [items,       setItems]       = useState<CollectionItem[]>(collection.collection_items ?? [])

  const theme  = THEME_STYLES[collection.theme_color] ?? THEME_STYLES.primary

  // Grab up to 6 covers from comics in collection
  const covers = items
    .map(i => i.recommendations?.cover_url)
    .filter(Boolean)
    .slice(0, 6) as string[]

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

  const handleShare = async () => {
    const url = `${window.location.origin}/collections/${collection.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied!')
    } catch {
      toast.error('Failed to copy link')
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

        {/* Banner — mosaic of comic covers */}
        <div className="h-36 md:h-48 relative overflow-hidden bg-muted">
          {covers.length > 0 ? (
            <div className="absolute inset-0 flex gap-0.5">
              {covers.map((url, i) => (
                <div
                  key={i}
                  className={cn(
                    'relative overflow-hidden shrink-0',
                    covers.length === 1 ? 'flex-1' :
                    covers.length === 2 ? 'flex-1' :
                    covers.length >= 3 && i === 0 ? 'w-2/5' : 'flex-1',
                  )}
                >
                  <img
                    src={url}
                    alt=""
                    className="w-full h-full object-cover"
                    aria-hidden
                  />
                </div>
              ))}
            </div>
          ) : collection.cover_url ? (
            <img src={collection.cover_url} alt={collection.title} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            /* Fallback gradient */
            <div className={cn('absolute inset-0 bg-gradient-to-br to-transparent', theme.gradient)} />
          )}

          {/* Overlay gradients for readability */}
          <div className={cn('absolute inset-0 bg-gradient-to-br opacity-60 to-transparent', theme.gradient)} />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />

          {/* Status badge */}
          <div className="absolute top-3 right-3">
            {collection.is_published
              ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 backdrop-blur-sm"><Globe size={9} /> Public</span>
              : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-muted/80 text-muted-foreground border border-border backdrop-blur-sm"><Lock size={9} /> Draft</span>
            }
          </div>

          {/* Collection icon watermark */}
          <div className="absolute top-3 left-3">
            <div className="w-8 h-8 rounded-lg bg-background/60 backdrop-blur-sm border border-border flex items-center justify-center">
              <LayoutGrid size={14} className={theme.text} />
            </div>
          </div>
        </div>

        {/* Info section */}
        <div className="px-5 pb-5 pt-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-black tracking-tight leading-tight">{collection.title}</h1>
              <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <BookOpen size={10} />
                  {items.length} comic{items.length !== 1 ? 's' : ''}
                </span>
                {collection.save_count > 0 && (
                  <>
                    <span>·</span>
                    <span>{collection.save_count} saves</span>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={handleShare}
                className="h-8 text-xs gap-1.5"
              >
                <Share2 size={12} />
                Share
              </Button>

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
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    Edit
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

          {/* Curator */}
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
          <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Comics in this collection
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={item.id} className="relative group/item">
                <ComicCard recommendation={item.recommendations} />
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