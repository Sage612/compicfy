'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookMarked, Plus, Check, Loader2, ChevronRight } from 'lucide-react'
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

const STATUSES = [
  { value: 'reading',      label: 'Reading',        emoji: '📖' },
  { value: 'plan_to_read', label: 'Plan to Read',   emoji: '📌' },
  { value: 'marinating',   label: 'Marinating',     emoji: '🫙' },
  { value: 'completed',    label: 'Completed',      emoji: '✅' },
  { value: 'on_hold',      label: 'On Hold',        emoji: '⏸️' },
  { value: 'dropped',      label: 'Dropped',        emoji: '🗑️' },
]

export function AddToListButton({ recommendationId, userId }: Props) {
  const [open, setOpen] = useState(false)
  const [lists, setLists] = useState<ReadingList[]>([])
  const [loading, setLoading] = useState(false)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set())
  // Track which list is in "pick status" mode
  const [pickingStatusFor, setPickingStatusFor] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setPickingStatusFor(null)
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

  const handleAdd = async (listId: string, status: string) => {
    setAddingTo(listId)
    setPickingStatusFor(null)
    try {
      const res = await fetch(`/api/lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendation_id: recommendationId, status }),
      })
      if (!res.ok) throw new Error()
      setAddedTo((prev) => new Set([...prev, listId]))
      const statusLabel = STATUSES.find(s => s.value === status)
      toast.success(`Added to list as ${statusLabel?.emoji} ${statusLabel?.label}!`)
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
        onClick={() => { setOpen(!open); setPickingStatusFor(null) }}
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
                Create your first list →
              </Link>
            </div>
          ) : pickingStatusFor ? (
            // Status picker view
            <div>
              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Set Reading Status
                </span>
                <button
                  onClick={() => setPickingStatusFor(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ← Back
                </button>
              </div>
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => handleAdd(pickingStatusFor, s.value)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left',
                    s.value === 'marinating' && 'hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400'
                  )}
                >
                  <span className="text-base leading-none">{s.emoji}</span>
                  <span>{s.label}</span>
                  {s.value === 'marinating' && (
                    <span className="ml-auto text-[10px] text-amber-500 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                      new
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            // List picker view
            <div className="py-1">
              {lists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => addedTo.has(list.id) ? null : setPickingStatusFor(list.id)}
                  disabled={addingTo === list.id}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-accent transition-colors',
                    addedTo.has(list.id) && 'text-primary',
                    !addedTo.has(list.id) && 'cursor-pointer'
                  )}
                >
                  <span className="truncate text-left">{list.name}</span>
                  {addingTo === list.id ? (
                    <Loader2 size={13} className="animate-spin shrink-0" />
                  ) : addedTo.has(list.id) ? (
                    <Check size={13} className="text-primary shrink-0" />
                  ) : (
                    <ChevronRight size={13} className="text-muted-foreground shrink-0" />
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