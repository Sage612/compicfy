export const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
  'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life',
  'Sports', 'Supernatural', 'Thriller', 'Isekai', 'Martial Arts',
  'School Life', 'Historical', 'Psychological', 'Shounen', 'Shoujo',
  'Seinen', 'Josei', 'Yuri', 'Yaoi', 'Mecha',
] as const

export const PLATFORMS = [
  'Webtoon', 'Tapas', 'Tappytoon', 'Viz Media', 'Crunchyroll Manga',
  'Manta', 'Webcomics', 'Lezhin', 'Mangatoon', 'WebNovel', 'Pocket Comics',
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

export const GENRE_MOODS: Record<(typeof GENRES)[number], { mood: string; emoji: string }> = {
  'Action':         { mood: 'I need something addictive',  emoji: '⚔️' },
  'Adventure':      { mood: 'Take me on a journey',         emoji: '🗺️' },
  'Comedy':         { mood: 'I just want to laugh',         emoji: '😂' },
  'Drama':          { mood: 'Something that hits deep',     emoji: '🎭' },
  'Fantasy':        { mood: 'Take me somewhere else',       emoji: '✨' },
  'Horror':         { mood: 'I want to be unsettled',       emoji: '👻' },
  'Mystery':        { mood: "Can't figure out what's real", emoji: '🔍' },
  'Romance':        { mood: 'Give me butterflies',          emoji: '🌸' },
  'Sci-Fi':         { mood: 'Big brain, big world',         emoji: '🚀' },
  'Slice of Life':  { mood: 'Cozy, slow, no stress',        emoji: '🍵' },
  'Sports':         { mood: 'Hype me up',                   emoji: '⚡' },
  'Supernatural':   { mood: 'Something otherworldly',       emoji: '🌙' },
  'Thriller':       { mood: 'Keep me on edge',              emoji: '😱' },
  'Isekai':         { mood: 'Drop me in another world',     emoji: '🌀' },
  'Martial Arts':   { mood: 'Show me some skill',           emoji: '🥋' },
  'School Life':    { mood: 'Take me back to school',       emoji: '🎒' },
  'Historical':     { mood: 'Show me the past',             emoji: '🏛️' },
  'Psychological':  { mood: 'Mess with my head',            emoji: '🧠' },
  'Shounen':        { mood: 'Fuel my fire',                 emoji: '🔥' },
  'Shoujo':         { mood: 'Sweep me off my feet',         emoji: '💮' },
  'Seinen':         { mood: 'Something with an edge',       emoji: '🗡️' },
  'Josei':          { mood: 'Something more grown-up',      emoji: '💐' },
  'Yuri':           { mood: 'Girls falling for girls',      emoji: '💗' },
  'Yaoi':           { mood: 'Boys falling for boys',        emoji: '💜' },
  'Mecha':          { mood: 'Give me robots and stakes',    emoji: '🤖' },
}

// Slug used for anchor-scroll targets, e.g. #genre-slice-of-life
export function genreSlug(genre: string): string {
  return genre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export const HOME_MOOD_GENRES: (typeof GENRES)[number][] = [
  'Action', 'Romance', 'Fantasy', 'Comedy', 'Sci-Fi',
  'Drama', 'Horror', 'Sports', 'Slice of Life', 'Mystery',
]