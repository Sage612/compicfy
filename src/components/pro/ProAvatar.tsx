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
  sm: { avatar: 'h-8 w-8',   wrapper: 'h-8 w-8',   ring: 'p-[2px] rounded-full', text: 'text-xs' },
  md: { avatar: 'h-10 w-10', wrapper: 'h-10 w-10', ring: 'p-[2px] rounded-full', text: 'text-sm' },
  lg: { avatar: 'h-16 w-16', wrapper: 'h-16 w-16', ring: 'p-[3px] rounded-full', text: 'text-lg' },
  xl: { avatar: 'h-20 w-20', wrapper: 'h-20 w-20', ring: 'p-[3px] rounded-full', text: 'text-xl' },
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
    <div
      className={cn(
        // Fixed dimensions — prevents the ring from stretching into a pill
        'relative shrink-0 inline-flex items-center justify-center',
        s.wrapper,
        s.ring,
        'bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500',
        'transition-all duration-500',
        className
      )}
    >
      <Avatar className={cn(s.avatar, 'ring-[2px] ring-background')}>
        <AvatarImage src={src ?? undefined} />
        <AvatarFallback className={cn('font-black bg-gradient-to-br from-amber-400 to-orange-500 text-white', s.text)}>
          {fallback}
        </AvatarFallback>
      </Avatar>
    </div>
  )
}