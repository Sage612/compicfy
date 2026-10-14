'use client'

import { useState } from 'react'
import { Check, FolderPlus, Loader2, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LIST_FOLDER_NAME_MAX_LENGTH } from '@/lib/utils/folders'

interface Props {
  mode:          'create' | 'rename'
  initialValue?: string
  saving:        boolean
  onSubmit:      (name: string) => void
  onClose:       () => void
}

/**
 * One small modal for both "New folder" and "Rename folder", so the two
 * can't drift apart. Mirrors the look of the list rename modal on the same
 * page.
 */
export function FolderNameModal({ mode, initialValue = '', saving, onSubmit, onClose }: Props) {
  const [name, setName] = useState(initialValue)

  const trimmed   = name.trim()
  const unchanged = mode === 'rename' && trimmed === initialValue.trim()

  const submit = () => {
    if (!trimmed || saving || unchanged) return
    onSubmit(trimmed)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={() => !saving && onClose()}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
              {mode === 'create'
                ? <FolderPlus size={11} className="text-primary-foreground" />
                : <Pencil size={11} className="text-primary-foreground" />}
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-primary">
              {mode === 'create' ? 'New Folder' : 'Rename Folder'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Folder Name <span className="text-destructive">*</span>
            </label>
            <Input
              value={name}
              onChange={e => setName(e.target.value.slice(0, LIST_FOLDER_NAME_MAX_LENGTH))}
              placeholder='"Isekai", "Finished series"'
              className="h-9 text-sm"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') submit()
                if (e.key === 'Escape') onClose()
              }}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={submit} disabled={!trimmed || saving || unchanged} className="gap-2">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {mode === 'create' ? 'Create Folder' : 'Save Name'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}