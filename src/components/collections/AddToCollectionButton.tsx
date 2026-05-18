'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { BookMarked, ChevronDown, Plus, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Collection {
  id:    string
  title: string
}

interface Props {
  recommendationId: string
  isLoggedIn:       boolean
}

export function AddToCollectionButton({ recommendationId, isLoggedIn }: Props) {
  const [open,        setOpen]        = useState(false)
  const [collections, setCollections] = useState<Collection[]>([])
  const [added,       setAdded]       = useState<Set<string>>(new Set())
  const [loading,     setLoading]     = useState(false)
  const [adding,      setAdding]      = useState<string | null>(null)

  useEffect(() => {
    if (!open || !isLoggedIn) return
    const fetchCollections = async () => {
      setLoading(true)
      try {
        const res  = await fetch('/api/collections')
        const data = await res.json()
        // Only own collections
        setCollections(data.collections ?? [])
      } catch {
        toast.error('Failed to load collections')
      } finally {
        setLoading(false)
      }
    }
    fetchCollections()
  }, [open, isLoggedIn])

  const handleAdd = async (collectionId: string) => {
    if (added.has(collectionId)) return
    setAdding(collectionId)
    try {
      const res = await fetch(`/api/collections/${collectionId}/items`, {
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

  if (!isLoggedIn) return null

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(o => !o)}
        className="w-full gap-1.5 justify-between"
      >
        <span className="flex items-center gap-1.5">
          <BookMarked size={13} />
          Add to Collection
        </span>
        <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute left-0 right-0 mt-1 z-20 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            ) : collections.length === 0 ? (
              <div className="p-3 text-center space-y-2">
                <p className="text-xs text-muted-foreground">No collections yet</p>
                <a href="/collections" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                  <Plus size={10} />
                  Create a collection
                </a>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                {collections.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => handleAdd(col.id)}
                    disabled={adding === col.id}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left transition-colors',
                      added.has(col.id)
                        ? 'text-primary bg-primary/5'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <span className="truncate flex-1 font-medium">{col.title}</span>
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
            <div className="border-t border-border">
              <a href="/collections" className="flex items-center gap-2 px-3 py-2 text-xs text-primary hover:bg-primary/5 transition-colors">
                <Plus size={11} />
                Create new collection
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}