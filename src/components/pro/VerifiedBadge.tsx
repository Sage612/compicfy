import { cn } from '@/lib/utils'
import { BadgeCheck } from 'lucide-react'

interface Props {
  size?: 'sm' | 'md'
  className?: string
}

// Teal — matches brand primary, replaces old purple
export function VerifiedBadge({ size = 'md', className }: Props) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-bold border',
      size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
      'bg-verified/10 text-verified border-verified/20',
      className
    )}>
      <BadgeCheck size={size === 'sm' ? 9 : 10} className="fill-verified text-white" />
      Verified
    </span>
  )
}