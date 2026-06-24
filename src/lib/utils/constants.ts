export const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
  'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life',
  'Sports', 'Supernatural', 'Thriller', 'Isekai', 'Martial Arts',
  'School Life', 'Historical', 'Psychological', 'Shounen', 'Shoujo',
  'Seinen', 'Josei', 'Yuri', 'Yaoi', 'Mecha',
] as const

export const PLATFORMS = [
  'Webtoon', 'Tapas', 'Tappytoon', 'Viz Media', 'Crunchyroll Manga',
  'Manta', 'Webcomics', 'Lezhin', 'Mangatoon', 'Pocket Comics',
  'Toomics', 'Toptoon', 'DAYcomics', 'Mangaplus', 'INKR',
] as const

export const COMIC_TYPES = [
  { value: 'manga',   label: 'Manga'   },
  { value: 'manhwa',  label: 'Manhwa'  },
  { value: 'manhua',  label: 'Manhua'  },
  { value: 'webtoon', label: 'Webtoon' },
  { value: 'comic',   label: 'Comic'   },
  { value: 'other',   label: 'Other'   },
] as const

export const STATUSES = [
  { value: 'ongoing',   label: 'Ongoing'   },
  { value: 'completed', label: 'Completed' },
  { value: 'hiatus',    label: 'On Hiatus' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

export const CONTENT_RATINGS = [
  { value: 'all_ages', label: 'All Ages'     },
  { value: 'teen',     label: 'Teen (13+)'   },
  { value: 'mature',   label: 'Mature (17+)' },
  { value: 'adult',    label: 'Adult (18+)'  },
] as const

export const ITEMS_PER_PAGE          = 20
export const CAROUSEL_AUTOPLAY_DELAY = 4000
export const MAX_GENRES_PER_COMIC    = 5
export const MAX_FILE_SIZE_MB        = 5
export const ACCEPTED_IMAGE_TYPES    = ['image/jpeg', 'image/png', 'image/webp']

// ── Submission limits ────────────────────────────────────────────────────────
export const DAILY_LIMITS = {
  free:    2,   // free readers + free creators
  pro:     10,  // pro readers + pro creators (can raise to 15 later)
  admin:   Infinity,
} as const

export const MONTHLY_LIMITS = {
  free:    50,
  pro:     Infinity,
} as const

export const GLOBAL_DAILY_CAP        = 100  // raise to 150 after testing
export const GLOBAL_PEAK_ALERT       = 80   // trigger soft alert before hard cap

export const FREE_LIMITS = {
  recommendations_per_month: 50,
  saves:                     100,
  lists:                     5,
  collections:               3,
} as const