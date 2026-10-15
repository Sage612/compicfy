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

export const TYPE_META: Record<(typeof COMIC_TYPES)[number]['value'], {
  label:       string
  badge:       string  // compact badge: bg/text/border, used on ComicCard/FeedCard chips
  bar:         string  // solid accent bar color, used on ComicCard's left edge
  glow:        string  // hover shadow glow utility, used on ComicCard (e.g. 'hover:shadow-rose-500/10')
  detailGlow:  string  // plain background-color glow, used on comic detail page's blurred orbs (e.g. 'bg-rose-500/20')
  gradient:    string  // hero gradient, used on comic detail page background/cover glow
  border:      string  // accent border, used on comic detail page panels
}> = {
  manga: {
    label: 'Manga',
    badge: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    bar:   'bg-rose-500',
    glow:  'hover:shadow-rose-500/10',
    detailGlow: 'bg-rose-500/20',
    gradient: 'from-rose-500 to-pink-600',
    border:   'border-rose-500/30',
  },
  manhwa: {
    label: 'Manhwa',
    badge: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    bar:   'bg-teal-500',
    glow:  'hover:shadow-teal-500/10',
    detailGlow: 'bg-teal-500/20',
    gradient: 'from-teal-500 to-cyan-600',
    border:   'border-teal-500/30',
  },
  manhua: {
    label: 'Manhua',
    badge: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    bar:   'bg-amber-500',
    glow:  'hover:shadow-amber-500/10',
    detailGlow: 'bg-amber-500/20',
    gradient: 'from-amber-500 to-orange-500',
    border:   'border-amber-500/30',
  },
  webtoon: {
    label: 'Webtoon',
    badge: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    bar:   'bg-teal-500',
    glow:  'hover:shadow-teal-500/10',
    detailGlow: 'bg-teal-500/20',
    gradient: 'from-teal-500 to-cyan-600',
    border:   'border-teal-500/30',
  },
  comic: {
    label: 'Comic',
    badge: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    bar:   'bg-blue-500',
    glow:  'hover:shadow-blue-500/10',
    detailGlow: 'bg-blue-500/20',
    gradient: 'from-blue-500 to-indigo-600',
    border:   'border-blue-500/30',
  },
  other: {
    label: 'Other',
    badge: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
    bar:   'bg-zinc-500',
    glow:  'hover:shadow-zinc-500/10',
    detailGlow: 'bg-primary/15',
    gradient: 'from-primary to-rose-600',
    border:   'border-primary/20',
  },
}

export const DEFAULT_TYPE_META = TYPE_META.other

