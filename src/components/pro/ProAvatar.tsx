'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface Props {
  src?: string | null
  fallback: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isPro?: boolean
  isAdmin?: boolean
  className?: string
}

const sizeMap = {
  sm:  { avatar: 'h-8 w-8',   ring: 'p-[2px] rounded-full', text: 'text-xs'  },
  md:  { avatar: 'h-10 w-10', ring: 'p-[2px] rounded-full', text: 'text-sm'  },
  lg:  { avatar: 'h-16 w-16', ring: 'p-[3px] rounded-full', text: 'text-lg'  },
  xl:  { avatar: 'h-20 w-20', ring: 'p-[3px] rounded-full', text: 'text-xl'  },
}

export function ProAvatar({ src, fallback, size = 'md', isPro, isAdmin, className }: Props) {
  const s = sizeMap[size]
  const showGold = isPro && !isAdmin

  if (!showGold) {
    return (
      <Avatar className={cn(s.avatar, className)}>
        <AvatarImage src={src ?? undefined} />
        <AvatarFallback className={cn('font-black bg-gradient-to-br from-primary to-violet-500 text-white', s.text)}>
          {fallback}
        </AvatarFallback>
      </Avatar>
    )
  }

  return (
    <div className={cn(
      'group relative shrink-0',
      s.ring,
      // Gold ring — shimmer on hover only
      'bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500',
      'hover:from-amber-200 hover:via-yellow-300 hover:to-orange-400',
      'transition-all duration-500',
      className
    )}>
      {/* Shimmer overlay — hover only */}
      <div className={cn(
        'absolute inset-0 rounded-full opacity-0 group-hover:opacity-100',
        'bg-gradient-to-r from-transparent via-white/40 to-transparent',
        'bg-[length:200%_100%]',
        'transition-opacity duration-300',
        'group-hover:animate-[shimmer_1.5s_ease-in-out_infinite]',
      )} />
      <Avatar className={cn(s.avatar, 'ring-[2px] ring-background')}>
        <AvatarImage src={src ?? undefined} />
        <AvatarFallback className={cn('font-black bg-gradient-to-br from-amber-400 to-orange-500 text-white', s.text)}>
          {fallback}
        </AvatarFallback>
      </Avatar>
    </div>
  )
}