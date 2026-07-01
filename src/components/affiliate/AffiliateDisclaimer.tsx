import React from 'react'
import { Info } from 'lucide-react'

export function AffiliateDisclaimer() {
  return (
    <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-md mt-6">
      <Info className="w-4 h-4 shrink-0 mt-0.5" />
      <p>
        <strong>Disclosure:</strong> ComPicfy is community-supported. When you buy through links on our site,
        we may earn an affiliate commission.
      </p>
    </div>
  )
}