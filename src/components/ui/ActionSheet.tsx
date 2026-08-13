'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ActionSheetAction {
  label:        string
  icon:         React.ReactNode
  onClick:      (e: React.MouseEvent) => void
  destructive?: boolean
}

interface Props {
  open:    boolean
  onClose: () => void
  title?:  string
  actions: ActionSheetAction[]
}

export function ActionSheet({ open, onClose, title, actions }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full sm:max-w-xs bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[85vh] sm:max-h-none overflow-y-auto"
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{title}</p>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={14} />
            </button>
          </div>
        )}
        <div className="py-1">
          {actions.map(a => (
            <button
              key={a.label}
              onClick={e => { a.onClick(e); onClose() }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-accent transition-colors',
                a.destructive && 'text-destructive hover:bg-destructive/10'
              )}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
        {/* Cancel — mobile-friendly bottom-sheet convention. The sheet docks
            flush against the true screen bottom (no gap), so its opaque
            background fully covers whatever sits behind it — including the
            app's bottom nav bar — instead of floating above it. */}
        <div className="sm:hidden border-t border-border">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-sm font-semibold text-center text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}