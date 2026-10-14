'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
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
        className="w-full max-w-md bg-card rounded-xl border border-border shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="font-dashboard-serif text-lg text-foreground">
            {mode === 'create' ? 'New folder' : 'Rename folder'}
          </p>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Close
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Name</label>
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
              {saving && <Loader2 size={13} className="animate-spin" />}
              {mode === 'create' ? 'Create folder' : 'Save name'}
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