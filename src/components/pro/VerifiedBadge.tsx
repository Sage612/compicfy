import { cn } from '@/lib/utils'
import { BadgeCheck } from 'lucide-react'

interface Props {
  size?: 'sm' | 'md'
  className?: string
}

// Purple — distinct from Pro (gold) badge
export function VerifiedBadge({ size = 'md', className }: Props) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-bold border',
      size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
      'bg-purple-500/10 text-purple-500 border-purple-500/20',
      className
    )}>
      <BadgeCheck size={size === 'sm' ? 9 : 10} className="fill-purple-500 text-white" />
      Verified
    </span>
  )
}