export const STATUS_META: Record<(typeof STATUSES)[number]['value'], {
  label:  string
  color:  string  // text color only, used on ComicCard's compact status line
  badge:  string  // full badge classes (bg/text/border), used on comic detail page pills
}> = {
  ongoing: {
    label: 'Ongoing',
    color: 'text-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  completed: {
    label: 'Complete',
    color: 'text-sky-400',
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  hiatus: {
    label: 'Hiatus',
    color: 'text-amber-400',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  cancelled: {
    label: 'Dropped',
    color: 'text-rose-400',
    badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  },
}

export function resolveStatusMeta(
  status: string,
  translationStatus?: string | null,
): { label: string; color: string; badge: string } {
  if (translationStatus === 'translation_ongoing') {
    return {
      label: 'Catching Up',
      color: 'text-amber-400',
      badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    }
  }
  return STATUS_META[status as (typeof STATUSES)[number]['value']] ?? {
    label: status,
    color: 'text-muted-foreground',
    badge: 'bg-muted text-muted-foreground border-border',
  }
}

export const TRACKING_STATUSES = [
  { value: 'reading',      label: 'Reading'      },
  { value: 'plan_to_read', label: 'Plan to Read' },
  { value: 'completed',    label: 'Completed'    },
  { value: 'on_hold',      label: 'On Hold'      },
  { value: 'dropped',      label: 'Dropped'      },
  { value: 'marinating',   label: 'Marinating'   },
] as const

export type TrackingStatusValue = (typeof TRACKING_STATUSES)[number]['value']

export interface SubStatusPreset {
  value: string
  label: string
}

export const TRACKING_STATUS_META: Record<TrackingStatusValue, {
  label: string
  emoji: string
  dot:   string  // solid dot indicator color, used by ChapterUpdater/ReadingListDetail's plain-text status rows
  badge: string  // full bg/text/border classes, used by ReadingProgressButton's trigger + PublicListDetailClient pills
  color: string  // text-only color, for spots that just need a text class
  subStatusPresets: SubStatusPreset[]
}> = {
  reading: {
    label: 'Reading',
    emoji: '📖',
    dot:   'bg-blue-500',
    badge: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
    color: 'text-blue-600',
    subStatusPresets: [
      { value: 'binging', label: 'Binging it' },
      { value: 'weekly',  label: 'Weekly, waiting on releases' },
      { value: 'spite',   label: 'Spite read 😤' },
    ],
  },
  plan_to_read: {
    label: 'Plan to Read',
    emoji: '📌',
    dot:   'bg-violet-500',
    badge: 'text-violet-600 bg-violet-500/10 border-violet-500/20',
    color: 'text-violet-600',
    subStatusPresets: [
      { value: 'hyped',   label: 'Next up / hyped' },
      { value: 'someday', label: 'Someday, maybe' },
    ],
  },
  completed: {
    label: 'Completed',
    emoji: '✅',
    dot:   'bg-emerald-500',
    badge: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    color: 'text-emerald-600',
    subStatusPresets: [
      { value: 'would_reread', label: 'Would reread' },
      { value: 'one_and_done', label: 'One and done' },
    ],
  },
  on_hold: {
    label: 'On Hold',
    emoji: '⏸️',
    dot:   'bg-yellow-500',
    badge: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20',
    color: 'text-yellow-600',
    subStatusPresets: [
      { value: 'waiting_releases', label: 'Waiting for new chapters' },
      { value: 'losing_interest',  label: 'Losing interest, might drop' },
    ],
  },
  dropped: {
    label: 'Dropped',
    emoji: '🗑️',
    dot:   'bg-red-500',
    badge: 'text-red-600 bg-red-500/10 border-red-500/20',
    color: 'text-red-600',
    // The first five are the "why did I stop?" reasons the comic page asks for
    // when you drop something (they double as Drop Graveyard causes of death).
    subStatusPresets: [
      { value: 'got_boring',   label: 'Got boring' },
      { value: 'art_dropped',  label: 'Art took a dive' },
      { value: 'too_slow',     label: 'Too slow / too many breaks' },
      { value: 'lost_source',  label: 'Lost my source' },
      { value: 'not_for_me',   label: 'Not for me' },
      { value: 'might_retry',  label: 'Might retry someday' },
      { value: 'done',         label: 'Done with it' },
    ],
  },
  marinating: {
    label: 'Marinating',
    emoji: '🫙',
    dot:   'bg-amber-500',
    badge: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
    color: 'text-amber-600',
    subStatusPresets: [
      { value: 'building_chapters', label: 'Building up chapters first' },
      { value: 'waiting_reception', label: 'Waiting to see reception' },
    ],
  },
}

export const TRACKING_SUB_STATUS_CUSTOM_MAX_LENGTH = 60

export function resolveSubStatusLabel(
  status: string,
  subStatus: string | null | undefined,
): string | null {
  if (!subStatus) return null
  const meta = TRACKING_STATUS_META[status as TrackingStatusValue]
  const preset = meta?.subStatusPresets.find(p => p.value === subStatus)
  return preset ? preset.label : subStatus
}

/** True if the given sub_status value is one of the status's defined presets (vs. custom text). */
export function isPresetSubStatus(status: string, subStatus: string): boolean {
  const meta = TRACKING_STATUS_META[status as TrackingStatusValue]
  return !!meta?.subStatusPresets.some(p => p.value === subStatus)
}

// ── Item #29 "Let It Bake" ─────────────────────────────────────────────────
export const BAKE_MIN_TARGET_CHAPTERS = 1
export const BAKE_MAX_TARGET_CHAPTERS = 500

export const BAKE_COUNTING_MODES = [
  { value: 'from_now',  label: 'Only new chapters',   description: 'Wait for fresh releases from now on' },
  { value: 'from_read', label: 'Include my backlog',  description: 'Count from where I last read' },
] as const

export type BakeCountingMode = (typeof BAKE_COUNTING_MODES)[number]['value']

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

// ── Submission limits ─────────────────────────────────────────────────────
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
  follows:                   50,
  bakes:                     3,   // item #29 "Let It Bake" — max active bakes at once, Free tier
} as const

export const GENRE_MOODS: Record<(typeof GENRES)[number], { mood: string; emoji: string }> = {
 'Action':         { mood: 'I Need Something Addictive',  emoji: '⚔️' },
  'Adventure':      { mood: 'Take Me On A Journey',         emoji: '🗺️' },
  'Comedy':         { mood: 'I Just Want To Laugh',         emoji: '😂' },
  'Drama':          { mood: 'Something That Hits Deep',     emoji: '🎭' },
  'Fantasy':        { mood: 'Take Me Somewhere Else',       emoji: '✨' },
  'Horror':         { mood: 'I Want To Be Unsettled',       emoji: '👻' },
  'Mystery':        { mood: "Can't Figure Out What's Real", emoji: '🔍' },
  'Romance':        { mood: 'Give Me Butterflies',          emoji: '🌸' },
  'Sci-Fi':         { mood: 'Big Brain, Big World',         emoji: '🚀' },
  'Slice of Life':  { mood: 'Cozy, Slow, No Stress',        emoji: '🍵' },
  'Sports':         { mood: 'Hype Me Up',                   emoji: '⚡' },
  'Supernatural':   { mood: 'Something Otherworldly',       emoji: '🌙' },
  'Thriller':       { mood: 'Keep Me On Edge',              emoji: '😱' },
  'Isekai':         { mood: 'Drop Me In Another World',     emoji: '🌀' },
  'Martial Arts':   { mood: 'Show Me Some Skill',           emoji: '🥋' },
  'School Life':    { mood: 'Take Me Back To School',       emoji: '🎒' },
  'Historical':     { mood: 'Show Me The Past',             emoji: '🏛️' },
  'Psychological':  { mood: 'Mess With My Head',            emoji: '🧠' },
  'Shounen':        { mood: 'Fuel My Fire',                 emoji: '🔥' },
  'Shoujo':         { mood: 'Sweep Me Off My Feet',         emoji: '💮' },
  'Seinen':         { mood: 'Something With An Edge',       emoji: '🗡️' },
  'Josei':          { mood: 'Something More Grown-Up',      emoji: '🍷' },
  'Yuri':           { mood: 'Girls Falling For Girls',      emoji: '💗' },
  'Yaoi':           { mood: 'Boys Falling For Boys',        emoji: '💜' },
  'Mecha':          { mood: 'Give Me Robots And Stakes',    emoji: '🤖' },
}

// Slug used for anchor-scroll targets, e.g. #genre-slice-of-life
export function genreSlug(genre: string): string {
  return genre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export const HOME_MOOD_GENRES: (typeof GENRES)[number][] = [
  'Action', 'Romance', 'Fantasy', 'Comedy', 'Sci-Fi',
  'Drama', 'Horror', 'Sports', 'Slice of Life', 'Mystery',
]