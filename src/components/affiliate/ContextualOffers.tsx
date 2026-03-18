import { isAffiliateEnabled } from '@/lib/affiliate/feature-flags'
import { GenreMerchGrid } from './GenreMerchGrid'
import { AffiliateDisclaimer } from './AffiliateDisclaimer'

interface ContextualOffersProps {
  comicId: string
  comicTitle: string
  genre: string
}

export async function ContextualOffers({ comicId, comicTitle, genre }: ContextualOffersProps) {
  const enabled = await isAffiliateEnabled()
  if (!enabled) return null

  return (
    <section className="mt-8 pt-8 border-t border-border space-y-4">
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Fans Also Bought
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Merchandise related to <span className="text-foreground font-semibold">{comicTitle}</span>
        </p>
      </div>

      <GenreMerchGrid
        comicId={comicId}
        comicTitle={comicTitle}
        genre={genre}
      />

      <AffiliateDisclaimer />
    </section>
  )
}