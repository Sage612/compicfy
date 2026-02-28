export const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
  'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life',
  'Sports', 'Supernatural', 'Thriller', 'Historical', 'Mecha',
] as const

export const PLATFORMS = [
  'Webtoon', 'Tapas', 'MangaDex', 'Viz Media', 'Crunchyroll Manga',
  'Shonen Jump', 'ComiXology', 'Lezhin', 'Pocket Comics', 'Other',
] as const

export const COMIC_TYPES = [
  { value: 'manga', label: 'Manga' },
  { value: 'manhwa', label: 'Manhwa' },
  { value: 'manhua', label: 'Manhua' },
  { value: 'webtoon', label: 'Webtoon' },
  { value: 'comic', label: 'Comic' },
  { value: 'other', label: 'Other' },
] as const

export const STATUSES = [
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'hiatus', label: 'On Hiatus' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

export const CONTENT_RATINGS = [
  { value: 'all', label: 'All Ages' },
  { value: 'teen', label: 'Teen (13+)' },
  { value: 'mature', label: 'Mature (17+)' },
  { value: 'adult', label: 'Adult (18+)' },
] as const

export const ITEMS_PER_PAGE = 20
export const CAROUSEL_AUTOPLAY_DELAY = 4000
export const MAX_GENRES_PER_COMIC = 5
export const MAX_FILE_SIZE_MB = 5
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']