import type { AffiliateProductMapping } from '@/types/affiliate.types'

// Blippo category pages — guaranteed real products, referral ID added later
const BLIPPO_CATEGORIES = {
  plush:      'https://www.blippo.com/plush-toys/',
  stationery: 'https://www.blippo.com/stationery/',
  accessories:'https://www.blippo.com/accessories/',
  snacks:     'https://www.blippo.com/japanese-candy/',
  fashion:    'https://www.blippo.com/fashion/',
}

export const AFFILIATE_MAPPINGS: AffiliateProductMapping[] = [

  // ── ACTION ──────────────────────────────────────────────────────────────────
  { genre: 'Action', platform: 'Amazon',              productType: 'Manga Volumes',      searchTemplate: '{{title}} manga',              commission: '4-10%' },
  { genre: 'Action', platform: 'Entertainment Earth', productType: 'Action Figures',     searchTemplate: '{{title}} action figure',      commission: '7-10%' },
  { genre: 'Action', platform: 'Amazon',              productType: 'Posters & Prints',   searchTemplate: '{{title}} poster',             commission: '4-10%' },

  // ── ROMANCE ─────────────────────────────────────────────────────────────────
  { genre: 'Romance', platform: 'Amazon',             productType: 'Manga Volumes',      searchTemplate: '{{title}} manga',              commission: '4-10%' },
  { genre: 'Romance', platform: 'Amazon',             productType: 'Posters & Prints',   searchTemplate: '{{title}} poster',             commission: '4-10%' },
  { genre: 'Romance', platform: 'Etsy',               productType: 'Fan Art Prints',     searchTemplate: 'manga romance anime print art',commission: '4-8%'  },
  { genre: 'Romance', platform: 'Blippo',             productType: 'Kawaii Accessories', searchTemplate: BLIPPO_CATEGORIES.accessories,  commission: '8-20%' },
  { genre: 'Romance', platform: 'Blippo',             productType: 'Plush Toys',         searchTemplate: BLIPPO_CATEGORIES.plush,        commission: '8-20%' },
  { genre: 'Romance', platform: 'Blippo',             productType: 'Stationery',         searchTemplate: BLIPPO_CATEGORIES.stationery,   commission: '8-20%' },

  // ── FANTASY ─────────────────────────────────────────────────────────────────
  { genre: 'Fantasy', platform: 'Amazon',             productType: 'Manga Volumes',      searchTemplate: '{{title}} manga',              commission: '4-10%' },
  { genre: 'Fantasy', platform: 'Amazon',             productType: 'Art Book',           searchTemplate: '{{title}} art book',           commission: '4-10%' },
  { genre: 'Fantasy', platform: 'Amazon',             productType: 'Posters & Prints',   searchTemplate: '{{title}} poster',             commission: '4-10%' },
  { genre: 'Fantasy', platform: 'Etsy',               productType: 'Cosplay & Costumes', searchTemplate: 'fantasy anime cosplay costume',commission: '4-8%'  },
  { genre: 'Fantasy', platform: 'Blippo',             productType: 'Kawaii Accessories', searchTemplate: BLIPPO_CATEGORIES.accessories,  commission: '8-20%' },

  // ── SLICE OF LIFE ────────────────────────────────────────────────────────────
  { genre: 'Slice of Life', platform: 'Amazon',       productType: 'Manga Volumes',      searchTemplate: '{{title}} manga',              commission: '4-10%' },
  { genre: 'Slice of Life', platform: 'Amazon',       productType: 'Posters & Prints',   searchTemplate: '{{title}} poster',             commission: '4-10%' },
  { genre: 'Slice of Life', platform: 'Amazon',       productType: 'Plush Toys',         searchTemplate: 'anime plush toy',              commission: '4-10%' },
  { genre: 'Slice of Life', platform: 'Blippo',       productType: 'Japanese Snacks',    searchTemplate: BLIPPO_CATEGORIES.snacks,       commission: '8-20%' },
  { genre: 'Slice of Life', platform: 'Blippo',       productType: 'Stationery',         searchTemplate: BLIPPO_CATEGORIES.stationery,   commission: '8-20%' },

  // ── SPORTS ──────────────────────────────────────────────────────────────────
  { genre: 'Sports', platform: 'Amazon',              productType: 'Manga Volumes',      searchTemplate: '{{title}} manga',              commission: '4-10%' },
  { genre: 'Sports', platform: 'Amazon',              productType: 'Posters & Prints',   searchTemplate: '{{title}} poster',             commission: '4-10%' },
  { genre: 'Sports', platform: 'Entertainment Earth', productType: 'Figures',            searchTemplate: '{{title}} figure',             commission: '7-10%' },

  // ── HORROR ──────────────────────────────────────────────────────────────────
  { genre: 'Horror', platform: 'Amazon',              productType: 'Manga Volumes',      searchTemplate: '{{title}} manga',              commission: '4-10%' },
  { genre: 'Horror', platform: 'Entertainment Earth', productType: 'Horror Figures',     searchTemplate: '{{title}} horror figure',      commission: '7-10%' },
  { genre: 'Horror', platform: 'Amazon',              productType: 'Posters & Prints',   searchTemplate: '{{title}} poster',             commission: '4-10%' },

  // ── COMEDY ──────────────────────────────────────────────────────────────────
  { genre: 'Comedy', platform: 'Amazon',              productType: 'Manga Volumes',      searchTemplate: '{{title}} manga',              commission: '4-10%' },
  { genre: 'Comedy', platform: 'Amazon',              productType: 'Posters & Prints',   searchTemplate: '{{title}} poster',             commission: '4-10%' },
  { genre: 'Comedy', platform: 'Amazon',              productType: 'Plush Toys',         searchTemplate: 'anime plush toy',              commission: '4-10%' },
  { genre: 'Comedy', platform: 'Blippo',              productType: 'Plush Toys',         searchTemplate: BLIPPO_CATEGORIES.plush,        commission: '8-20%' },
]

export function generateAffiliateUrl(platform: string, searchQuery: string): string {
  const amazonTag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG ?? 'compicfy-20'

  // Blippo — direct category page, no search needed
  // TODO: append ?ref=YOUR_REFERRAL_ID once Blippo contacts you
  if (platform === 'Blippo') {
    return searchQuery // searchQuery is already the full category URL
  }

  const query = encodeURIComponent(searchQuery)

  switch (platform) {
    case 'Amazon':
      return `https://www.amazon.com/s?k=${query}&tag=${amazonTag}`
    case 'Entertainment Earth':
      return `https://www.entertainmentearth.com/s/?query1=${query}`
    case 'Etsy':
      return `https://www.etsy.com/search?q=${query}`
    case 'eBay':
      return `https://www.ebay.com/sch/i.html?_nkw=${query}`
    default:
      return `https://www.google.com/search?q=${encodeURIComponent(searchQuery + ' buy')}`
  }
}