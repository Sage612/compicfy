'use client'

import { useAge } from '@/components/ui/AgeGateProvider'

interface Props {
  contentRating: string
  children: React.ReactNode
}

export function AgeFilterWrapper({ contentRating, children }: Props) {
  const { canSeeAdult, canSeeMature } = useAge()

  if (contentRating === 'adult' && !canSeeAdult) return null
  if (contentRating === 'mature' && !canSeeMature) return null

  return <>{children}</>
}