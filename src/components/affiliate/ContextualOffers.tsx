import React from 'react';
import { isAffiliateEnabled } from '@/lib/affiliate/feature-flags';
import { GenreMerchGrid } from './GenreMerchGrid';
import { AffiliateDisclaimer } from './AffiliateDisclaimer';

interface ContextualOffersProps {
  comicId: string;
  comicTitle: string;
  genre: string;
}

export async function ContextualOffers({ comicId, comicTitle, genre }: ContextualOffersProps) {
  // Check feature flag on the server
  const enabled = await isAffiliateEnabled();
  
  if (!enabled) {
    return null; // Return nothing if flag is off
  }

  return (
    <section className="mt-12 pt-8 border-t border-border">
      <div className="mb-6">
        <h3 className="text-2xl font-bold tracking-tight">Fans Also Bought</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Explore recommended merchandise based on {comicTitle}
        </p>
      </div>
      
      <GenreMerchGrid comicId={comicId} comicTitle={comicTitle} genre={genre} />
      
      <AffiliateDisclaimer />
    </section>
  );
}