'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookMarked, Plus, Check, Loader2, ChevronRight, Crown, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { isProUser, hasUnlimitedPerks } from '@/lib/access'
import { FREE_LIMITS } from '@/lib/utils/constants'
import { useRouter } from 'next/navigation'

interface Props {
  recommendationId: string
  userId: string
  /** Open the list in the page flow instead of floating under the button
   *  (use inside a scrolling sheet so it is never cut off). */
  inline?: boolean
}

interface ReadingList {
  id: string
  name: string
  created_at: string
  isLocked: boolean
}

const STATUSES = [
  { value: 'reading',      label: 'Reading',      emoji: '📖' },
  { value: 'plan_to_read', label: 'Plan to Read', emoji: '📌' },
  { value: 'marinating',   label: 'Marinating',   emoji: '🫙' },
  { value: 'completed',    label: 'Completed',    emoji: '✅' },
  { value: 'on_hold',      label: 'On Hold',      emoji: '⏸️' },
  { value: 'dropped',      label: 'Dropped',      emoji: '🗑️' },
]

export function AddToListButton({ recommendationId, userId, inline = false }: Props) {
  const router = useRouter()
  const [open, setOpen]                       = useState(false)
  const [lists, setLists]                     = useState<ReadingList[]>([])
  const [loading, setLoading]                 = useState(false)
  const [addingTo, setAddingTo]               = useState<string | null>(null)
  const [addedTo, setAddedTo]                 = useState<Set<string>>(new Set())
  const [pickingStatusFor, setPickingStatusFor] = useState<string | null>(null)
  const [listsHref, setListsHref]             = useState('/reader/dashboard/lists')
  const dropdownRef                           = useRef<HTMLDivElement>(null)
  const supabase                              = createClient()

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

    const fetchLists = async () => {
      try {
        // Confirm live session first — mirrors ReadingProgressButton's working pattern.
        // A bare fetch() to /api/lists doesn't reliably carry the session cookie,
        // which is why lists were coming back empty even when they existed.
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLists([])
          setLoading(false)
          return
        }

        // Fetch lists directly via the Supabase client (authenticated session,
        // same as ReadingProgressButton) + pro/type status in parallel.
        const [listsRes, profileRes] = await Promise.all([
          supabase
            .from('reading_lists')
            .select('id, name, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true }),
          (supabase as any)
            .from('profiles')
            .select('is_pro, pro_expires_at, is_patron, patron_expires_at, role, user_type')
            .eq('id', user.id)
            .single(),
        ])

        const rawLists = (listsRes.data ?? []) as { id: string; name: string; created_at: string }[]
        const profile = profileRes.data

        const isPro = profile ? isProUser(profile) : false
        const unlimited = profile ? hasUnlimitedPerks(profile) : false

        const isCreator = profile?.user_type === 'creator'
        const base = isCreator
          ? (isPro ? '/pro/creator/dashboard/lists' : '/creator/dashboard/lists')
          : (isPro ? '/pro/reader/dashboard/lists' : '/reader/dashboard/lists')
        setListsHref(base)

        setLists(
          rawLists.map((l, index) => ({
            id:         l.id,
            name:       l.name,
            created_at: l.created_at,
            isLocked:   !unlimited && index >= FREE_LIMITS.lists,
          }))
        )
      } catch {
        toast.error('Failed to load lists')
      } finally {
        setLoading(false)
      }
    }

    fetchLists()
  }, [open, userId, supabase])

  const handleListClick = (list: ReadingList) => {
    if (addedTo.has(list.id)) return

    if (list.isLocked) {
      toast.error(
        <div className="flex flex-col gap-1.5">
          <p className="font-black text-sm">List is locked</p>
          <p className="text-xs text-muted-foreground">
            This list is locked on the free plan. Upgrade to Pro to use all your lists.
          </p>
          <Link
            href="/pricing"
            className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1 mt-0.5"
          >
            <Crown size={11} />
            Upgrade to Pro
          </Link>
        </div>,
        { duration: 6000 }
      )
      return
    }

    setPickingStatusFor(list.id)
  }

  const handleAdd = async (listId: string, status: string) => {
    setAddingTo(listId)
    setPickingStatusFor(null)
    try {
      const res = await fetch(`/api/lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendation_id: recommendationId, status }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Locked — show upgrade prompt
        if (res.status === 403 && data.error === 'locked') {
          toast.error(
            <div className="flex flex-col gap-1.5">
              <p className="font-black text-sm">List is locked</p>
              <p className="text-xs text-muted-foreground">{data.message}</p>
              <Link href="/pricing" className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1 mt-0.5">
                <Crown size={11} />Upgrade to Pro
              </Link>
            </div>,
            { duration: 6000 }
          )
          return
        }
        throw new Error()
      }

      setAddedTo(prev => new Set([...prev, listId]))
      const statusLabel = STATUSES.find(s => s.value === status)
      toast.success(`Added as ${statusLabel?.emoji} ${statusLabel?.label}!`)
      router.refresh()
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
        <div className={`${inline ? 'relative' : 'absolute top-full left-0 right-0'} z-20 mt-1 rounded-xl border border-border bg-card shadow-xl overflow-hidden`}>
          {loading ? (
            <div className="flex justify-center p-4">
              <Loader2 size={16} className="animate-spin text-muted-foreground" />
            </div>
          ) : lists.length === 0 ? (
            <div className="p-4 text-center space-y-2">
              <p className="text-xs text-muted-foreground">No lists yet</p>
              <Link href={listsHref} className="text-xs text-primary block hover:underline">
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
              {STATUSES.map(s => (
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
              {lists.map(list => (
                <button
                  key={list.id}
                  onClick={() => handleListClick(list)}
                  disabled={addingTo === list.id}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors',
                    addedTo.has(list.id)
                      ? 'text-primary'
                      : list.isLocked
                      ? 'text-muted-foreground/50 cursor-pointer hover:bg-amber-500/5'
                      : 'cursor-pointer hover:bg-accent'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {list.isLocked && (
                      <Lock size={10} className="text-amber-500/60 shrink-0" />
                    )}
                    <span className="truncate text-left">{list.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {list.isLocked && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[9px] font-black border border-amber-500/20">
                        <Crown size={8} className="fill-amber-500" />
                        Pro
                      </span>
                    )}
                    {addingTo === list.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : addedTo.has(list.id) ? (
                      <Check size={13} className="text-primary" />
                    ) : list.isLocked ? (
                      <Lock size={11} className="text-amber-500/50" />
                    ) : (
                      <ChevronRight size={13} className="text-muted-foreground" />
                    )}
                  </div>
                </button>
              ))}

              <div className="border-t border-border">
                <Link
                  href={listsHref}
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