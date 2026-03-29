import { ProBadge } from './ProBadge'
import { VerifiedBadge } from './VerifiedBadge'
import { CombinedBadge } from './CombinedBadge'

interface Props {
  role?: string
  isPro?: boolean
  isVerified?: boolean
  size?: 'sm' | 'md'
  className?: string
}

/*
  Badge rules:
  - Pro (gold) + Verified (purple) together → red combined badge instead of two
  - Pro only                                → gold Pro badge
  - Verified only                           → purple Verified badge
  - Admin                                   → primary Admin badge (no pro/verified override)
  - Mod                                     → blue Mod badge
*/
export function UserBadges({ role, isPro, isVerified, size = 'md', className }: Props) {
  const isAdmin = role === 'admin'
  const isMod = role === 'moderator'

  // Admin and Mod badges are role-based, shown independently
  // They don't get merged into the combined red badge
  if (isAdmin || isMod) {
    return <ProBadge role={role} isPro={isPro} size={size} className={className} />
  }

  // Both Pro + Verified → single red badge
  if (isPro && isVerified) {
    return <CombinedBadge size={size} className={className} />
  }

  // Pro only → gold
  if (isPro) {
    return <ProBadge role={role} isPro={isPro} size={size} className={className} />
  }

  // Verified only → purple
  if (isVerified) {
    return <VerifiedBadge size={size} className={className} />
  }

  return null
}