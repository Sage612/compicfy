'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export interface ActionSheetAction {
  label: string
  icon: React.ReactNode
  onClick: (e: React.MouseEvent) => void
  destructive?: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  actions: ActionSheetAction[]
}

export function ActionSheet({ open, onClose, title, actions }: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          // Mobile: flush to the viewport bottom. Desktop: centered.
          'absolute bottom-0 left-0 right-0 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2',
          'w-full sm:max-w-xs bg-card rounded-t-xl sm:rounded-xl',
          // No bottom border on mobile — a full border + bottom-0 is what leaves the 1px gap
          'border-t border-x sm:border border-border shadow-2xl',
          'overflow-hidden max-h-[85vh] sm:max-h-none overflow-y-auto',
          'pb-[env(safe-area-inset-bottom)] sm:pb-0'
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 truncate">
              {title}
            </p>
            <button
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
          </div>
        )}

        <div className="py-1">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={(e) => {
                a.onClick(e)
                onClose()
              }}
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

        <div className="sm:hidden border-t border-border">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 text-sm text-center text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}