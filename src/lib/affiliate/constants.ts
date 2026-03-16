import { AffiliateProductMapping } from '@/types/affiliate.types';

export const AFFILIATE_MAPPINGS: AffiliateProductMapping[] = [
  { genre: 'Action', platform: 'Amazon', productType: 'Gaming gear', searchTemplate: '{{title}} gaming accessories', commission: '4-10%' },
  { genre: 'Action', platform: 'Entertainment Earth', productType: 'Action figures', searchTemplate: '{{title}} action figure', commission: '7-10%' },
  { genre: 'Romance', platform: 'Blippo', productType: 'Kawaii fashion', searchTemplate: '{{title}} kawaii merchandise', commission: '8-20%' },
  { genre: 'Romance', platform: 'Amazon', productType: 'Jewelry', searchTemplate: '{{title}} jewelry', commission: '4-10%' },
  { genre: 'Fantasy', platform: 'Amazon', productType: 'Art books', searchTemplate: '{{title}} art book', commission: '4-10%' },
  { genre: 'Fantasy', platform: 'Amazon', productType: 'Prints', searchTemplate: '{{title}} poster print', commission: '4-10%' },
  { genre: 'Fantasy', platform: 'Etsy', productType: 'Cosplay', searchTemplate: '{{title}} cosplay costume', commission: '4-8%' },
  { genre: 'Slice of Life', platform: 'Blippo', productType: 'Japanese snacks', searchTemplate: '{{title}} japanese snacks', commission: '8-20%' },
  { genre: 'Slice of Life', platform: 'Amazon', productType: 'Stationery', searchTemplate: '{{title}} stationery set', commission: '4-10%' },
  { genre: 'Sports', platform: 'Amazon', productType: 'Sportswear', searchTemplate: '{{title}} apparel', commission: '4-10%' },
  { genre: 'Sports', platform: 'eBay', productType: 'Sneakers', searchTemplate: '{{title}} shoes', commission: '2-5%' },
  { genre: 'Horror', platform: 'Amazon', productType: 'Gothic apparel', searchTemplate: '{{title}} horror t-shirt', commission: '4-10%' },
  { genre: 'Horror', platform: 'Entertainment Earth', productType: 'Horror collectibles', searchTemplate: '{{title}} horror figure', commission: '7-10%' },
  { genre: 'Comedy', platform: 'Amazon', productType: 'Funny merchandise', searchTemplate: '{{title}} funny gift', commission: '4-10%' },
  { genre: 'Comedy', platform: 'Blippo', productType: 'Plushies', searchTemplate: '{{title}} plush toy', commission: '8-20%' }
];

// Helper to generate the actual outbound URL based on platform
export const generateAffiliateUrl = (platform: string, searchQuery: string): string => {
  const query = encodeURIComponent(searchQuery);
  const amazonTag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG;

  switch (platform) {
    case 'Amazon':
      return `https://www.amazon.com/s?k=${query}&tag=${amazonTag}`;
    case 'Entertainment Earth':
      return `https://www.entertainmentearth.com/s/?query1=${query}&id=${process.env.ENTERTAINMENT_EARTH_AFFILIATE_ID}`;
    case 'Etsy':
      return `https://www.etsy.com/search?q=${query}&awc=${process.env.ETSY_AFFILIATE_ID}`;
    default:
      // Fallback generic search if no specific pattern is defined
      return `https://google.com/search?q=${query}+buy`;
  }
};