'use client'

import { useState, useEffect, useRef } from 'react'
import { BookOpen, ChevronDown, Check, Loader2, Plus, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils/format'
import { AuthPromptModal } from '@/components/ui/auth-prompt-modal'

interface ReadingList {
  id:   string
  name: string
}

interface Progress {
  id:               string
  list_id:          string
  status:           string
  progress_chapter: number | null
  last_read_at:     string | null
  updated_at:       string
}

interface Props {
  comicId:      string
  chapterCount: number | null
  isLoggedIn:   boolean
}

const STATUS_META: Record<string, { label: string; emoji: string; color: string }> = {
  reading:      { label: 'Reading',      emoji: '📖', color: 'text-blue-600    bg-blue-500/10    border-blue-500/20'    },
  plan_to_read: { label: 'Plan to Read', emoji: '📌', color: 'text-violet-600  bg-violet-500/10  border-violet-500/20'  },
  completed:    { label: 'Completed',    emoji: '✅', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
  on_hold:      { label: 'On Hold',      emoji: '⏸️', color: 'text-yellow-600  bg-yellow-500/10  border-yellow-500/20'  },
  dropped:      { label: 'Dropped',      emoji: '🗑️', color: 'text-red-600     bg-red-500/10     border-red-500/20'     },
  marinating:   { label: 'Marinating',   emoji: '🫙', color: 'text-amber-600   bg-amber-500/10   border-amber-500/20'   },
}

const STATUSES = Object.entries(STATUS_META).map(([value, meta]) => ({ value, ...meta }))

export function ReadingProgressButton({ comicId, chapterCount, isLoggedIn }: Props) {
  const [lists,       setLists]      = useState<ReadingList[]>([])
  const [progress,    setProgress]   = useState<Progress | null>(null)
  const [loading,     setLoading]    = useState(true)
  const [saving,      setSaving]     = useState(false)
  const [open,        setOpen]       = useState(false)
  const [chapter,     setChapter]    = useState<string>('')
  const [activeList,  setActiveList] = useState<string>('')
  const [dirty, setDirty] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase    = createClient()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return }

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [listsRes, progressRes] = await Promise.all([
        supabase
          .from('reading_lists')
          .select('id, name')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        fetch(`/api/reading-progress/${comicId}`),
      ])

      const fetchedLists = (listsRes.data ?? []) as ReadingList[]
      setLists(fetchedLists)

      const progressData = await progressRes.json()
      if (progressData.progress) {
        setProgress(progressData.progress)
        setActiveList(progressData.progress.list_id)
        setChapter(progressData.progress.progress_chapter?.toString() ?? '')
      } else if (fetchedLists.length > 0) {
        setActiveList(fetchedLists[0].id)
      }

      setLoading(false)
    }

    load()
  }, [comicId, isLoggedIn])

  const handleStatusSelect = async (status: string) => {
    if (!isLoggedIn) { toast.error('Sign in to track reading'); return }
    if (!activeList)  { toast.error('Create a reading list first'); return }

    setSaving(true)
    try {
      const res = await fetch(`/api/reading-progress/${comicId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          list_id:          activeList,
          status,
          progress_chapter: chapter ? parseInt(chapter) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProgress(data.progress)
      const meta = STATUS_META[status]
      toast.success(`${meta.emoji} Marked as ${meta.label}`)
      setOpen(false)
      setDirty(false)
    } catch {
      toast.error('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleChapterSave = async () => {
    if (!activeList) return
    setSaving(true)
    try {
      const res = await fetch(`/api/reading-progress/${comicId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          list_id:          activeList,
          progress_chapter: chapter ? parseInt(chapter) : null,
          ...(progress?.status ? { status: progress.status } : { status: 'reading' }),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProgress(data.progress)
      toast.success('Progress saved!')
      setOpen(false)
      setDirty(false)
    } catch {
      toast.error('Failed to save progress')
    } finally {
      setSaving(false)
    }
  }

  // Not logged in — show auth modal instead of hard redirect
  if (!isLoggedIn) {
    return (
      <>
        <AuthPromptModal
          open={showAuthPrompt}
          onClose={() => setShowAuthPrompt(false)}
          config={{
            action: 'track your reading progress',
            icon: <BookOpen size={24} className="text-primary" />,
          }}
        />
        <button
          onClick={() => setShowAuthPrompt(true)}
          className="flex items-center justify-center gap-2 w-full h-10 px-4 rounded-xl border border-border bg-card text-sm font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
        >
          <BookOpen size={14} />
          Track Progress
        </button>
      </>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 w-full h-10 px-4 rounded-xl border border-border bg-card text-sm text-muted-foreground">
        <Loader2 size={14} className="animate-spin" />
        <span>Loading…</span>
      </div>
    )
  }

  const currentStatus = progress ? STATUS_META[progress.status] : null

  return (
    <div ref={dropdownRef} className="relative w-full">

      {/* ── Trigger — matches exact height/padding of SaveButton ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          // Same sizing as the other action buttons in the left column
         'flex items-center justify-between w-full h-10 px-4 rounded-xl border text-sm font-semibold transition-all text-center',
          currentStatus
            ? cn('border', currentStatus.color)
            : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary'
        )}
      >
        {/* Left side — icon + label, same pattern as Save/Share buttons */}
        <span className="flex items-center gap-2 min-w-0 flex-1 justify-center">
          {saving
            ? <Loader2 size={14} className="animate-spin shrink-0" />
            : currentStatus
            ? <span className="text-sm leading-none shrink-0">{currentStatus.emoji}</span>
            : <BookOpen size={14} className="shrink-0" />
          }
          <span className="truncate">
            {currentStatus ? currentStatus.label : 'Track Progress'}
          </span>
          {progress?.progress_chapter != null && (
            <span className="text-xs opacity-60 shrink-0">
              · Ch.{progress.progress_chapter}
            </span>
          )}
        </span>

        {/* Right side — chevron only */}
        <ChevronDown
          size={14}
          className={cn('shrink-0 transition-transform ml-2', open && 'rotate-180')}
        />
      </button>

      {/* Last updated hint */}
      {progress?.last_read_at && (
        <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mt-1">
          <Clock size={9} />
          Updated {timeAgo(progress.last_read_at)}
        </p>
      )}

      {/* ── Dropdown ── */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 overflow-hidden">

          {/* List selector */}
          {lists.length > 1 && (
            <div className="px-3 pt-3 pb-2 border-b border-border/50">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">List</p>
              <select
                value={activeList}
                onChange={e => setActiveList(e.target.value)}
                className="w-full text-xs bg-muted border border-border rounded-lg px-2 py-1.5 outline-none text-foreground"
              >
                {lists.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* No lists */}
          {lists.length === 0 && (
            <div className="px-4 py-4 text-center space-y-2 border-b border-border/50">
              <p className="text-xs text-muted-foreground">You need a reading list first</p>
              <a
                href="/dashboard/lists"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                <Plus size={11} />
                Create a list
              </a>
            </div>
          )}

          {/* Chapter input */}
          {lists.length > 0 && (
            <div className="px-3 pt-3 pb-2 border-b border-border/50">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">
                Chapter
                {chapterCount && (
                  <span className="font-normal ml-1 normal-case text-muted-foreground/60">
                    / {chapterCount} total
                  </span>
                )}
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max={chapterCount ?? undefined}
                  value={chapter}
                  onChange={e => { setChapter(e.target.value); setDirty(true) }}
                  onKeyDown={e => e.key === 'Enter' && dirty && handleChapterSave()}
                  placeholder="e.g. 47"
                  className="flex-1 h-8 text-xs bg-muted border border-border rounded-lg px-2.5 outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
                />
                {dirty && (
                  <button
                    onClick={handleChapterSave}
                    disabled={saving}
                    className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 shrink-0"
                  >
                    {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                    Save
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Status options */}
          {lists.length > 0 && (
            <div className="p-2 space-y-0.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 py-1">
                Status
              </p>
              {STATUSES.map(({ value, label, emoji, color }) => (
                <button
                  key={value}
                  onClick={() => handleStatusSelect(value)}
                  disabled={saving}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all text-left',
                    progress?.status === value
                      ? cn('border', color)
                      : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span className="text-base leading-none w-5 text-center shrink-0">{emoji}</span>
                  <span className="flex-1">{label}</span>
                  {progress?.status === value && (
                    <Check size={13} className="shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}