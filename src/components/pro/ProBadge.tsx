import { Crown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  role?: string
  isPro?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function ProBadge({ role, isPro, size = 'md', className }: Props) {
  const isAdmin = role === 'admin'
  const isMod = role === 'moderator'

  if (!isAdmin && !isMod && !isPro) return null

  // Admin badge — primary/violet
  if (isAdmin) {
    return (
      <span className={cn(
        'inline-flex items-center gap-1 rounded-full font-bold border',
        size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
        'bg-primary/10 text-primary border-primary/20',
        className
      )}>
        <Crown size={size === 'sm' ? 8 : 9} className="fill-primary" />
        Admin
      </span>
    )
  }

  // Mod badge — blue
  if (isMod) {
    return (
      <span className={cn(
        'inline-flex items-center gap-1 rounded-full font-bold border',
        size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
        'bg-blue-500/10 text-blue-500 border-blue-500/20',
        className
      )}>
        <Crown size={size === 'sm' ? 8 : 9} />
        Mod
      </span>
    )
  }

  // Pro badge — gold (distinctly gold, not amber)
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-bold border',
      size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
      'bg-yellow-400/15 text-yellow-500 border-yellow-400/30',
      className
    )}>
      <Crown size={size === 'sm' ? 8 : 9} className="fill-yellow-400" />
      Pro
    </span>
  )
}