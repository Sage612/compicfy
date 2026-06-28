import { isAffiliateEnabled } from '@/lib/affiliate/feature-flags'
import { AFFILIATE_MAPPINGS } from '@/lib/affiliate/constants'
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

  // FIX: GenreMerchGrid already silently returns null when there are no
  // products for this genre, but ContextualOffers still rendered its own
  // heading + disclaimer wrapper around it regardless — leaving a floating
  // "Find Related Products" header with empty space under it whenever a
  // genre had no affiliate mappings. Lifting the same check up here means
  // the *entire* section disappears, not just the grid inside it.
  const hasProducts = AFFILIATE_MAPPINGS.some(
    (m) => m.genre.toLowerCase() === genre.toLowerCase()
  )
  if (!hasProducts) return null

  return (
    <section className="space-y-4">
      {/*
        Renamed from "Sponsored Picks" — that phrasing read as "sponsored
        comics," which is confusing on a comic recommendation page. This is
        merch/product search links, not comic content, so the heading and
        subtext now say that explicitly.
      */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <ShoppingBag size={13} className="text-amber-500" />
        </div>
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Shop Related Merch
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Product search links for <span className="text-foreground font-semibold">{comicTitle}</span>{' '}
            merchandise — not affiliated with the series, availability varies.
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