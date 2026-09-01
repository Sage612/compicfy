'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { BookOpen, ListMusic, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  username: string
}

export function ProfileTabs({ username }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') ?? 'recommendations'

  const tabs = [
    { value: 'recommendations', label: 'Recommendations', icon: BookOpen   },
    { value: 'lists',           label: 'Reading Lists',    icon: ListMusic },
    { value: 'taste',           label: 'Taste & DNA',      icon: Sparkles  },
  ]

  // Horizontally scrollable, matching MobileTabBar's pattern — a fixed
  // w-fit row was clipping the 3rd tab off-screen on narrow phones with
  // no way to reach it. Edge-fade gradients hint that there's more to
  // scroll, same visual language as the bottom mobile tab bar.
  return (
    <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-r from-background to-transparent sm:hidden" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-l from-background to-transparent sm:hidden" />
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border overflow-x-auto no-scrollbar w-full sm:w-fit">
        {tabs.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => router.push(`/profile/${username}?tab=${value}`)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap shrink-0',
              tab === value
                ? 'bg-background text-foreground shadow-sm border border-border'
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