'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { BookOpen, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  showCurator: boolean
  readerView: React.ReactNode
  curatorView: React.ReactNode
}

export function DashboardViewTabs({ showCurator, readerView, curatorView }: Props) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  // URL, not local state — this is what lets the nav (a separate component)
  // know which tab is active and show matching links, without prop-drilling
  // or a context provider across the layout boundary.
  const tab = searchParams.get('view') === 'curator' ? 'curator' : 'reader'

  const setTab = (next: 'reader' | 'curator') => {
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'reader') params.delete('view') // keep the URL clean on the default tab
    else params.set('view', next)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

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