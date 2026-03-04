'use client'

import { useAge } from '@/components/ui/AgeGateProvider'
import { ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface Props {
  contentRating: string
  children: React.ReactNode
}

export function AgeBlocker({ contentRating, children }: Props) {
  const { canSeeAdult, canSeeMature, ageStatus } = useAge()

  const isBlocked =
    (contentRating === 'adult' && !canSeeAdult) ||
    (contentRating === 'mature' && !canSeeMature)

  if (ageStatus === 'unknown') return null // still loading

  if (isBlocked) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
          <ShieldAlert size={32} className="text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Age Restricted</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          This comic is rated <strong className="text-foreground capitalize">{contentRating}</strong> and
          requires age verification to view. Please verify your age to access this content.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/browse">
            <Button variant="outline">Back to Browse</Button>
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          If you have already verified your age, try refreshing the page.
        </p>
      </div>
    )
  }

  return <>{children}</>
}