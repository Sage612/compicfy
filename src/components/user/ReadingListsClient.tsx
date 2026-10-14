'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { BookMarked, Plus, Trash2, Globe, Lock,
  Loader2, BookOpen, Pencil, ArrowRight, Crown,
  Sparkles, Radar, Share2, Star, Check, X, MoreVertical,
  Folder, FolderPlus, FolderInput, ChevronRight,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { UpgradeBanner } from '@/components/pro/UpgradeBanner'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { createClient } from '@/lib/supabase/client'
import { hasUnlimitedPerks } from '@/lib/access'
import { FREE_LIMITS } from '@/lib/utils/constants'
import { ActionSheet, type ActionSheetAction } from '@/components/ui/ActionSheet'
import { FolderNameModal } from '@/components/lists/FolderNameModal'
import { FolderPickerModal } from '@/components/lists/FolderPickerModal'
import { folderPath, isDescendantOf, canCreateFolderUnder, canMoveFolder } from '@/lib/utils/folders'
import type { ListFolder } from '@/lib/utils/folders'

interface ReadingList {
  id:          string
  user_id:     string
  name:        string
  description: string | null
  is_public:   boolean
  created_at:  string
  star_count:  number
  folder_id?:  string | null
  _item_count?: number
  _cover_urls?: string[]
}

const THEME_GRAD: Record<number, string> = {
  0: 'from-primary/60 via-primary/20 to-primary/5',
  1: 'from-violet-500/60 via-violet-500/20 to-violet-500/5',
  2: 'from-rose-500/60 via-rose-500/20 to-rose-500/5',
  3: 'from-amber-500/60 via-amber-500/20 to-amber-500/5',
  4: 'from-emerald-500/60 via-emerald-500/20 to-emerald-500/5',
  5: 'from-indigo-500/60 via-indigo-500/20 to-indigo-500/5',
}
const THEME_BORDER: Record<number, string> = {
  0: 'border-primary/30',     1: 'border-violet-500/30',
  2: 'border-rose-500/30',    3: 'border-amber-500/30',
  4: 'border-emerald-500/30', 5: 'border-indigo-500/30',
}
const THEME_ACCENT: Record<number, string> = {
  0: 'text-primary',      1: 'text-violet-400',
  2: 'text-rose-400',     3: 'text-amber-400',
  4: 'text-emerald-400',  5: 'text-indigo-400',
}

function themeIndex(id: string): number {
  return id.slice(-6).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 6
}

function getCoverPreviews(list: ReadingList): string[] {
  if (Array.isArray(list._cover_urls)) return list._cover_urls.slice(0, 4)
  return []
}

function itemCount(list: ReadingList): number {
  if (typeof list._item_count === 'number') return list._item_count
  return 0
}

