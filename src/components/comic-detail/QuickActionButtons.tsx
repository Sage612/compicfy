'use client'

// src/components/comic-detail/QuickActionButtons.tsx
// The two round buttons floating on the banner: Share and "⋮" (opens the track sheet).

import { MoreHorizontal, Share2 } from 'lucide-react'
import { useTracking } from './TrackingProvider'

const round =
  'w-9 h-9 rounded-full bg-black/45 backdrop-blur-md text-white/90 flex items-center justify-center hover:bg-black/60 transition-colors'

export function BannerShareButton({ title, url }: { title: string; url: string }) {
  const share = async () => {
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ title, url })
      } else if (typeof navigator !== 'undefined') {
        await navigator.clipboard.writeText(url)
      }
    } catch {
      /* cancelled */
    }
  }

  return (
    <button type="button" onClick={share} aria-label="Share" className={round}>
      <Share2 size={16} />
    </button>
  )
}

export function BannerMenuButton() {
  const t = useTracking()
  return (
    <button type="button" onClick={t.openSheet} aria-label="More actions" className={round}>
      <MoreHorizontal size={18} />
    </button>
  )
}