'use client'

import { Check, Folder, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { folderTree } from '@/lib/utils/folders'
import type { ListFolder } from '@/lib/utils/folders'

interface Props {
  itemName:        string
  folders:         ListFolder[]
  /** Where the item sits now (null = top level). Shown with a check, not selectable. */
  currentFolderId: string | null
  /** Folders that can't be chosen (e.g. a folder's own subfolders, or targets past the tier's depth limit). */
  disabledIds:     Set<string>
  allowTopLevel:   boolean
  saving:          boolean
  onPick:          (folderId: string | null) => void
  onClose:         () => void
}

export function FolderPickerModal({
  itemName, folders, currentFolderId, disabledIds, allowTopLevel, saving, onPick, onClose,
}: Props) {
  const rows = folderTree(folders)

  const rowClass = (isCurrent: boolean, disabled: boolean) => cn(
    'w-full flex items-center gap-2.5 py-2.5 pr-3 rounded-xl text-sm text-left transition-colors',
    isCurrent
      ? 'text-foreground font-medium'
      : disabled
      ? 'text-muted-foreground/30 cursor-not-allowed'
      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={() => !saving && onClose()}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-card rounded-xl border border-border shadow-2xl overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="min-w-0 space-y-0.5">
            <p className="font-dashboard-serif text-lg text-foreground">Move to folder</p>
            <p className="text-xs text-muted-foreground truncate">{itemName}</p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            Close
          </button>
        </div>

        <div className="p-2 max-h-[50vh] overflow-y-auto">
          <button
            type="button"
            disabled={saving || currentFolderId === null || !allowTopLevel}
            onClick={() => onPick(null)}
            className={rowClass(currentFolderId === null, !allowTopLevel)}
            style={{ paddingLeft: 12 }}
          >
            <Folder size={14} className="shrink-0" />
            <span className="truncate flex-1">Top level</span>
            {currentFolderId === null && <Check size={13} className="shrink-0" />}
          </button>

          {rows.map(({ folder, depth }) => {
            const isCurrent = folder.id === currentFolderId
            const disabled  = disabledIds.has(folder.id)
            return (
              <button
                key={folder.id}
                type="button"
                disabled={saving || isCurrent || disabled}
                onClick={() => onPick(folder.id)}
                className={rowClass(isCurrent, disabled)}
                style={{ paddingLeft: 12 + (depth + 1) * 16 }}
              >
                <Folder size={14} className="shrink-0" />
                <span className="truncate flex-1">{folder.name}</span>
                {isCurrent && <Check size={13} className="shrink-0" />}
              </button>
            )
          })}

          {saving && (
            <div className="flex items-center justify-center py-3">
              <Loader2 size={14} className="animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}