function StackedCover({ covers, themeGrad }: { covers: string[]; themeGrad: string }) {
  if (covers.length === 0) {
    return <div className={cn('absolute inset-0 bg-gradient-to-br', themeGrad)} />
  }
  const dominant = covers[0]
  const stack    = covers.slice(1, 4)
  return (
    <div className="absolute inset-0">
      <img src={`/api/image-proxy?url=${encodeURIComponent(dominant)}`} alt="" className="absolute inset-0 w-full h-full object-cover" aria-hidden />
      {stack.length > 0 && (
        <div className="absolute bottom-14 right-2 flex items-end">
          {stack.map((url, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden border-2 border-black/40 shadow-xl"
              style={{
                width: 32 - i * 4, height: 44 - i * 5,
                marginLeft: i === 0 ? 0 : -10,
                zIndex: stack.length - i,
                opacity: 1 - i * 0.12,
                transform: `rotate(${i % 2 === 0 ? 5 : -4}deg) translateY(${i * 2}px)`,
              }}>
              <img src={`/api/image-proxy?url=${encodeURIComponent(url)}`} alt="" className="w-full h-full object-cover" aria-hidden />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ReadingListsClient({
  initialLists,
  initialFolders   = [],
  folderDepthLimit = 0,
  basePath         = '/dashboard/lists',
  hideHeader       = false,
}: {
  initialLists:       ReadingList[]
  /** Item #4 — the user's folders, fetched by the page. */
  initialFolders?:    ListFolder[]
  /** Item #4 — how many folder levels this user's tier allows (0 = none, 1 = Pro, more = Patron). */
  folderDepthLimit?:  number
  basePath?:          string
  hideHeader?:        boolean
}) {
  const [lists,       setLists]       = useState(initialLists)
  const [showCreate,  setShowCreate]  = useState(false)
  const [newName,     setNewName]     = useState('')
  const [newDesc,     setNewDesc]     = useState('')
  const [isPublic,    setIsPublic]    = useState(false)
  const [creating,    setCreating]    = useState(false)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)
  const [isProUser,   setIsProUser]   = useState<boolean | null>(null)

  // ── Rename modal state — replaces the old inline card-body editing,
  // which sat too close to delete/share/toggle-public buttons on the same
  // card and risked mis-clicks. Centered modal instead, matching the
  // pattern established for collection editing. ──
  const [renamingList, setRenamingList] = useState<ReadingList | null>(null)
  const [renameValue,  setRenameValue]  = useState('')
  const [renameDesc,   setRenameDesc]   = useState('')
  const [savingRename, setSavingRename] = useState(false)

  // ── Kebab → shared action sheet, replacing the per-card row of
  // Edit/Share/Toggle/Delete icon buttons. ──
  const [actionSheetList, setActionSheetList] = useState<ReadingList | null>(null)

  // ── Folders (item #4) ──
  const [folders,           setFolders]           = useState<ListFolder[]>(initialFolders)
  const [currentFolderId,  setCurrentFolderId]   = useState<string | null>(null)
  const [folderModal,      setFolderModal]       = useState<{ mode: 'create' } | { mode: 'rename'; folder: ListFolder } | null>(null)
  const [savingFolder,     setSavingFolder]      = useState(false)
  const [folderActionSheet, setFolderActionSheet] = useState<ListFolder | null>(null)
  const [movingList,       setMovingList]        = useState<ReadingList | null>(null)
  const [movingFolder,     setMovingFolder]      = useState<ListFolder | null>(null)
  const [savingMove,       setSavingMove]        = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setIsProUser(false); return }
      const { data: p } = await supabase
        .from('profiles').select('is_pro, pro_expires_at, is_patron, patron_expires_at, role').eq('id', user.id).single()
      if (!p) { setIsProUser(false); return }
      const profile = { ...p, role: p.role ?? '' }
      setIsProUser(hasUnlimitedPerks(profile))
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sorted    = [...lists].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const freeIds   = new Set(sorted.slice(0, FREE_LIMITS.lists).map(l => l.id))
  const isLocked  = (id: string) => isProUser === false && !freeIds.has(id)
  const atLimit   = isProUser === false && lists.length >= FREE_LIMITS.lists
  const nearLimit = isProUser === false && lists.length === FREE_LIMITS.lists - 1

  // ── Folder view: only the folders and lists that sit directly inside
  // the folder currently open (null = top level). Limits and locking above
  // still look at ALL lists, not just the visible ones. ──
  const visibleFolders = folders
    .filter(f => f.parent_id === currentFolderId)
    .sort((a, b) => a.name.localeCompare(b.name))
  const visibleLists   = lists.filter(l => (l.folder_id ?? null) === currentFolderId)
  const path           = folderPath(currentFolderId, folders)
  const canCreateHere  = folderDepthLimit >= 1 && canCreateFolderUnder(currentFolderId, folders, folderDepthLimit)
  const showFolderBar  = (canCreateHere && lists.length > 0) || visibleFolders.length > 0 || currentFolderId !== null

  const errorText = (data: { message?: string; error?: string } | null | undefined, fallback: string): string => data?.message ?? data?.error ?? fallback

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res  = await fetch('/api/lists', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDesc, is_public: isPublic }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 403) { toast.error('List limit reached — upgrade to Pro for unlimited lists'); return }
        throw new Error(data.error)
      }

      // Created while a folder is open? File it there instead of leaving it
      // at the top level where the user can't see it from here.
      let folderId: string | null = null
      if (currentFolderId) {
        const moveRes = await fetch(`/api/lists/${data.list.id}/folder`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder_id: currentFolderId }),
        })
        if (moveRes.ok) folderId = currentFolderId
      }

      setLists(prev => [{ ...data.list, _item_count: 0, _cover_urls: [], folder_id: folderId }, ...prev])
      setNewName(''); setNewDesc(''); setIsPublic(false); setShowCreate(false)
      toast.success('List created!')
    } catch { toast.error('Failed to create list') }
    finally  { setCreating(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this list and all its items?')) return
    setDeletingId(id)
    try {
      await fetch(`/api/lists/${id}`, { method: 'DELETE' })
      setLists(prev => prev.filter(l => l.id !== id))
      setActionSheetList(null)
      toast.success('List deleted')
    } catch { toast.error('Failed to delete') }
    finally  { setDeletingId(null) }
  }

  const openRenameModal = (list: ReadingList) => {
    setRenamingList(list)
    setRenameValue(list.name)
    setRenameDesc(list.description ?? '')
    setActionSheetList(null)
  }

  const handleRenameSave = async () => {
    if (!renamingList || !renameValue.trim()) return
    setSavingRename(true)
    try {
      const res  = await fetch(`/api/lists/${renamingList.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameValue.trim(), description: renameDesc.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error()
      setLists(prev => prev.map(l => l.id === renamingList.id
        ? { ...l, name: data.list.name, description: data.list.description }
        : l
      ))
      setRenamingList(null)
      toast.success('List updated')
    } catch { toast.error('Failed to update list') }
    finally  { setSavingRename(false) }
  }

  const handleTogglePublic = async (id: string, current: boolean) => {
    if (isLocked(id)) { toast.error('Upgrade to Pro to edit this list'); return }
    try {
      await fetch(`/api/lists/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: !current }),
      })
      setLists(prev => prev.map(l => l.id === id ? { ...l, is_public: !current } : l))
      setActionSheetList(null)
      toast.success(current ? 'List is now private' : 'List is now public')
    } catch { toast.error('Failed to update') }
  }

  const handleShare = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/lists/${id}`)
      setActionSheetList(null)
      toast.success('Link copied!')
    } catch { toast.error('Failed to copy link') }
  }

  const handleNewListClick = () => {
    if (atLimit) { toast.error('Upgrade to Pro for unlimited reading lists'); return }
    setShowCreate(true)
  }

  // ── Folder actions (item #4) ──
  const handleCreateFolder = async (name: string) => {
    setSavingFolder(true)
    try {
      const res  = await fetch('/api/list-folders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parent_id: currentFolderId }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(errorText(data, 'Failed to create folder')); return }
      setFolders(prev => [...prev, data.folder])
      setFolderModal(null)
      toast.success('Folder created')
    } catch { toast.error('Failed to create folder') }
    finally  { setSavingFolder(false) }
  }

  const handleRenameFolder = async (folder: ListFolder, name: string) => {
    setSavingFolder(true)
    try {
      const res  = await fetch(`/api/list-folders/${folder.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(errorText(data, 'Failed to rename folder')); return }
      setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, name: data.folder.name } : f))
      setFolderModal(null)
      toast.success('Folder renamed')
    } catch { toast.error('Failed to rename folder') }
    finally  { setSavingFolder(false) }
  }

  // Lists and subfolders inside move up one level — nothing inside is deleted.
  const handleDeleteFolder = async (folder: ListFolder) => {
    if (!confirm('Delete this folder? Its lists and subfolders move up one level — nothing inside is deleted.')) return
    try {
      const res = await fetch(`/api/list-folders/${folder.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setLists(prev => prev.map(l => l.folder_id === folder.id ? { ...l, folder_id: folder.parent_id } : l))
      setFolders(prev => prev
        .filter(f => f.id !== folder.id)
        .map(f => f.parent_id === folder.id ? { ...f, parent_id: folder.parent_id } : f))
      if (currentFolderId === folder.id) setCurrentFolderId(folder.parent_id)
      setFolderActionSheet(null)
      toast.success('Folder deleted')
    } catch { toast.error('Failed to delete folder') }
  }

  const handleMoveList = async (list: ReadingList, folderId: string | null) => {
    setSavingMove(true)
    try {
      const res  = await fetch(`/api/lists/${list.id}/folder`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: folderId }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(errorText(data, 'Failed to move list')); return }
      setLists(prev => prev.map(l => l.id === list.id ? { ...l, folder_id: folderId } : l))
      setMovingList(null)
      toast.success(folderId ? 'Moved to folder' : 'Moved to top level')
    } catch { toast.error('Failed to move list') }
    finally  { setSavingMove(false) }
  }

  const handleMoveFolder = async (folder: ListFolder, parentId: string | null) => {
    setSavingMove(true)
    try {
      const res  = await fetch(`/api/list-folders/${folder.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_id: parentId }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(errorText(data, 'Failed to move folder')); return }
      setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, parent_id: data.folder.parent_id } : f))
      setMovingFolder(null)
      toast.success(parentId ? 'Folder moved' : 'Moved to top level')
    } catch { toast.error('Failed to move folder') }
    finally  { setSavingMove(false) }
  }

  // Which destinations the "move folder" picker should grey out. Same rules
  // the server enforces (shared helpers in folders.ts), so the screen never
  // offers a move the server would refuse.
  const disabledMoveTargets = (folder: ListFolder): Set<string> => {
    const disabled = new Set<string>([folder.id])
    for (const f of folders) {
      if (isDescendantOf(f.id, folder.id, folders)) disabled.add(f.id)
      else if (!canMoveFolder(folder.id, f.id, folders, folderDepthLimit)) disabled.add(f.id)
    }
    return disabled
  }

  const buildOwnerActions = (list: ReadingList): ActionSheetAction[] => [
    { label: 'Edit', icon: <Pencil size={15} />, onClick: () => openRenameModal(list) },
    ...(folders.length > 0
      ? [{
          label: 'Move to folder',
          icon: <FolderInput size={15} />,
          onClick: () => { setMovingList(list); setActionSheetList(null) },
        }]
      : []),
    {
      label: list.is_public ? 'Make Private' : 'Make Public',
      icon: list.is_public ? <Lock size={15} /> : <Globe size={15} />,
      onClick: () => handleTogglePublic(list.id, list.is_public),
    },
    { label: 'Share', icon: <Share2 size={15} />, onClick: () => handleShare(list.id) },
    {
      label: 'Delete',
      icon: deletingId === list.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />,
      onClick: () => handleDelete(list.id),
      destructive: true,
    },
  ]

  const buildFolderActions = (folder: ListFolder): ActionSheetAction[] => [
    {
      label: 'Rename',
      icon: <Pencil size={15} />,
      onClick: () => { setFolderModal({ mode: 'rename', folder }); setFolderActionSheet(null) },
    },
    // Moving a folder only makes sense when nesting is possible — or when
    // it's already nested, so it can be flattened back out.
    ...((folderDepthLimit > 1 || folder.parent_id)
      ? [{
          label: 'Move',
          icon: <FolderInput size={15} />,
          onClick: () => { setMovingFolder(folder); setFolderActionSheet(null) },
        }]
      : []),
    {
      label: 'Delete',
      icon: <Trash2 size={15} />,
      onClick: () => handleDeleteFolder(folder),
      destructive: true,
    },
  ]

  return (
    <div className="space-y-6">

      {/* ── Shared kebab action sheet ── */}
      <ActionSheet
        open={!!actionSheetList}
        onClose={() => setActionSheetList(null)}
        title={actionSheetList?.name}
        actions={actionSheetList ? buildOwnerActions(actionSheetList) : []}
      />

      {/* ── Folder action sheet (item #4) ── */}
      <ActionSheet
        open={!!folderActionSheet}
        onClose={() => setFolderActionSheet(null)}
        title={folderActionSheet?.name}
        actions={folderActionSheet ? buildFolderActions(folderActionSheet) : []}
      />

      {/* ── Folder name modal (new / rename) ── */}
      {folderModal && (
        <FolderNameModal
          mode={folderModal.mode}
          initialValue={folderModal.mode === 'rename' ? folderModal.folder.name : ''}
          saving={savingFolder}
          onSubmit={name => folderModal.mode === 'rename'
            ? handleRenameFolder(folderModal.folder, name)
            : handleCreateFolder(name)}
          onClose={() => setFolderModal(null)}
        />
      )}

      {/* ── Move a list into a folder ── */}
      {movingList && (
        <FolderPickerModal
          itemName={movingList.name}
          folders={folders}
          currentFolderId={movingList.folder_id ?? null}
          disabledIds={new Set()}
          allowTopLevel
          saving={savingMove}
          onPick={folderId => handleMoveList(movingList, folderId)}
          onClose={() => setMovingList(null)}
        />
      )}

      {/* ── Move a folder into another folder ── */}
      {movingFolder && (
        <FolderPickerModal
          itemName={movingFolder.name}
          folders={folders}
          currentFolderId={movingFolder.parent_id}
          disabledIds={disabledMoveTargets(movingFolder)}
          allowTopLevel={canMoveFolder(movingFolder.id, null, folders, folderDepthLimit)}
          saving={savingMove}
          onPick={parentId => handleMoveFolder(movingFolder, parentId)}
          onClose={() => setMovingFolder(null)}
        />
      )}

      {/* ── Rename modal ── */}
      {renamingList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !savingRename && setRenamingList(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-primary/5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
                  <Pencil size={11} className="text-primary-foreground" />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-primary">Edit List</p>
              </div>
              <button onClick={() => setRenamingList(null)} disabled={savingRename} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">List Name <span className="text-destructive">*</span></label>
                <Input
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  className="h-9 text-sm"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleRenameSave(); if (e.key === 'Escape') setRenamingList(null) }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Description <span className="text-muted-foreground/60">(optional)</span></label>
                <Input
                  value={renameDesc}
                  onChange={e => setRenameDesc(e.target.value)}
                  placeholder="What's this list for?"
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleRenameSave} disabled={!renameValue.trim() || savingRename} className="gap-2">
                  {savingRename ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  Save Changes
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setRenamingList(null)} disabled={savingRename}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      {!hideHeader ? (
        <PageHeader
          eyebrow="Library"
          title="Reading lists"
          subtitle={
            `${lists.length} list${lists.length !== 1 ? 's' : ''}` +
            (isProUser === false ? ` · ${Math.max(0, FREE_LIMITS.lists - lists.length)} free slot${FREE_LIMITS.lists - lists.length !== 1 ? 's' : ''} remaining` : '')
          }
          backHref={basePath.replace(/\/lists$/, '') || '/'}
          backLabel="Dashboard"
          isPro={isProUser === true}
          actions={
            !showCreate ? (
              <Button size="sm" onClick={handleNewListClick}
                className={cn('gap-1.5', atLimit && 'bg-gradient-to-r from-amber-400 to-orange-500 border-0 hover:opacity-90')}>
                {atLimit ? <Crown size={14} /> : <Plus size={14} />}
                {atLimit ? 'Upgrade for More' : 'New List'}
              </Button>
            ) : undefined
          }
        />
      ) : (!showCreate && (
        <div className="flex justify-end">
          <Button size="sm" onClick={handleNewListClick}
            className={cn('gap-1.5', atLimit && 'bg-gradient-to-r from-amber-400 to-orange-500 border-0 hover:opacity-90')}>
            {atLimit ? <Crown size={14} /> : <Plus size={14} />}
            {atLimit ? 'Upgrade for More' : 'New List'}
          </Button>
        </div>
      ))}

      {nearLimit && <UpgradeBanner current={lists.length} limit={FREE_LIMITS.lists} feature="reading lists" message="You're almost at your reading list limit" dismissible />}
      {atLimit && !showCreate && <UpgradeBanner current={lists.length} limit={FREE_LIMITS.lists} feature="reading lists" dismissible={false} />}

      {isProUser === false && lists.length > FREE_LIMITS.lists && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5">
          <Crown size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-600">
              {lists.length - FREE_LIMITS.lists} list{lists.length - FREE_LIMITS.lists !== 1 ? 's are' : ' is'} locked
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Your comics are safe. Resubscribe to Pro to unlock all {lists.length} lists.
            </p>
          </div>
          <Link href="/pricing" className="shrink-0">
            <Button size="sm" className="h-7 text-xs gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 border-0 text-white hover:opacity-90">
              <Sparkles size={11} />Unlock
            </Button>
          </Link>
        </div>
      )}

      {/* ── Create form ── */}
      {showCreate && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-primary/5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Plus size={13} className="text-primary-foreground" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-primary">Create New List</p>
          </div>
          <div className="p-5 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">List Name <span className="text-red-500">*</span></label>
              <Input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder='"Currently Reading", "Plan to Read"' autoFocus
                className="h-9 text-sm" onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Description <span className="text-muted-foreground/60">(optional)</span></label>
              <Input value={newDesc} onChange={e => setNewDesc(e.target.value)}
                placeholder="What's this list for?" className="h-9 text-sm" />
            </div>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className={cn('w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0',
                  isPublic ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/60')}
                onClick={() => setIsPublic(p => !p)}>
                {isPublic && <span className="text-primary-foreground text-[10px] font-black leading-none">✓</span>}
              </div>
              <div>
                <span className="text-sm font-medium">Make this list public</span>
                <p className="text-xs text-muted-foreground">Others can discover and star this list</p>
              </div>
            </label>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || creating} className="gap-2">
                {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Create List
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); setNewName(''); setNewDesc('') }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Folders (item #4): breadcrumb + new-folder button, then the
          folders sitting directly inside the one that's open ── */}
      {showFolderBar && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            {currentFolderId === null ? (
              <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/50">Folders</p>
            ) : (
              <nav className="flex items-center gap-1 text-xs text-muted-foreground min-w-0 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setCurrentFolderId(null)}
                  className="shrink-0 hover:text-foreground transition-colors"
                >
                  All lists
                </button>
                {path.map((f, i) => (
                  <span key={f.id} className="flex items-center gap-1 shrink-0">
                    <ChevronRight size={11} className="opacity-50" />
                    {i === path.length - 1 ? (
                      <span className="text-foreground font-medium">{f.name}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCurrentFolderId(f.id)}
                        className="hover:text-foreground transition-colors"
                      >
                        {f.name}
                      </button>
                    )}
                  </span>
                ))}
              </nav>
            )}

            {canCreateHere && (
              <button
                type="button"
                onClick={() => setFolderModal({ mode: 'create' })}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <FolderPlus size={12} /> New folder
              </button>
            )}
          </div>

          {visibleFolders.length > 0 && (
            <div className="divide-y divide-border/40 border-y border-border/40">
              {visibleFolders.map(folder => {
                const listCount   = lists.filter(l => l.folder_id === folder.id).length
                const folderCount = folders.filter(f => f.parent_id === folder.id).length
                const summary = [
                  listCount   > 0 ? `${listCount} list${listCount !== 1 ? 's' : ''}` : null,
                  folderCount > 0 ? `${folderCount} folder${folderCount !== 1 ? 's' : ''}` : null,
                ].filter(Boolean).join(' · ') || 'Empty'

                return (
                  <div key={folder.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentFolderId(folder.id)}
                      className="group flex-1 min-w-0 flex items-center gap-3 py-3 text-left"
                    >
                      <Folder size={16} className="text-muted-foreground/60 shrink-0" />
                      <span className="text-sm font-medium truncate group-hover:opacity-70 transition-opacity">{folder.name}</span>
                      <span className="text-[11px] text-muted-foreground/50 shrink-0">{summary}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFolderActionSheet(folder)}
                      className="shrink-0 p-2 text-muted-foreground/50 hover:text-foreground transition-colors"
                      aria-label="Folder options"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ── */}
      {lists.length === 0 && !showCreate ? (
        <div className="relative overflow-hidden text-center py-20 rounded-2xl border border-dashed border-border bg-card">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
          <div className="relative w-28 h-28 mx-auto mb-6">
            <div className="absolute top-0 left-2 w-16 h-22 rounded-xl border-2 border-border bg-muted/60 rotate-[-8deg]" />
            <div className="absolute top-2 left-5 w-16 h-22 rounded-xl border-2 border-border bg-muted/80 rotate-[-3deg]" />
            <div className="absolute top-4 left-8 w-16 h-22 rounded-xl border-2 border-primary/30 bg-card flex items-center justify-center shadow-lg">
              <BookMarked size={20} className="text-primary/50" />
            </div>
          </div>
          <h3 className="font-black text-xl mb-2">No lists yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto leading-relaxed">
            Create lists to organise your reading journey — currently reading, plan to read, all-time favourites.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-2">
              <Plus size={14} />Create Your First List
            </Button>
            <Link href="/browse">
              <Button variant="outline" size="sm" className="gap-2 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-200">
                <Radar size={14} />Browse Comics
              </Button>
            </Link>
          </div>
        </div>
      ) : visibleLists.length > 0 ? (
        <>
          {/* ── MOBILE: Pinterest two-column — kebab replaces the icon row ── */}
          <div className="sm:hidden grid grid-cols-2 gap-3 items-start">
            <div className="flex flex-col gap-3">
              {visibleLists.filter((_, i) => i % 2 === 0).map((list, posInCol) => {
                const ti     = themeIndex(list.id)
                const covers = getCoverPreviews(list)
                const count  = itemCount(list)
                const locked = isLocked(list.id)
                const cardH  = ['h-36', 'h-44', 'h-52'][posInCol % 3]

                return (
                  <div key={list.id} className={cn(
                    'rounded-2xl border overflow-hidden relative cursor-pointer',
                    cardH,
                    locked ? 'border-dashed border-amber-500/30 opacity-75' : THEME_BORDER[ti]
                  )}>
                    <StackedCover covers={covers} themeGrad={THEME_GRAD[ti]} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                    <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between">
                      {list.is_public
                        ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm"><Globe size={7} /> Public</span>
                        : <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 text-white/60 border border-white/10 backdrop-blur-sm"><Lock size={7} /> Private</span>
                      }
                      {count > 0 && (
                        <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 backdrop-blur-sm border border-white/10', THEME_ACCENT[ti])}>
                          <BookOpen size={7} /> {count}
                        </span>
                      )}
                    </div>
                    <Link href={`${basePath}/${list.id}`} className="absolute inset-0 z-10" aria-label={list.name} />
                    <div className="absolute bottom-0 left-0 right-0 z-20 p-2.5 flex items-end justify-between gap-2">
                      <p className="text-white font-black text-xs leading-snug line-clamp-2 drop-shadow-md flex-1 min-w-0">{list.name}</p>
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); setActionSheetList(list) }}
                        className="shrink-0 ml-auto w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white flex items-center justify-center transition-colors border border-white/20"
                      >
                        <MoreVertical size={12} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex flex-col gap-3">
              {visibleLists.filter((_, i) => i % 2 === 1).map((list, posInCol) => {
                const ti     = themeIndex(list.id)
                const covers = getCoverPreviews(list)
                const count  = itemCount(list)
                const locked = isLocked(list.id)
                const cardH  = ['h-44', 'h-52', 'h-36'][posInCol % 3]

                return (
                  <div key={list.id} className={cn(
                    'rounded-2xl border overflow-hidden relative cursor-pointer',
                    cardH,
                    locked ? 'border-dashed border-amber-500/30 opacity-75' : THEME_BORDER[ti]
                  )}>
                    <StackedCover covers={covers} themeGrad={THEME_GRAD[ti]} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                    <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between">
                      {list.is_public
                        ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm"><Globe size={7} /> Public</span>
                        : <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 text-white/60 border border-white/10 backdrop-blur-sm"><Lock size={7} /> Private</span>
                      }
                      {count > 0 && (
                        <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 backdrop-blur-sm border border-white/10', THEME_ACCENT[ti])}>
                          <BookOpen size={7} /> {count}
                        </span>
                      )}
                    </div>
                    <Link href={`${basePath}/${list.id}`} className="absolute inset-0 z-10" aria-label={list.name} />
                    <div className="absolute bottom-0 left-0 right-0 z-20 p-2.5 flex items-end justify-between gap-2">
                      <p className="text-white font-black text-xs leading-snug line-clamp-2 drop-shadow-md flex-1 min-w-0">{list.name}</p>
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); setActionSheetList(list) }}
                        className="shrink-0 ml-auto w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white flex items-center justify-center transition-colors border border-white/20"
                      >
                        <MoreVertical size={12} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── DESKTOP: grid — kebab replaces the icon row ── */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleLists.map((list) => {
              const ti     = themeIndex(list.id)
              const covers = getCoverPreviews(list)
              const count  = itemCount(list)
              const locked = isLocked(list.id)

              return (
                <div key={list.id} className={cn(
                  'group relative rounded-2xl border bg-card overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
                  locked ? 'border-dashed border-amber-500/20 opacity-80' : THEME_BORDER[ti]
                )}>
                  <div className={cn('h-24 relative overflow-hidden bg-gradient-to-br to-transparent', THEME_GRAD[ti])}>
                    {covers.length > 0 ? (
                      <div className="absolute inset-0 flex gap-0.5">
                        {covers.map((url, i) => (
                          <div key={i} className={cn('relative overflow-hidden',
                            covers.length === 1 ? 'flex-1' :
                            covers.length === 2 ? 'flex-1' :
                            covers.length === 3 && i === 0 ? 'w-1/2' : 'flex-1')}>
                            <img src={`/api/image-proxy?url=${encodeURIComponent(url)}`} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-300" />
                            <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent" />
                    <div className="absolute top-2 right-2">
                      {list.is_public
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-600 border border-emerald-500/20 backdrop-blur-sm"><Globe size={8} /> Public</span>
                        : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-muted/80 text-muted-foreground border border-border backdrop-blur-sm"><Lock size={8} /> Private</span>
                      }
                    </div>
                    {count > 0 && (
                      <div className="absolute bottom-2 left-2">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-background/80 backdrop-blur-sm border border-border', THEME_ACCENT[ti])}>
                          <BookOpen size={8} /> {count} comic{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    {locked && (
                      <div className="absolute top-2 left-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-600 border border-amber-500/20">
                          <Crown size={8} className="fill-amber-500" /> Locked
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <Link href={`${basePath}/${list.id}`} className={cn('font-black text-sm hover:text-primary transition-colors line-clamp-1 block', locked && 'hover:text-amber-500')}>
                        {list.name}
                      </Link>
                      {list.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">{list.description}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {list.star_count > 0 && (
                        <span className="flex items-center gap-1 text-[10px]">
                          <Star size={9} className="text-amber-500/60" />
                          {list.star_count} starred
                        </span>
                      )}
                      <span className="text-[10px] ml-auto">{formatDate(list.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Link href={`${basePath}/${list.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5 hover:border-primary/40 hover:text-primary">View</Button>
                      </Link>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setActionSheetList(list)}
                      >
                        <MoreVertical size={14} />
                      </Button>
                    </div>
                  </div>
                  <Link href={`${basePath}/${list.id}`}
                    className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity" tabIndex={-1}>
                    <ArrowRight size={14} className={locked ? 'text-amber-500' : 'text-muted-foreground'} />
                  </Link>
                </div>
              )
            })}
          </div>
        </>
      ) : currentFolderId !== null && visibleFolders.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground/60 py-10">
          This folder is empty. Use &apos;Move to folder&apos; on a list to put it here.
        </p>
      ) : null}

      {isProUser === false && lists.length > 0 && lists.length < FREE_LIMITS.lists && (
        <div className="flex items-center justify-center pt-2">
          <Link href="/pricing" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-amber-500 transition-colors">
            <Sparkles size={11} />Upgrade to Pro for unlimited reading lists
          </Link>
        </div>
      )}
    </div>
  )
}