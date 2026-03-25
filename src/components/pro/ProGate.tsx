'use client'

import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess'
import { Button } from '@/components/ui/button'
import { Crown, Lock, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type Feature =
  | 'unlimited_recommendations'
  | 'unlimited_saves'
  | 'unlimited_lists'
  | 'advanced_filters'
  | 'priority_review'
  | 'ad_free'
  | 'premium_news'
  | 'export_lists'
  | 'custom_themes'
  | 'rec_analytics'
  | 'profile_views'
  | 'who_viewed_profile'

interface Props {
  feature: Feature
  children: React.ReactNode
  // Show a blur overlay instead of hiding content
  blur?: boolean
  // Custom message
  message?: string
  // Compact version for inline use
  compact?: boolean
  className?: string
}

export function ProGate({
  feature,
  children,
  blur = false,
  message,
  compact = false,
  className,
}: Props) {
  const { hasAccess, loading } = useFeatureAccess(feature)

  if (loading) return null

  if (hasAccess) return <>{children}</>

  // Blur overlay variant
  if (blur) {
    return (
      <div className={cn('relative', className)}>
        <div className="blur-sm pointer-events-none select-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-2xl">
          <div className="text-center space-y-3 p-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto shadow-lg">
              <Crown size={18} className="text-white" />
            </div>
            <p className="font-black text-sm">{message ?? 'Pro Feature'}</p>
            <Link href="/pricing">
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:opacity-90 border-0 text-white shadow-md">
                <Sparkles size={13} />
                Upgrade to Pro
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Compact inline variant
  if (compact) {
    return (
      <Link href="/pricing" className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-600 text-xs font-semibold hover:bg-amber-500/10 transition-colors', className)}>
        <Crown size={11} />
        Pro Feature
      </Link>
    )
  }

  // Full block variant
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-6 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 text-center space-y-4', className)}>
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
        <Crown size={24} className="text-white" />
      </div>
      <div className="space-y-1.5">
        <p className="font-black text-lg">Pro Feature</p>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          {message ?? 'This feature is available on the Pro plan. Upgrade to unlock it.'}
        </p>
      </div>
      <Link href="/pricing">
        <Button className="gap-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:opacity-90 border-0 text-white shadow-md shadow-amber-500/20">
          <Sparkles size={15} />
          Upgrade to Pro — from $4.99/mo
        </Button>
      </Link>
    </div>
  )
}