import { cn } from '@/lib/utils'
import { Crown, Gem, BadgeCheck } from 'lucide-react'

interface Props {
  size?:  'sm' | 'md'
  className?: string
  // Patron implies Pro, so tier only needs two states here —
  // there is no separate "Pro + Patron" combo.
  tier: 'pro' | 'patron'
}

// Gradient badge shown when a user has BOTH Verified + (Pro or Patron).
// Pro + Verified   -> gold -> teal gradient
// Patron + Verified -> violet -> teal gradient
export function CombinedBadge({ size = 'md', className, tier }: Props) {
  const isPatron = tier === 'patron'

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-bold border-0 text-white',
      size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
      isPatron
        ? 'bg-gradient-to-r from-patron to-verified'
        : 'bg-gradient-to-r from-pro to-verified',
      className
    )}>
      {isPatron
        ? <Gem size={size === 'sm' ? 8 : 9} className="fill-white" />
        : <Crown size={size === 'sm' ? 8 : 9} className="fill-white" />
      }
      <BadgeCheck size={size === 'sm' ? 9 : 10} className="fill-white/90 text-transparent" />
      {isPatron ? 'Patron · Verified' : 'Pro · Verified'}
    </span>
  )
}