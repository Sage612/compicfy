'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { AuthPromptModal } from '@/components/ui/auth-prompt-modal'
import { ListsSkeleton } from '@/components/lists/ListsSkeleton'
import { PageShell, PageHeader } from '@/components/dashboard/PageHeader'
import { CardFooter } from '@/components/community/CardFooter'
import { FREE_LIMITS } from '@/lib/utils/constants'

interface PublicList {
  id:          string
  user_id:     string
  name:        string
  description: string | null
  is_public:   boolean
  star_count:  number
  created_at:  string
  profiles: {
    username:     string
    display_name: string | null
    avatar_url:   string | null
  } | null
  reading_list_items: {
    count?:           number
    recommendations?: { cover_url: string | null } | null
  }[]
}

function getCoverPreviews(list: PublicList): string[] {
  if (Array.isArray((list as any)._cover_urls)) return (list as any)._cover_urls.slice(0, 4)
  return (list.reading_list_items ?? [])
    .map(item => item.recommendations?.cover_url ?? null)
    .filter(Boolean)
    .slice(0, 4) as string[]
}

function itemCount(list: PublicList): number {
  if (typeof (list as any)._item_count === 'number') return (list as any)._item_count
  if (!list.reading_list_items?.length) return 0
  const first = list.reading_list_items[0]
  if (typeof first?.count === 'number') return first.count
  return list.reading_list_items.length
}

