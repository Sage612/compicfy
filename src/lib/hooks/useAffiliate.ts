'use client'

import { useAffiliateStore } from '@/store/affiliateStore'
import { AffiliateClickPayload } from '@/types/affiliate.types'

export function useAffiliate() {
  const { trackClick, hasClicked } = useAffiliateStore()

  const logClick = async (payload: AffiliateClickPayload) => {
    // 1. Update local Zustand state immediately for UI feedback
    trackClick(payload.comicId, payload.platform, payload.productType)

    // 2. Fire and forget to the database API
    try {
      await fetch('/api/affiliate/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (error) {
      console.error('Affiliate tracking failed:', error)
    }
  }

  return { logClick, hasClicked }
}