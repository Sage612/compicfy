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

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border w-fit">
      {tabs.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => router.push(`/creator/${username}?tab=${value}`)}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
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
  )
}