function proxy(url: string) {
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

/** Neutral cover strip: up to four covers side by side on a muted ground. */
function CoverStrip({ covers }: { covers: string[] }) {
  return (
    <div className="aspect-[5/2] bg-muted flex gap-px overflow-hidden">
      {covers.map((url, i) => (
        <div key={i} className="flex-1 min-w-0 overflow-hidden">
          <img src={proxy(url)} alt="" aria-hidden className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  )
}

interface Props {
  userId:          string | null
  starredListIds?: string[]
  myListsHref?:    string
  isProUser?:      boolean
  userListCount?:  number
}

export function ListsClient({
  userId,
  starredListIds  = [],
  myListsHref     = '/reader/dashboard/lists',
  isProUser       = false,
  userListCount   = 0,
}: Props) {
  const [lists,      setLists]      = useState<PublicList[]>([])
  const [loading,    setLoading]    = useState(true)
  const [starringId, setStarringId] = useState<string | null>(null)
  const [starredSet, setStarredSet] = useState<Set<string>>(() => new Set(starredListIds))
  const [authPrompt, setAuthPrompt] = useState(false)

  // Create form state
  const searchParams = useSearchParams()
  const [showCreate, setShowCreate] = useState(false)
  const [newName,    setNewName]    = useState('')
  const [newDesc,    setNewDesc]    = useState('')
  const [creating,   setCreating]   = useState(false)

  // atLimit: free users can only have FREE_LIMITS.lists lists total
  const atLimit = !isProUser && userListCount >= FREE_LIMITS.lists

  // Auto-open create form when navigated here from SpeedDialFAB (?create=1)
  useEffect(() => {
    if (searchParams.get('create') === '1' && userId && !atLimit) {
      setShowCreate(true)
    }
  }, [searchParams, userId])

  useEffect(() => { fetchLists() }, [])

  const fetchLists = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/lists/public?limit=24')
      const data = await res.json()
      setLists(data.lists ?? [])
    } catch {
      toast.error('Failed to load lists')
    } finally {
      setLoading(false)
    }
  }

  const handleNewListClick = () => {
    if (!userId) { setAuthPrompt(true); return }
    if (atLimit) {
      toast.error(`Free users can create up to ${FREE_LIMITS.lists} lists upgrade to Pro for unlimited`)
      return
    }
    setShowCreate(true)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res  = await fetch('/api/lists', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: newName, description: newDesc, is_public: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 403) { toast.error('List limit reached — upgrade to Pro'); return }
        throw new Error(data.error)
      }
      // New list is public so it may appear in this feed — reload to show it
      setNewName(''); setNewDesc(''); setShowCreate(false)
      toast.success('List created! Reloading...')
      await fetchLists()
    } catch { toast.error('Failed to create list') }
    finally  { setCreating(false) }
  }

  const handleStar = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!userId) { setAuthPrompt(true); return }
    const isStarred = starredSet.has(id)
    setStarringId(id)
    try {
      const res  = await fetch(`/api/lists/${id}/star`, { method: isStarred ? 'DELETE' : 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error('Failed to update'); return }
      setStarredSet(prev => { const n = new Set(prev); isStarred ? n.delete(id) : n.add(id); return n })
      setLists(prev => prev.map(l =>
        l.id === id ? { ...l, star_count: data.star_count ?? l.star_count } : l
      ))
      toast.success(isStarred ? 'Removed star' : 'List starred!')
    } catch { toast.error('Failed to update') }
    finally { setStarringId(null) }
  }

  const handleShare = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/lists/${id}`)
      toast.success('Link copied!')
    } catch { toast.error('Failed to copy link') }
  }

  const labelClass = 'text-[11px] uppercase tracking-widest text-muted-foreground/70'

  return (
    <PageShell>
      <PageHeader
        eyebrow="Community"
        title="Reading lists"
        subtitle="Reading journeys from the community"
        actions={
          userId && !showCreate ? (
            <Button
              size="sm"
              variant={atLimit ? 'outline' : 'default'}
              onClick={handleNewListClick}
              className="hidden sm:inline-flex"
            >
              {atLimit ? 'Upgrade for more' : 'New list'}
            </Button>
          ) : undefined
        }
      />

      {/* Inline create form */}
      {showCreate && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <p className="font-dashboard-serif text-lg text-foreground">New reading list</p>
          <div className="space-y-1.5">
            <label className={labelClass}>Name</label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder='"Best Romance Manhwa", "My Completed Series"'
              autoFocus
              className="h-9 text-sm"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Description</label>
            <Input
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="What's this list about?"
              className="h-9 text-sm"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            This list is created as public so the community can discover it.
          </p>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || creating} className="gap-2">
              {creating && <Loader2 size={13} className="animate-spin" />}
              Create list
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); setNewName(''); setNewDesc('') }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {loading && <ListsSkeleton />}

      {!loading && lists.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <h3 className="font-dashboard-serif text-xl text-foreground">No public lists yet</h3>
          <p className="text-sm text-muted-foreground mt-2 mb-5">
            Be the first to share a reading list with the community.
          </p>
          {userId && (
            <Button size="sm" onClick={handleNewListClick}>Create the first list</Button>
          )}
        </div>
      )}

      {!loading && lists.length > 0 && (
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map(list => {
            const covers    = getCoverPreviews(list)
            const count     = itemCount(list)
            const isStarred = starredSet.has(list.id)
            const isOwner   = list.user_id === userId
            const starring  = starringId === list.id

            return (
              <div
                key={list.id}
                className="group relative rounded-xl border border-border bg-card overflow-hidden flex flex-col transition-colors hover:border-foreground/30"
              >
                <Link href={`/lists/${list.id}`} className="block flex-1">
                  {covers.length > 0 ? <CoverStrip covers={covers} /> : <div className="aspect-[5/2] bg-muted" />}
                  <div className="p-4 space-y-1">
                    <p className="font-dashboard-serif text-lg leading-snug text-foreground line-clamp-1">{list.name}</p>
                    {list.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{list.description}</p>
                    )}
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 pt-2">
                      {count} comic{count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </Link>

                <CardFooter
                  username={list.profiles?.username}
                  avatarUrl={list.profiles?.avatar_url}
                  isOwner={isOwner}
                  action={{
                    kind: 'star',
                    active: isStarred,
                    count: list.star_count ?? 0,
                    loading: starring,
                    onClick: e => handleStar(list.id, e),
                  }}
                  onShare={e => handleShare(list.id, e)}
                />
              </div>
            )
          })}
        </div>
      )}

      {userId && (
        <div className="text-center">
          <Link
            href={myListsHref}
            className="text-xs text-muted-foreground underline underline-offset-4 decoration-border hover:text-foreground hover:decoration-foreground transition-colors"
          >
            Manage my reading lists
          </Link>
        </div>
      )}

      <AuthPromptModal
        open={authPrompt}
        onClose={() => setAuthPrompt(false)}
        config={{
          action: 'star and save lists',
          icon:   <span className="text-lg">★</span>,
        }}
      />
    </PageShell>
  )
}