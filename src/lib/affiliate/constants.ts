import type { AffiliateProductMapping } from '@/types/affiliate.types'

// ── BLIPPO REAL CATEGORY URLs ─────────────────────────────────────────────────
// TODO: append ?ref=YOUR_REFERRAL_ID to all once Blippo approves you
const B = {
  plushies:     'https://www.blippo.com/collections/plushies',
  toys:         'https://www.blippo.com/collections/toys',
  stationery:   'https://www.blippo.com/collections/stationery',
  notebooks:    'https://www.blippo.com/collections/notebooks-notepads',
  stickers:     'https://www.blippo.com/collections/tapes-stickers',
  accessories:  'https://www.blippo.com/collections/accessories',
  keychains:    'https://www.blippo.com/collections/keychains-charms',
  jewelry:      'https://www.blippo.com/collections/jewelry',
  figures:      'https://www.blippo.com/collections/dolls-figures',
  collectibles: 'https://www.blippo.com/collections/collectibles',
  blindboxes:   'https://www.blippo.com/collections/blind-boxes',
  gachapon:     'https://www.blippo.com/collections/gachapon',
  squishies:    'https://www.blippo.com/collections/squishies',
  pins:         'https://www.blippo.com/collections/badges-pins',
  hair:         'https://www.blippo.com/collections/hair',
  tops:         'https://www.blippo.com/collections/tops',
  socks:        'https://www.blippo.com/collections/socks',
  bags:         'https://www.blippo.com/collections/bags',
  tote:         'https://www.blippo.com/collections/tote-bags',
  backpacks:    'https://www.blippo.com/collections/backpacks',
  beauty:       'https://www.blippo.com/collections/beauty-accessories',
  snacks:       'https://www.blippo.com/collections/snacks',
  candy:        'https://www.blippo.com/collections/candy',
  animeSnacks:  'https://www.blippo.com/collections/anime-snacks',
  diyCandy:     'https://www.blippo.com/collections/diy-candy',
  craft:        'https://www.blippo.com/collections/diy-craft',
  games:        'https://www.blippo.com/collections/games-toys',
  lucky:        'https://www.blippo.com/collections/lucky-bags',
  home:         'https://www.blippo.com/collections/home',
  phone:        'https://www.blippo.com/collections/tech',
}

