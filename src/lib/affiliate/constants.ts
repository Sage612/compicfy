import type { AffiliateProductMapping } from '@/types/affiliate.types'

export const AFFILIATE_MAPPINGS: AffiliateProductMapping[] = [

  // ── ACTION ──────────────────────────────────────────────────────────────────
  // Manga volumes always exist for action titles
  { genre: 'Action', platform: 'Amazon',              productType: 'Manga Volumes',     searchTemplate: '{{title}} manga',           commission: '4-10%' },
  // Action figures are common for popular action titles
  { genre: 'Action', platform: 'Entertainment Earth', productType: 'Action Figures',    searchTemplate: '{{title}} action figure',   commission: '7-10%' },
  // Posters are broadly available
  { genre: 'Action', platform: 'Amazon',              productType: 'Posters & Prints',  searchTemplate: '{{title}} poster',          commission: '4-10%' },

  // ── ROMANCE ─────────────────────────────────────────────────────────────────
  { genre: 'Romance', platform: 'Amazon',             productType: 'Manga Volumes',     searchTemplate: '{{title}} manga',           commission: '4-10%' },
  { genre: 'Romance', platform: 'Etsy',               productType: 'Fan Art Prints',    searchTemplate: '{{title}} print art',       commission: '4-8%'  },
  { genre: 'Romance', platform: 'Amazon',             productType: 'Posters & Prints',  searchTemplate: '{{title}} poster',          commission: '4-10%' },

  // ── FANTASY ─────────────────────────────────────────────────────────────────
  { genre: 'Fantasy', platform: 'Amazon',             productType: 'Manga Volumes',     searchTemplate: '{{title}} manga',           commission: '4-10%' },
  // Art books exist for most popular fantasy titles
  { genre: 'Fantasy', platform: 'Amazon',             productType: 'Art Book',          searchTemplate: '{{title}} art book',        commission: '4-10%' },
  { genre: 'Fantasy', platform: 'Etsy',               productType: 'Cosplay & Costumes',searchTemplate: '{{title}} cosplay',         commission: '4-8%'  },
  { genre: 'Fantasy', platform: 'Amazon',             productType: 'Posters & Prints',  searchTemplate: '{{title}} poster',          commission: '4-10%' },

  // ── SLICE OF LIFE ────────────────────────────────────────────────────────────
  { genre: 'Slice of Life', platform: 'Amazon',       productType: 'Manga Volumes',     searchTemplate: '{{title}} manga',           commission: '4-10%' },
  { genre: 'Slice of Life', platform: 'Amazon',       productType: 'Posters & Prints',  searchTemplate: '{{title}} poster',          commission: '4-10%' },
  // Plushies exist for slice of life titles with cute characters
  { genre: 'Slice of Life', platform: 'Amazon',       productType: 'Plush Toys',        searchTemplate: '{{title}} plush',           commission: '4-10%' },

  // ── SPORTS ──────────────────────────────────────────────────────────────────
  { genre: 'Sports', platform: 'Amazon',              productType: 'Manga Volumes',     searchTemplate: '{{title}} manga',           commission: '4-10%' },
  { genre: 'Sports', platform: 'Amazon',              productType: 'Posters & Prints',  searchTemplate: '{{title}} poster',          commission: '4-10%' },
  // Figures exist for big sports titles like Haikyuu, Kuroko
  { genre: 'Sports', platform: 'Entertainment Earth', productType: 'Figures',           searchTemplate: '{{title}} figure',          commission: '7-10%' },

  // ── HORROR ──────────────────────────────────────────────────────────────────
  { genre: 'Horror', platform: 'Amazon',              productType: 'Manga Volumes',     searchTemplate: '{{title}} manga',           commission: '4-10%' },
  { genre: 'Horror', platform: 'Entertainment Earth', productType: 'Horror Figures',    searchTemplate: '{{title}} figure',          commission: '7-10%' },
  { genre: 'Horror', platform: 'Amazon',              productType: 'Posters & Prints',  searchTemplate: '{{title}} poster',          commission: '4-10%' },

  // ── COMEDY ──────────────────────────────────────────────────────────────────
  { genre: 'Comedy', platform: 'Amazon',              productType: 'Manga Volumes',     searchTemplate: '{{title}} manga',           commission: '4-10%' },
  { genre: 'Comedy', platform: 'Amazon',              productType: 'Plush Toys',        searchTemplate: '{{title}} plush',           commission: '4-10%' },
  { genre: 'Comedy', platform: 'Amazon',              productType: 'Posters & Prints',  searchTemplate: '{{title}} poster',          commission: '4-10%' },
]

// Only uses NEXT_PUBLIC_ vars — safe on both server and client
export function generateAffiliateUrl(platform: string, searchQuery: string): string {
  const query = encodeURIComponent(searchQuery)
  const amazonTag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG ?? 'compicfy-20'

  switch (platform) {
    case 'Amazon':
      return `https://www.amazon.com/s?k=${query}&tag=${amazonTag}`
    case 'Entertainment Earth':
      return `https://www.entertainmentearth.com/s/?query1=${query}`
    case 'Etsy':
      return `https://www.etsy.com/search?q=${query}`
    case 'Blippo':
      return `https://www.blippo.com/search?q=${query}`
    case 'eBay':
      return `https://www.ebay.com/sch/i.html?_nkw=${query}`
    default:
      return `https://www.google.com/search?q=${encodeURIComponent(searchQuery + ' buy')}`
  }
}