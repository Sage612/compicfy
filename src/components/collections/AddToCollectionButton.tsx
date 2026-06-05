'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Layers, ChevronDown, Plus, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AuthPromptModal } from '@/components/ui/auth-prompt-modal'

interface Collection {
  id:    string
  title: string
}

interface Props {
  recommendationId: string
  isLoggedIn:       boolean
}

export function AddToCollectionButton({ recommendationId, isLoggedIn }: Props) {
  const [open,             setOpen]             = useState(false)
  const [collections,      setCollections]      = useState<Collection[]>([])
  const [added,            setAdded]            = useState<Set<string>>(new Set())
  const [loading,          setLoading]          = useState(false)
  const [adding,           setAdding]           = useState<string | null>(null)
  const [showAuthPrompt,   setShowAuthPrompt]   = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click — same pattern as ReadingProgressButton
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Fetch collections when dropdown opens
  useEffect(() => {
    if (!isLoggedIn) return
    const fetchCollections = async () => {
      setLoading(true)
      try {
        const [colRes, itemRes] = await Promise.all([
          fetch('/api/collections'),
          fetch(`/api/collections?contains=${recommendationId}`),
        ])
        const colData  = await colRes.json()
        const itemData = await itemRes.json()
        setCollections(colData.collections ?? [])
        // Pre-mark collections that already contain this comic
        const alreadyIn: string[] = (itemData.collections ?? []).map((c: { id: string }) => c.id)
        if (alreadyIn.length > 0) setAdded(new Set(alreadyIn))
      } catch {
        toast.error('Failed to load collections')
      } finally {
        setLoading(false)
      }
    }
    fetchCollections()
  }, [isLoggedIn, recommendationId]) // runs on mount, not just on open

  const handleAdd = async (collectionId: string) => {
    if (added.has(collectionId)) return
    setAdding(collectionId)
    try {
      const res  = await fetch(`/api/collections/${collectionId}/items`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recommendation_id: recommendationId }),
      })
      const data = await res.json()
      if (res.status === 409) {
        toast.info('Already in this collection')
        setAdded(prev => new Set([...prev, collectionId]))
        return
      }
      if (!res.ok) throw new Error(data.error)
      setAdded(prev => new Set([...prev, collectionId]))
      toast.success('Added to collection!')
    } catch {
      toast.error('Failed to add')
    } finally {
      setAdding(null)
    }
  }

  // Not logged in — auth prompt, same pattern as ReadingProgressButton
  if (!isLoggedIn) {
    return (
      <>
        <AuthPromptModal
          open={showAuthPrompt}
          onClose={() => setShowAuthPrompt(false)}
          config={{
            action: 'add comics to your collections',
            icon: <Layers size={24} className="text-primary" />,
          }}
        />
        <button
          onClick={() => setShowAuthPrompt(true)}
          className="flex items-center justify-between w-full h-10 px-4 rounded-xl border border-border bg-card text-sm font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
        >
          <span className="flex items-center gap-2 flex-1 justify-center">
            <Layers size={14} className="shrink-0" />
            Add to Collection
          </span>
          <ChevronDown size={14} className="shrink-0 ml-2" />
        </button>
      </>
    )
  }

  const addedCount = added.size

  return (
    <div ref={dropdownRef} className="relative w-full">

      {/* ── Trigger — exact same sizing as ReadingProgressButton ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center justify-between w-full h-10 px-4 rounded-xl border text-sm font-semibold transition-all',
          addedCount > 0
            ? 'border-primary/40 bg-primary/8 text-primary'
            : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary'
        )}
      >
        <span className="flex items-center gap-2 flex-1 justify-center min-w-0">
          <Layers size={14} className="shrink-0" />
          <span className="truncate">
            {addedCount > 0 ? `Added to ${addedCount} collection${addedCount !== 1 ? 's' : ''}` : 'Add to Collection'}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={cn('shrink-0 transition-transform ml-2', open && 'rotate-180')}
        />
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 overflow-hidden">

          {loading ? (
            <div className="flex items-center justify-center py-5">
              <Loader2 size={16} className="animate-spin text-muted-foreground" />
            </div>
          ) : collections.length === 0 ? (
            <div className="p-4 text-center space-y-2">
              <p className="text-xs text-muted-foreground">No collections yet</p>
              <a
                href="/collections"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                <Plus size={10} />
                Create a collection
              </a>
            </div>
          ) : (
            <div className="max-h-52 overflow-y-auto p-2 space-y-0.5">
              {collections.map((col) => (
                <button
                  key={col.id}
                  onClick={() => handleAdd(col.id)}
                  disabled={adding === col.id}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all text-left',
                    added.has(col.id)
                      ? 'bg-primary/8 text-primary border border-primary/20'
                      : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Layers size={12} className="shrink-0 opacity-60" />
                  <span className="truncate flex-1">{col.title}</span>
                  {adding === col.id
                    ? <Loader2 size={12} className="animate-spin text-muted-foreground shrink-0" />
                    : added.has(col.id)
                    ? <Check size={12} className="text-primary shrink-0" />
                    : <Plus size={12} className="text-muted-foreground shrink-0" />
                  }
                </button>
              ))}
            </div>
          )}

          {/* Footer link */}
          <div className="border-t border-border">
            <a
              href="/collections"
              className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
            >
              <Plus size={11} />
              Create new collection
            </a>
          </div>
        </div>
      )}
    </div>
  )
}