import React from 'react';
import { AFFILIATE_MAPPINGS, generateAffiliateUrl } from '@/lib/affiliate/constants';
import { AffiliateLink } from './AffiliateLink';
import { ShoppingBag, Gamepad2, Sparkles, Shirt, BookOpen } from 'lucide-react';

interface GenreMerchGridProps {
  comicId: string;
  comicTitle: string;
  genre: string;
}

// Simple icon mapper based on product type
const getIcon = (productType: string) => {
  const type = productType.toLowerCase();
  if (type.includes('apparel') || type.includes('shirt') || type.includes('cosplay')) return <Shirt className="w-5 h-5" />;
  if (type.includes('game') || type.includes('figure')) return <Gamepad2 className="w-5 h-5" />;
  if (type.includes('book') || type.includes('stationery')) return <BookOpen className="w-5 h-5" />;
  if (type.includes('jewelry')) return <Sparkles className="w-5 h-5" />;
  return <ShoppingBag className="w-5 h-5" />;
};

export function GenreMerchGrid({ comicId, comicTitle, genre }: GenreMerchGridProps) {
  // Filter mappings based on the comic's genre
  const products = AFFILIATE_MAPPINGS.filter(
    (m) => m.genre.toLowerCase() === genre.toLowerCase()
  );

  if (products.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
      {products.map((product, idx) => {
        const searchQuery = product.searchTemplate.replace('{{title}}', comicTitle);
        const outboundUrl = generateAffiliateUrl(product.platform, searchQuery);

        return (
          <div key={idx} className="flex flex-col p-4 border rounded-lg hover:shadow-md transition-shadow bg-card text-card-foreground">
            <div className="flex items-center gap-3 mb-2 text-primary">
              {getIcon(product.productType)}
              <h4 className="font-semibold text-sm">{product.productType}</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Find {comicTitle} {product.productType.toLowerCase()} on {product.platform}
            </p>
            <div className="mt-auto">
              <AffiliateLink
                href={outboundUrl}
                comicId={comicId}
                comicTitle={comicTitle}
                platform={product.platform}
                productType={product.productType}
                genre={genre}
                className="text-sm font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-md w-full justify-center hover:bg-primary/20"
              >
                Shop on {product.platform}
              </AffiliateLink>
            </div>
          </div>
        );
      })}
    </div>
  );
}