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

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-bold border',
      size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
      'bg-amber-500/10 text-amber-500 border-amber-500/20',
      className
    )}>
      <Crown size={size === 'sm' ? 8 : 9} className="fill-amber-500" />
      Pro
    </span>
  )
}