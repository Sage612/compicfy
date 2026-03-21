'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Users, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

export function FeedTabs() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') ?? 'following'

  const tabs = [
    { value: 'following', label: 'Following', icon: Users    },
    { value: 'discover',  label: 'Discover',  icon: Globe    },
  ]

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border w-fit">
      {tabs.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => router.push(`/feed?tab=${value}`)}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
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
  )
}