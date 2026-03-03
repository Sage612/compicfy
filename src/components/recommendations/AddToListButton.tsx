'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link' // Added this
import { Button } from '@/components/ui/button'
import { BookMarked, Plus, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  recommendationId: string
  userId: string
}

interface ReadingList {
  id: string
  name: string
}

export function AddToListButton({ recommendationId, userId }: Props) {
  const [open, setOpen] = useState(false)
  const [lists, setLists] = useState<ReadingList[]>([])
  const [loading, setLoading] = useState(false)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set())
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/lists')
      .then((r) => r.json())
      .then((d) => setLists(d.lists ?? []))
      .catch(() => toast.error('Failed to load lists'))
      .finally(() => setLoading(false))
  }, [open])

  const handleAdd = async (listId: string) => {
    if (addedTo.has(listId)) return
    setAddingTo(listId)
    try {
      const res = await fetch(`/api/lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendation_id: recommendationId }),
      })
      if (!res.ok) throw new Error()
      setAddedTo((prev) => new Set([...prev, listId]))
      toast.success('Added to list!')
    } catch {
      toast.error('Failed to add to list')
    } finally {
      setAddingTo(null)
    }
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="gap-2 w-full"
      >
        <BookMarked size={14} />
        Add to List
      </Button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center p-4">
              <Loader2 size={16} className="animate-spin text-muted-foreground" />
            </div>
          ) : lists.length === 0 ? (
            <div className="p-4 text-center space-y-2">
              <p className="text-xs text-muted-foreground">No lists yet</p>
              <Link href="/dashboard/lists" className="text-xs text-primary block hover:underline">
                Create your first list &rarr;
              </Link>
            </div>
          ) : (
            <div className="py-1">
              {lists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => handleAdd(list.id)}
                  disabled={addingTo === list.id}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-accent transition-colors',
                    addedTo.has(list.id) && 'text-primary'
                  )}
                >
                  <span className="truncate text-left">{list.name}</span>
                  {addingTo === list.id ? (
                    <Loader2 size={13} className="animate-spin shrink-0" />
                  ) : addedTo.has(list.id) ? (
                    <Check size={13} className="text-primary shrink-0" />
                  ) : (
                    <Plus size={13} className="text-muted-foreground shrink-0" />
                  )}
                </button>
              ))}
              <div className="border-t border-border">
                <Link 
                   href="/dashboard/lists"
                   className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus size={12} />
                  Manage Lists
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}