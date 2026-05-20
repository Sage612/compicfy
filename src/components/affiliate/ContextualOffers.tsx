import { isAffiliateEnabled } from '@/lib/affiliate/feature-flags'
import { GenreMerchGrid } from './GenreMerchGrid'
import { AffiliateDisclaimer } from './AffiliateDisclaimer'
import { ShoppingBag } from 'lucide-react'

interface ContextualOffersProps {
  comicId:    string
  comicTitle: string
  genre:      string
  maxOffers?: number
}

export async function ContextualOffers({ comicId, comicTitle, genre, maxOffers = 3 }: ContextualOffersProps) {
  const enabled = await isAffiliateEnabled()
  if (!enabled) return null

  return (
    <section className="mt-8 space-y-4">
      {/* Header — matches page section style */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <ShoppingBag size={13} className="text-amber-500" />
        </div>
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Find Related Products
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="text-foreground font-semibold">{comicTitle}</span>{' '}
            merchandise links open search results, availability varies.
          </p>
        </div>
      </div>

      <GenreMerchGrid
        comicId={comicId}
        comicTitle={comicTitle}
        genre={genre}
        maxOffers={maxOffers}
      />

      <AffiliateDisclaimer />
    </section>
  )
}