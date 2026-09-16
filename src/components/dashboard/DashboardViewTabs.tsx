'use client'

import { useState } from 'react'
import { BookOpen, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  showCurator: boolean
  readerView: React.ReactNode
  curatorView: React.ReactNode
}

export function DashboardViewTabs({ showCurator, readerView, curatorView }: Props) {
  const [tab, setTab] = useState<'reader' | 'curator'>('reader')

  // Not a curator yet — no tabs, just the reader view. Nothing changes for
  // the vast majority of accounts that haven't earned this yet.
  if (!showCurator) return <>{readerView}</>

  return (
    <div className="space-y-6">
      <div className="inline-flex p-1 rounded-2xl bg-muted/50 border border-border">
        {([
          { key: 'reader',  label: 'Reader',  icon: BookOpen  },
          { key: 'curator', label: 'Curator', icon: Sparkles  },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors',
              tab === key
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'reader' ? readerView : curatorView}
    </div>
  )
}