'use client'

import React from 'react'
import { ExternalLink, CheckCircle2 } from 'lucide-react'
import { AffiliateClickPayload } from '@/types/affiliate.types'
import { useAffiliate } from '@/lib/hooks/useAffiliate'
import { AffiliateBadge } from './AffiliateBadge'

interface AffiliateLinkProps extends AffiliateClickPayload {
  href: string
  children: React.ReactNode
  className?: string
}

export function AffiliateLink({ href, children, className, ...trackingData }: AffiliateLinkProps) {
  const { logClick, hasClicked } = useAffiliate()
  const alreadyClicked = hasClicked(trackingData.comicId, trackingData.platform, trackingData.productType)

  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored nofollow noopener noreferrer"
      onClick={() => logClick(trackingData)}
      className={`inline-flex items-center gap-1.5 transition-all ${
        alreadyClicked ? 'opacity-70 grayscale-[0.5]' : ''
      } ${className}`}
    >
      {alreadyClicked ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : children}
      {alreadyClicked && <span className="text-xs">Viewed</span>}
      {!alreadyClicked && <ExternalLink className="w-3 h-3 opacity-70" />}
      <AffiliateBadge />
    </a>
  )
}