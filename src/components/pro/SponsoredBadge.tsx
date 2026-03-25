import { cn } from '@/lib/utils'

interface Props {
  className?: string
  size?: 'sm' | 'md'
}

export function SponsoredBadge({ className, size = 'md' }: Props) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full font-bold border',
      size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
      'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
      className
    )}>
      Sponsored
    </span>
  )
}