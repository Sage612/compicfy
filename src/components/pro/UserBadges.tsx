import { ProBadge } from './ProBadge'
import { PatronBadge } from './PatronBadge'
import { VerifiedBadge } from './VerifiedBadge'
import { CombinedBadge } from './CombinedBadge'

interface Props {
  role?: string
  isPro?: boolean
  isPatron?: boolean
  isVerified?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function UserBadges({ role, isPro, isPatron, isVerified, size = 'md', className }: Props) {
  const isAdmin = role === 'admin'
  const isMod   = role === 'moderator'

  // Admin and Mod badges are role-based, shown independently
  if (isAdmin || isMod) {
    return <ProBadge role={role} isPro={isPro} size={size} className={className} />
  }

  // Patron + Verified -> single violet->teal combined badge
  if (isPatron && isVerified) {
    return <CombinedBadge tier="patron" size={size} className={className} />
  }

  // Pro + Verified -> single gold->teal combined badge
  if (isPro && isVerified) {
    return <CombinedBadge tier="pro" size={size} className={className} />
  }

  // Patron only -> violet (implies Pro, so no separate Pro badge shown alongside)
  if (isPatron) {
    return <PatronBadge size={size} className={className} />
  }

  // Pro only -> gold
  if (isPro) {
    return <ProBadge role={role} isPro={isPro} size={size} className={className} />
  }

  // Verified only -> teal
  if (isVerified) {
    return <VerifiedBadge size={size} className={className} />
  }

  return null
}