export const AFFILIATE_MAPPINGS: AffiliateProductMapping[] = [

  // ── ACTION ──────────────────────────────────────────────────────────────────
  { genre: 'Action', platform: 'Amazon',              productType: 'Manga Volumes',     searchTemplate: '{{title}} manga',         commission: '4-10%' },
  { genre: 'Action', platform: 'Entertainment Earth', productType: 'Action Figures',    searchTemplate: '{{title}} action figure', commission: '7-10%' },
  { genre: 'Action', platform: 'Amazon',              productType: 'Posters & Prints',  searchTemplate: '{{title}} poster',        commission: '4-10%' },
  { genre: 'Action', platform: 'Blippo',              productType: 'Figures & Dolls',   searchTemplate: B.figures,                 commission: '8-20%' },
  { genre: 'Action', platform: 'Blippo',              productType: 'Collectibles',      searchTemplate: B.collectibles,            commission: '8-20%' },
  { genre: 'Action', platform: 'Blippo',              productType: 'Blind Boxes',       searchTemplate: B.blindboxes,              commission: '8-20%' },

  // ── ROMANCE ─────────────────────────────────────────────────────────────────
  { genre: 'Romance', platform: 'Amazon',             productType: 'Manga Volumes',     searchTemplate: '{{title}} manga',              commission: '4-10%' },
  { genre: 'Romance', platform: 'Amazon',             productType: 'Posters & Prints',  searchTemplate: '{{title}} poster',             commission: '4-10%' },
  { genre: 'Romance', platform: 'Etsy',               productType: 'Fan Art Prints',    searchTemplate: 'manga romance anime print art', commission: '4-8%'  },
  { genre: 'Romance', platform: 'Blippo',             productType: 'Kawaii Accessories',searchTemplate: B.accessories,                  commission: '8-20%' },
  { genre: 'Romance', platform: 'Blippo',             productType: 'Plush Toys',        searchTemplate: B.plushies,                     commission: '8-20%' },
  { genre: 'Romance', platform: 'Blippo',             productType: 'Stationery',        searchTemplate: B.stationery,                   commission: '8-20%' },
  { genre: 'Romance', platform: 'Blippo',             productType: 'Jewelry & Watches', searchTemplate: B.jewelry,                      commission: '8-20%' },
  { genre: 'Romance', platform: 'Blippo',             productType: 'Hair Accessories',  searchTemplate: B.hair,                         commission: '8-20%' },

  // ── FANTASY ─────────────────────────────────────────────────────────────────
  { genre: 'Fantasy', platform: 'Amazon',             productType: 'Manga Volumes',     searchTemplate: '{{title}} manga',              commission: '4-10%' },
  { genre: 'Fantasy', platform: 'Amazon',             productType: 'Art Book',          searchTemplate: '{{title}} art book',           commission: '4-10%' },
  { genre: 'Fantasy', platform: 'Amazon',             productType: 'Posters & Prints',  searchTemplate: '{{title}} poster',             commission: '4-10%' },
  { genre: 'Fantasy', platform: 'Etsy',               productType: 'Cosplay & Costumes',searchTemplate: 'fantasy anime cosplay costume', commission: '4-8%'  },
  { genre: 'Fantasy', platform: 'Blippo',             productType: 'Figures & Dolls',   searchTemplate: B.figures,                      commission: '8-20%' },
  { genre: 'Fantasy', platform: 'Blippo',             productType: 'Collectibles',      searchTemplate: B.collectibles,                 commission: '8-20%' },
  { genre: 'Fantasy', platform: 'Blippo',             productType: 'Blind Boxes',       searchTemplate: B.blindboxes,                   commission: '8-20%' },
  { genre: 'Fantasy', platform: 'Blippo',             productType: 'Kawaii Accessories',searchTemplate: B.accessories,                  commission: '8-20%' },

  // ── SLICE OF LIFE ────────────────────────────────────────────────────────────
  { genre: 'Slice of Life', platform: 'Amazon',       productType: 'Manga Volumes',     searchTemplate: '{{title}} manga',   commission: '4-10%' },
  { genre: 'Slice of Life', platform: 'Amazon',       productType: 'Posters & Prints',  searchTemplate: '{{title}} poster',  commission: '4-10%' },
  { genre: 'Slice of Life', platform: 'Blippo',       productType: 'Japanese Snacks',   searchTemplate: B.snacks,            commission: '8-20%' },
  { genre: 'Slice of Life', platform: 'Blippo',       productType: 'Anime Snacks',      searchTemplate: B.animeSnacks,       commission: '8-20%' },
  { genre: 'Slice of Life', platform: 'Blippo',       productType: 'DIY Candy Kits',    searchTemplate: B.diyCandy,          commission: '8-20%' },
  { genre: 'Slice of Life', platform: 'Blippo',       productType: 'Stationery',        searchTemplate: B.stationery,        commission: '8-20%' },
  { genre: 'Slice of Life', platform: 'Blippo',       productType: 'Notebooks',         searchTemplate: B.notebooks,         commission: '8-20%' },
  { genre: 'Slice of Life', platform: 'Blippo',       productType: 'Plush Toys',        searchTemplate: B.plushies,          commission: '8-20%' },
  { genre: 'Slice of Life', platform: 'Blippo',       productType: 'Home Products',     searchTemplate: B.home,              commission: '8-20%' },

  // ── SPORTS ──────────────────────────────────────────────────────────────────
  { genre: 'Sports', platform: 'Amazon',              productType: 'Manga Volumes',     searchTemplate: '{{title}} manga',   commission: '4-10%' },
  { genre: 'Sports', platform: 'Amazon',              productType: 'Posters & Prints',  searchTemplate: '{{title}} poster',  commission: '4-10%' },
  { genre: 'Sports', platform: 'Entertainment Earth', productType: 'Figures',           searchTemplate: '{{title}} figure',  commission: '7-10%' },
  { genre: 'Sports', platform: 'Blippo',              productType: 'Collectibles',      searchTemplate: B.collectibles,      commission: '8-20%' },
  { genre: 'Sports', platform: 'Blippo',              productType: 'Kawaii Socks',      searchTemplate: B.socks,             commission: '8-20%' },
  { genre: 'Sports', platform: 'Blippo',              productType: 'Keychains & Charms',searchTemplate: B.keychains,         commission: '8-20%' },

  // ── HORROR ──────────────────────────────────────────────────────────────────
  { genre: 'Horror', platform: 'Amazon',              productType: 'Manga Volumes',     searchTemplate: '{{title}} manga',         commission: '4-10%' },
  { genre: 'Horror', platform: 'Entertainment Earth', productType: 'Horror Figures',    searchTemplate: '{{title}} horror figure', commission: '7-10%' },
  { genre: 'Horror', platform: 'Amazon',              productType: 'Posters & Prints',  searchTemplate: '{{title}} poster',        commission: '4-10%' },
  { genre: 'Horror', platform: 'Blippo',              productType: 'Blind Boxes',       searchTemplate: B.blindboxes,              commission: '8-20%' },
  { genre: 'Horror', platform: 'Blippo',              productType: 'Squishies',         searchTemplate: B.squishies,               commission: '8-20%' },
  { genre: 'Horror', platform: 'Blippo',              productType: 'Gachapon Capsules', searchTemplate: B.gachapon,                commission: '8-20%' },

  // ── COMEDY ──────────────────────────────────────────────────────────────────
  { genre: 'Comedy', platform: 'Amazon',              productType: 'Manga Volumes',     searchTemplate: '{{title}} manga',  commission: '4-10%' },
  { genre: 'Comedy', platform: 'Amazon',              productType: 'Posters & Prints',  searchTemplate: '{{title}} poster', commission: '4-10%' },
  { genre: 'Comedy', platform: 'Blippo',              productType: 'Plush Toys',        searchTemplate: B.plushies,         commission: '8-20%' },
  { genre: 'Comedy', platform: 'Blippo',              productType: 'Squishies',         searchTemplate: B.squishies,        commission: '8-20%' },
  { genre: 'Comedy', platform: 'Blippo',              productType: 'DIY Candy Kits',    searchTemplate: B.diyCandy,         commission: '8-20%' },
  { genre: 'Comedy', platform: 'Blippo',              productType: 'Lucky Bags',        searchTemplate: B.lucky,            commission: '8-20%' },
  { genre: 'Comedy', platform: 'Blippo',              productType: 'Gachapon Capsules', searchTemplate: B.gachapon,         commission: '8-20%' },
]

export function generateAffiliateUrl(platform: string, searchQuery: string): string {
  const amazonTag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG ?? 'compicfy-20'

  // Blippo — searchQuery is already the full category URL
  if (platform === 'Blippo') return searchQuery

  const query = encodeURIComponent(searchQuery)

  switch (platform) {
    case 'Amazon':
      // Correct Amazon affiliate search URL format
      return `https://www.amazon.com/s/?url=search-alias%3Daps&field-keywords=${query}&tag=${amazonTag}`
    case 'Entertainment Earth':
      return `https://www.entertainmentearth.com/s/?query1=${query}`
    case 'Etsy':
      return `https://www.etsy.com/search?q=${query}`
    case 'eBay':
      return `https://www.ebay.com/sch/i.html?_nkw=${query}`
    default:
      return `https://www.google.com/search?q=${query}`
  }
}