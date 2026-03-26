import { cn } from '@/lib/utils'
import { BadgeCheck } from 'lucide-react'

interface Props {
  size?: 'sm' | 'md'
  className?: string
}

export function VerifiedBadge({ size = 'md', className }: Props) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-bold border',
      size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
      'bg-gradient-to-r from-amber-500/10 to-orange-500/10',
      'text-amber-600 border-amber-500/25',
      className
    )}>
      <BadgeCheck size={size === 'sm' ? 9 : 10} className="fill-amber-500 text-white" />
      Verified Recommender
    </span>
  )
}