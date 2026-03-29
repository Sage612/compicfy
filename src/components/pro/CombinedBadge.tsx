import { cn } from '@/lib/utils'
import { Crown, BadgeCheck } from 'lucide-react'

interface Props {
  size?: 'sm' | 'md'
  className?: string
}

// Red badge shown when user has BOTH Pro + Verified
export function CombinedBadge({ size = 'md', className }: Props) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-bold border',
      size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
      'bg-red-500/10 text-red-500 border-red-500/20',
      className
    )}>
      <Crown size={size === 'sm' ? 8 : 9} className="fill-red-500" />
      <BadgeCheck size={size === 'sm' ? 9 : 10} className="fill-red-500 text-white" />
      Pro · Verified
    </span>
  )
}