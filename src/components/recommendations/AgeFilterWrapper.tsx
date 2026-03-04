'use client'

import { useAge } from '@/components/ui/AgeGateProvider'

interface Props {
  contentRating: string | null
  children: React.ReactNode
}

export function AgeFilterWrapper({ contentRating, children }: Props) {
  const { isAllowedRating } = useAge()

  const rating = contentRating ?? 'all_ages'

  if (!isAllowedRating(rating)) return null

  return <>{children}</>
}