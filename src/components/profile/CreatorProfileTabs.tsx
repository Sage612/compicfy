'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Palette, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  username: string
}

export function CreatorProfileTabs({ username }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') ?? 'works'

  const tabs = [
    { value: 'works', label: 'Works', icon: Palette },
    { value: 'about', label: 'About', icon: Info    },
  ]

  // Only 2 tabs here so overflow is unlikely, but kept consistent with
  // ProfileTabs' scrollable pattern rather than diverging — same fix
  // applied to both pages since the reader page's 3-tab overflow bug
  // was found on the same underlying w-fit layout this file also used.
  return (
    <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-r from-background to-transparent sm:hidden" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-l from-background to-transparent sm:hidden" />
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border overflow-x-auto no-scrollbar w-full sm:w-fit">
        {tabs.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => router.push(`/creator/${username}?tab=${value}`)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap shrink-0',
              tab === value
                ? 'bg-background text-foreground shadow-sm border border-teal-500/30'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}