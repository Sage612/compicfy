import { cn } from '@/lib/utils'
import { Gem } from 'lucide-react'

interface Props {
  size?:      'sm' | 'md'
  className?: string
  label?:     string
}

// Indigo-violet — distinct from Pro (gold) and Verified (teal)
export function PatronBadge({ size = 'md', className, label }: Props) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-bold border',
      size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
      'bg-patron/10 text-patron border-patron/20',
      className
    )}>
      <Gem size={size === 'sm' ? 8 : 9} className="fill-patron" />
      {label ?? 'Patron'}
    </span>
  )
}