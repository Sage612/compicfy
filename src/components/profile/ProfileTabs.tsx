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

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border w-fit">
      {tabs.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => router.push(`/profile/${username}?tab=${value}`)}
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