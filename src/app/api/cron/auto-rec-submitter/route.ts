import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Ratio config ──────────────────────────────────────────────────
const BATCH_SIZE   = 20
const MANHWA_COUNT = 10  // 50%
const MANHUA_COUNT = 6   // 30%
const MANGA_COUNT  = 4   // 20%

// ── Smart switching config ────────────────────────────────────────
// MU → MangaBaka → MAL → back to MU
const MU_ZERO_THRESHOLD = 3
const MB_RUN_LIMIT      = 5   // MangaBaka runs before switching to MAL
const MAL_RUN_LIMIT     = 5   // MAL runs before back to MU

const SORT_ORDERS = ['rating', 'subscribers', 'year', 'votes'] as const
type SortOrder = typeof SORT_ORDERS[number]

function resolveSortOrder(page: number): SortOrder {
  const index = Math.floor((page - 1) / 10) % SORT_ORDERS.length
  return SORT_ORDERS[index]
}

function resolveLocalPage(page: number): number {
  return ((page - 1) % 10) + 1
}

// ── Logging helper ────────────────────────────────────────────────
interface SubmissionLog {
  title: string
  type: string
  status: 'submitted' | 'skipped' | 'failed'
  source: string
  genres: string[]
  platforms: string[]
  author?: string | null
  artist?: string | null
  chapters?: number | null
  year?: number | null
  reason?: string
  error?: string
  external_ids?: {
    mangaupdates_id?: string | null
    mangabaka_id?: string | null
    mangadex_id?: string | null
    anilist_id?: string | null
    mal_id?: string | null
  }
  timestamp: string
}

async function logSubmission(
  supabase: any,
  log: SubmissionLog
) {
  try {
    await supabase.from('activity_logs').insert({
      user_id: null,
      action: 'auto_rec_submit',
      entity_type: 'recommendations',
      details: {
        title: log.title,
        type: log.type,
        status: log.status,
        source: log.source,
        genres: log.genres,
        platforms: log.platforms,
        author: log.author,
        artist: log.artist,
        chapters: log.chapters,
        year: log.year,
        reason: log.reason,
        error: log.error,
        external_ids: log.external_ids,
        timestamp: log.timestamp,
      },
    })
  } catch (err) {
    console.error('Failed to log submission:', err)
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mapStatus(raw: string): 'ongoing' | 'completed' | 'hiatus' | 'cancelled' {
  const s = raw.toLowerCase()
  if (s.includes('complet') || s.includes('finish'))    return 'completed'
  if (s.includes('hiatus'))                             return 'hiatus'
  if (s.includes('cancel') || s.includes('discontinu')) return 'cancelled'
  return 'ongoing'
}

function mapAniListFormat(format: string): 'manga' | 'manhwa' | 'manhua' | 'webtoon' | 'comic' | 'other' {
  const map: Record<string, 'manga' | 'manhwa' | 'manhua' | 'webtoon' | 'comic' | 'other'> = {
    MANGA: 'manga', MANHWA: 'manhwa', MANHUA: 'manhua', ONE_SHOT: 'manga', NOVEL: 'other',
  }
  return map[format] ?? 'manga'
}

function mapAniListStatus(status: string): 'ongoing' | 'completed' | 'hiatus' | 'cancelled' {
  const map: Record<string, 'ongoing' | 'completed' | 'hiatus' | 'cancelled'> = {
    FINISHED: 'completed', RELEASING: 'ongoing',
    NOT_YET_RELEASED: 'ongoing', CANCELLED: 'cancelled', HIATUS: 'hiatus',
  }
  return map[status] ?? 'ongoing'
}

function sanitizeGenres(genres: string[]): string[] {
  return genres.map((g) => g.trim()).filter(Boolean).slice(0, 5)
}

// ── Platform extraction helpers ───────────────────────────────────

function extractPlatformsFromMU(detail: any, record: any): string[] {
  const platforms = new Set<string>()

  // MangaUpdates stores platforms in associated field
  const associated = detail?.associated ?? record?.associated ?? []
  associated.forEach((a: any) => {
    const relType = a.relation_type?.toLowerCase() ?? ''
    const name = a.title?.toLowerCase() ?? ''

    // Extract from relation_type
    if (relType.includes('official')) {
      if (relType.includes('english')) {
        if (name.includes('viz') || relType.includes('viz')) platforms.add('Viz Media')
        if (name.includes('mangaplus') || relType.includes('mangaplus')) platforms.add('Mangaplus')
        if (name.includes('webtoon') || relType.includes('webtoon')) platforms.add('Webtoon')
        if (name.includes('tapas') || relType.includes('tapas')) platforms.add('Tapas')
        if (name.includes('tappytoon')) platforms.add('Tappytoon')
        if (name.includes('inkr')) platforms.add('INKR')
      }
    }
  })

  // MangaUpdates may also have publication details
  const pubEnglish = detail?.publication_html?.english ?? ''
  if (pubEnglish) {
    if (pubEnglish.includes('Viz')) platforms.add('Viz Media')
    if (pubEnglish.includes('MangaPlus')) platforms.add('Mangaplus')
    if (pubEnglish.includes('Webtoon')) platforms.add('Webtoon')
  }

  return Array.from(platforms).slice(0, 5)
}

function extractPlatformsFromMangaBaka(detail: any): string[] {
  const platforms = new Set<string>()

  // MangaBaka may have source or platform field
  const source = detail?.source ?? detail?.source_name ?? ''
  if (source) {
    const s = source.toLowerCase()
    if (s.includes('webtoon')) platforms.add('Webtoon')
    if (s.includes('tapas')) platforms.add('Tapas')
    if (s.includes('tappytoon')) platforms.add('Tappytoon')
    if (s.includes('mangaplus')) platforms.add('Mangaplus')
    if (s.includes('inkr')) platforms.add('INKR')
  }

  // MangaBaka may have external_links
  const links = detail?.external_links ?? detail?.links ?? []
  if (Array.isArray(links)) {
    links.forEach((link: any) => {
      const url = (link.url ?? link.link ?? '').toLowerCase()
      if (url.includes('webtoon.com')) platforms.add('Webtoon')
      if (url.includes('tapas.io')) platforms.add('Tapas')
      if (url.includes('tappytoon')) platforms.add('Tappytoon')
      if (url.includes('mangaplus')) platforms.add('Mangaplus')
      if (url.includes('viz.com') || url.includes('vizsignature')) platforms.add('Viz Media')
    })
  }

  return Array.from(platforms).slice(0, 5)
}

function extractPlatformsFromMangaDex(detail: any): string[] {
  const platforms = new Set<string>()

  // MangaDex stores links in relationships or attributes
  const links = detail?.attributes?.links ?? detail?.links ?? {}
  
  if (typeof links === 'object') {
    Object.entries(links).forEach(([key, value]: [string, any]) => {
      const url = (value ?? '').toString().toLowerCase()
      if (url.includes('webtoon')) platforms.add('Webtoon')
      if (url.includes('tapas')) platforms.add('Tapas')
      if (url.includes('viz.com') || url.includes('vizsignature')) platforms.add('Viz Media')
      if (url.includes('mangaplus')) platforms.add('Mangaplus')
    })
  }

  return Array.from(platforms).slice(0, 5)
}

function extractPlatformsFromAniList(item: any): string[] {
  const platforms = new Set<string>()

  // AniList stores external links
  const externalLinks = item.externalLinks ?? []
  externalLinks.forEach((link: any) => {
    const site = (link.site ?? '').toLowerCase()
    const url = (link.url ?? '').toLowerCase()

    if (site.includes('official') || site.includes('web') || site.includes('eng')) {
      if (url.includes('webtoon')) platforms.add('Webtoon')
      if (url.includes('tapas')) platforms.add('Tapas')
      if (url.includes('viz.com')) platforms.add('Viz Media')
      if (url.includes('mangaplus')) platforms.add('Mangaplus')
    }
  })

  return Array.from(platforms).slice(0, 5)
}

function extractPlatformsFromJikan(item: any): string[] {
  const platforms = new Set<string>()

  // Jikan stores external links
  const externalLinks = item.external ?? []
  externalLinks.forEach((link: any) => {
    const url = (link.url ?? '').toLowerCase()

    if (url.includes('webtoon')) platforms.add('Webtoon')
    if (url.includes('tapas')) platforms.add('Tapas')
    if (url.includes('viz.com')) platforms.add('Viz Media')
    if (url.includes('mangaplus')) platforms.add('Mangaplus')
  })

  return Array.from(platforms).slice(0, 5)
}

// ── Normalised shape ──────────────────────────────────────────────

interface SeriesData {
  title:              string
  alternative_titles: string[]
  description:        string
  type:               'manga' | 'manhwa' | 'manhua' | 'webtoon' | 'comic' | 'other'
  status:             'ongoing' | 'completed' | 'hiatus' | 'cancelled'
  genres:             string[]
  cover_url:          string | null
  author:             string | null
  artist:             string | null
  year_released:      number | null
  chapter_count:      number | null
  official_platforms: string[]
  mangaupdates_id:    string | null
  mangabaka_id:       string | null
  mangadex_id:        string | null
  anilist_id:         string | null
  mal_id:             string | null
  source:             'mangaupdates' | 'mangabaka' | 'mangadex' | 'anilist' | 'jikan'
}

// ── Per-type state stored in activity_logs ────────────────────────
interface TypeState {
  page:           number
  mu_zero_streak: number
  source_mode:    'mu' | 'mb' | 'mal'
  mb_run_count:   number
  mal_run_count:  number
}

function defaultTypeState(): TypeState {
  return { page: 0, mu_zero_streak: 0, source_mode: 'mu', mb_run_count: 0, mal_run_count: 0 }
}

// ── MangaUpdates fetcher ──────────────────────────────────────────

async function fetchMangaUpdatesByType(
  limit:  number,
  page:   number,
  muType: 'manhwa' | 'manhua' | 'manga'
): Promise<SeriesData[]> {
  try {
    const sortOrder = resolveSortOrder(page)
    const localPage = resolveLocalPage(page)

    const res = await fetch('https://api.mangaupdates.com/v1/series/search', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderby: sortOrder,
        asc:     'desc',
        perpage: limit,
        page:    localPage,
        type:    muType,
        filter:  'some_releases',
      }),
      next: { revalidate: 0 },
    })
    if (!res.ok) return []

    const data  = await res.json()
    const items = data.results ?? []

    const detailed = await Promise.allSettled(
      items.map(async (item: any) => {
        const record   = item.record ?? {}
        const seriesId = record.series_id
        if (!seriesId) return null
        try {
          const detailRes = await fetch(
            `https://api.mangaupdates.com/v1/series/${seriesId}`,
            { next: { revalidate: 0 } }
          )
          const detail = detailRes.ok ? await detailRes.json() : null
          return { record, detail, seriesId }
        } catch {
          return { record, detail: null, seriesId }
        }
      })
    )

    return detailed
      .filter((r) => r.status === 'fulfilled' && r.value)
      .map((r) => {
        const { record, detail, seriesId } = (r as PromiseFulfilledResult<any>).value

        const allCredits  = detail?.authors ?? record.authors ?? []
        const authors     = allCredits.filter((a: any) => a.type?.toLowerCase() === 'author').map((a: any) => a.name ?? '')
        const artists     = allCredits.filter((a: any) => a.type?.toLowerCase() === 'artist').map((a: any) => a.name ?? '')
        const firstCredit = allCredits[0]?.name ?? null

        const genreList    = (detail?.genres    ?? record.genres    ?? []).map((g: any) => g.genre ?? g)
        const categoryList = (detail?.categories ?? record.categories ?? []).slice(0, 3).map((c: any) => c.category ?? c)
        const rawDesc      = detail?.description ?? record.description ?? ''
        const cleanDesc    = rawDesc.replace(/<[^>]*>/g, '').trim().slice(0, 2000)

        const altTitles: string[] = []
        ;(detail?.associated ?? record.associated ?? []).forEach((a: any) => {
          if (a.title) altTitles.push(a.title)
        })

        const coverUrl =
          detail?.image?.url?.original ??
          detail?.image?.url?.thumb    ??
          record.image?.url?.original  ??
          record.image?.url?.thumb     ??
          null

        const year = detail?.year
          ? parseInt(detail.year)
          : record.year ? parseInt(record.year) : null

        // Extract platforms from MangaUpdates
        const platforms = extractPlatformsFromMU(detail, record)

        return {
          title:              detail?.title ?? record.title ?? '',
          alternative_titles: altTitles.slice(0, 5),
          description:        cleanDesc || 'No description available.',
          type:               muType,
          status:             mapStatus(detail?.status ?? record.status ?? ''),
          genres:             sanitizeGenres([...new Set([...genreList, ...categoryList])]),
          cover_url:          coverUrl,
          author:             authors[0] ?? firstCredit,
          artist:             artists[0] ?? authors[0] ?? firstCredit,
          year_released:      year,
          chapter_count:      detail?.latest_chapter ?? record.latest_chapter ?? null,
          official_platforms: platforms.length > 0 ? platforms : ['INKR'],
          mangaupdates_id:    seriesId ? String(seriesId) : null,
          mangabaka_id:       null,
          mangadex_id:        null,
          anilist_id:         null,
          mal_id:             null,
          source:             'mangaupdates' as const,
        } satisfies SeriesData
      })
      .filter((s) => s.title.length > 0)
  } catch {
    return []
  }
}

// ── MangaBaka fetcher ────────────────────────────────────────────

async function fetchMangaBakaByType(
  limit:  number,
  page:   number,
  mbType: 'manhwa' | 'manhua' | 'manga'
): Promise<SeriesData[]> {
  try {
    // MangaBaka API structure
    const res = await fetch(
      `https://api.mangabaka.dev/series?type=${mbType}&sort=trending&page=${page}&limit=${limit}`,
      { next: { revalidate: 0 } }
    )
    if (!res.ok) return []

    const data = await res.json()
    const items = data.data ?? data.results ?? []

    return items
      .map((item: any): SeriesData | null => {
        const id = item.id ?? item.series_id
        if (!id) return null

        const title = item.title ?? item.name ?? ''
        if (!title) return null

        const description = item.description ?? item.synopsis ?? ''
        const cleanDesc = description.replace(/<[^>]*>/g, '').trim().slice(0, 2000) || 'No description available.'

        const genres = sanitizeGenres((item.genres ?? []).map((g: any) => g.name ?? g))
        const altTitles = (item.alt_titles ?? item.alternative_titles ?? []).filter((t: any) => t && t !== title)

        // Extract platforms from MangaBaka
        const platforms = extractPlatformsFromMangaBaka(item)

        return {
          title,
          alternative_titles: altTitles.slice(0, 5),
          description: cleanDesc,
          type: mbType,
          status: mapStatus(item.status ?? 'ongoing'),
          genres: genres.length > 0 ? genres : ['Action'],
          cover_url: item.cover_url ?? item.image_url ?? null,
          author: item.author ?? null,
          artist: item.artist ?? null,
          year_released: item.year ?? item.year_published ?? null,
          chapter_count: item.chapters ?? item.total_chapters ?? null,
          official_platforms: platforms.length > 0 ? platforms : ['INKR'],
          mangaupdates_id: null,
          mangabaka_id: id ? String(id) : null,
          mangadex_id: null,
          anilist_id: null,
          mal_id: null,
          source: 'mangabaka' as const,
        }
      })
      .filter((s: SeriesData | null): s is SeriesData => s !== null && s.title.length > 0)
  } catch {
    return []
  }
}

// ── MangaDex fetcher (fallback) ──────────────────────────────────

async function fetchMangaDexByType(
  limit:  number,
  page:   number,
  mdType: 'manhwa' | 'manhua' | 'manga'
): Promise<SeriesData[]> {
  try {
    const res = await fetch(
      `https://api.mangadex.org/manga?limit=${limit}&offset=${(page - 1) * limit}&contentRating[]=safe&contentRating[]=suggestive&includes[]=author&includes[]=artist&includes[]=cover_art&order[rating]=desc`,
      { next: { revalidate: 0 } }
    )
    if (!res.ok) return []

    const data = await res.json()
    const items = data.data ?? []

    return items
      .map((item: any): SeriesData | null => {
        const attr = item.attributes ?? {}
        const titleEn = attr.title?.en || Object.values(attr.title ?? {})[0] || ''
        if (!titleEn) return null

        const description = attr.description?.en ?? ''
        const cleanDesc = description.replace(/<[^>]*>/g, '').trim().slice(0, 2000) || 'No description available.'

        const genres = sanitizeGenres(attr.tags?.map((t: any) => t.attributes?.name?.en ?? '') ?? [])

        // Extract platforms from MangaDex
        const platforms = extractPlatformsFromMangaDex(item)

        return {
          title: String(titleEn),
          alternative_titles: (Object.values(attr.altTitles ?? {}).filter(Boolean) as string[]).slice(0, 5),
          description: cleanDesc,
          type: mdType,
          status: mapStatus(attr.status ?? ''),
          genres: genres.length > 0 ? genres : ['Action'],
          cover_url: attr.links?.['cover_art'] ?? null,
          author: null,
          artist: null,
          year_released: attr.year ?? null,
          chapter_count: attr.lastChapter ? parseInt(attr.lastChapter) : null,
          official_platforms: platforms.length > 0 ? platforms : ['INKR'],
          mangaupdates_id: null,
          mangabaka_id: null,
          mangadex_id: item.id ? String(item.id) : null,
          anilist_id: null,
          mal_id: null,
          source: 'mangadex' as const,
        }
      })
      .filter((s: SeriesData | null): s is SeriesData => s !== null && s.title.length > 0)
  } catch {
    return []
  }
}

// ── AniList fallback ──────────────────────────────────────────────

async function fetchAniListByFormat(limit: number, format: 'MANHWA' | 'MANHUA' | 'MANGA'): Promise<SeriesData[]> {
  try {
    const gql = `
      query ($perPage: Int, $format: MediaFormat) {
        Page(perPage: $perPage) {
          media(type: MANGA, sort: TRENDING_DESC, format: $format, status_in: [RELEASING, FINISHED]) {
            id
            title { english romaji native }
            description(asHtml: false)
            genres
            coverImage { extraLarge large }
            externalLinks { url site }
            startDate { year }
            chapters
            status
            format
          }
        }
      }
    `
    const res = await fetch('https://graphql.anilist.co', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ query: gql, variables: { perPage: limit, format } }),
      next:    { revalidate: 0 },
    })
    if (!res.ok) return []

    const data  = await res.json()
    const items = data?.data?.Page?.media ?? []

    return items
      .map((item: any): SeriesData | null => {
        const title = item.title?.english || item.title?.romaji || ''
        if (!title) return null

        const platforms = extractPlatformsFromAniList(item)

        return {
          title,
          alternative_titles: [item.title?.romaji, item.title?.native].filter(Boolean),
          description: item.description?.replace(/<[^>]*>/g, '').trim().slice(0, 2000) || 'No description available.',
          type: mapAniListFormat(item.format),
          status: mapAniListStatus(item.status),
          genres: sanitizeGenres(item.genres ?? []),
          cover_url: item.coverImage?.extraLarge || item.coverImage?.large || null,
          author: null,
          artist: null,
          year_released: item.startDate?.year ?? null,
          chapter_count: item.chapters ?? null,
          official_platforms: platforms.length > 0 ? platforms : ['INKR'],
          mangaupdates_id: null,
          mangabaka_id: null,
          mangadex_id: null,
          anilist_id: item.id ? String(item.id) : null,
          mal_id: null,
          source: 'anilist' as const,
        }
      })
      .filter((s: SeriesData | null): s is SeriesData => s !== null && s.title.length > 0)
  } catch {
    return []
  }
}

// ── Jikan (MAL) fallback ────────────────────────────────────────

async function fetchJikanByType(
  limit:   number,
  page:    number,
  malType: 'manhwa' | 'manhua' | 'manga'
): Promise<SeriesData[]> {
  try {
    const res = await fetch(
      `https://api.jikan.moe/v4/top/manga?limit=${limit}&type=${malType}&page=${page}`,
      { next: { revalidate: 0 } }
    )
    if (!res.ok) return []

    const data = await res.json()

    return (data.data ?? [])
      .map((item: any): SeriesData | null => {
        const title = item.title_english || item.title || ''
        if (!title) return null

        const platforms = extractPlatformsFromJikan(item)

        return {
          title,
          alternative_titles: [item.title, item.title_japanese].filter(Boolean),
          description: item.synopsis?.replace(/\[Written by MAL Rewrite\]/g, '').trim().slice(0, 2000) || 'No description available.',
          type: malType,
          status: mapStatus(item.status ?? ''),
          genres: sanitizeGenres(item.genres?.map((g: any) => g.name) ?? []),
          cover_url: item.images?.jpg?.large_image_url ?? item.images?.jpg?.image_url ?? null,
          author: item.authors?.[0]?.name?.replace(', ', ' ') ?? null,
          artist: item.authors?.[1]?.name?.replace(', ', ' ') ?? item.authors?.[0]?.name?.replace(', ', ' ') ?? null,
          year_released: item.published?.prop?.from?.year ?? null,
          chapter_count: item.chapters ?? null,
          official_platforms: platforms.length > 0 ? platforms : ['INKR'],
          mangaupdates_id: null,
          mangabaka_id: null,
          mangadex_id: null,
          anilist_id: null,
          mal_id: item.mal_id ? String(item.mal_id) : null,
          source: 'jikan' as const,
        }
      })
      .filter((s: SeriesData | null): s is SeriesData => s !== null && s.title.length > 0)
  } catch {
    return []
  }
}

// ── Dedupe helpers ────────────────────────────────────────────────

function dedupeWithin(series: SeriesData[]): SeriesData[] {
  const seen = new Set<string>()
  return series.filter((s) => {
    const key = s.title.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function dedupeAgainst(existing: SeriesData[], incoming: SeriesData[]): SeriesData[] {
  const seen = new Set(existing.map((s) => s.title.toLowerCase()))
  return incoming.filter((s) => !seen.has(s.title.toLowerCase()))
}

// ── Smart fetch for a single type (MU → MB → MAL rotation) ───────

async function fetchForType(
  state:      TypeState,
  count:      number,
  muType:     'manhwa' | 'manhua' | 'manga',
  mdType:     'manhwa' | 'manhua' | 'manga',
  aniFormat:  'MANHWA' | 'MANHUA' | 'MANGA',
  malType:    'manhwa' | 'manhua' | 'manga',
  dbTitles:   Set<string>
): Promise<{ results: SeriesData[]; nextState: TypeState; usedSource: string }> {

  let nextState = { ...state }
  let results:  SeriesData[] = []
  let usedSource: string = state.source_mode

  if (state.source_mode === 'mu') {
    const nextPage = state.page + 1
    nextState.page = nextPage

    const muRaw   = dedupeWithin(await fetchMangaUpdatesByType(count + 5, nextPage, muType))
    const muFresh = muRaw.filter(s => !dbTitles.has(s.title.toLowerCase()))

    if (muFresh.length === 0) {
      nextState.mu_zero_streak = state.mu_zero_streak + 1

      if (nextState.mu_zero_streak >= MU_ZERO_THRESHOLD) {
        nextState.source_mode = 'mb'
        nextState.mb_run_count = 0
        usedSource = 'mb (switched from mu)'
      }

      const mbPage = state.mb_run_count + 1
      const mbRaw  = dedupeWithin(await fetchMangaBakaByType(count + 5, mbPage, muType))
      results = mbRaw.slice(0, count)

      if (results.length < count) {
        const mdRaw = dedupeWithin(await fetchMangaDexByType(count + 5, mbPage, mdType))
        const fresh = dedupeAgainst(results, mdRaw)
        results.push(...fresh.slice(0, count - results.length))
      }

      if (results.length < count) {
        const aniRaw = dedupeWithin(await fetchAniListByFormat(count + 5, aniFormat))
        const fresh = dedupeAgainst(results, aniRaw)
        results.push(...fresh.slice(0, count - results.length))
      }
    } else {
      nextState.mu_zero_streak = 0
      results = muFresh.slice(0, count)

      if (results.length < count) {
        const aniRaw = dedupeWithin(await fetchAniListByFormat(count + 5, aniFormat))
        const fresh  = dedupeAgainst(results, aniRaw)
        results.push(...fresh.slice(0, count - results.length))
      }
    }
  } else if (state.source_mode === 'mb') {
    const mbPage = state.mb_run_count + 1
    nextState.mb_run_count = mbPage

    if (mbPage >= MB_RUN_LIMIT) {
      const muCheckPage = state.page + 1
      const muRaw       = dedupeWithin(await fetchMangaUpdatesByType(count + 5, muCheckPage, muType))
      const muFresh     = muRaw.filter(s => !dbTitles.has(s.title.toLowerCase()))

      if (muFresh.length > 0) {
        nextState.source_mode   = 'mu'
        nextState.page          = muCheckPage
        nextState.mu_zero_streak = 0
        nextState.mb_run_count  = 0
        results = muFresh.slice(0, count)
        usedSource = 'mu (switched back from mb)'
      } else {
        nextState.source_mode  = 'mal'
        nextState.mal_run_count = 0
        nextState.mu_zero_streak = MU_ZERO_THRESHOLD
        usedSource = 'mal (switched from mb, mu still dry)'

        const malRaw = dedupeWithin(await fetchJikanByType(count + 5, 1, malType))
        results = malRaw.slice(0, count)
      }
    } else {
      usedSource = `mb (run ${mbPage}/${MB_RUN_LIMIT})`
      const mbRaw = dedupeWithin(await fetchMangaBakaByType(count + 5, mbPage, muType))
      results = mbRaw.slice(0, count)
    }

    if (results.length < count) {
      const mdRaw = dedupeWithin(await fetchMangaDexByType(count + 5, 1, mdType))
      const fresh = dedupeAgainst(results, mdRaw)
      results.push(...fresh.slice(0, count - results.length))
    }

    if (results.length < count) {
      const aniRaw = dedupeWithin(await fetchAniListByFormat(count + 5, aniFormat))
      const fresh = dedupeAgainst(results, aniRaw)
      results.push(...fresh.slice(0, count - results.length))
    }
  } else {
    // MAL mode
    const malPage = state.mal_run_count + 1
    nextState.mal_run_count = malPage

    if (malPage >= MAL_RUN_LIMIT) {
      const muCheckPage = state.page + 1
      const muRaw       = dedupeWithin(await fetchMangaUpdatesByType(count + 5, muCheckPage, muType))
      const muFresh     = muRaw.filter(s => !dbTitles.has(s.title.toLowerCase()))

      if (muFresh.length > 0) {
        nextState.source_mode   = 'mu'
        nextState.page          = muCheckPage
        nextState.mu_zero_streak = 0
        nextState.mb_run_count  = 0
        nextState.mal_run_count  = 0
        results = muFresh.slice(0, count)
        usedSource = 'mu (switched back from mal)'
      } else {
        nextState.mal_run_count = 0
        usedSource = 'mal (mu still dry, resetting)'

        const malRaw = dedupeWithin(await fetchJikanByType(count + 5, malPage, malType))
        results = malRaw.slice(0, count)
      }
    } else {
      usedSource = `mal (run ${malPage}/${MAL_RUN_LIMIT})`
      const malRaw = dedupeWithin(await fetchJikanByType(count + 5, malPage, malType))
      results = malRaw.slice(0, count)
    }

    if (results.length < count) {
      const aniRaw = dedupeWithin(await fetchAniListByFormat(count + 5, aniFormat))
      const fresh = dedupeAgainst(results, aniRaw)
      results.push(...fresh.slice(0, count - results.length))
    }
  }

  return { results, nextState, usedSource }
}

// ── Main handler ──────────────────────────────────────────────────

export async function GET(req: Request) {
  // 1. Auth check
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 2. System user
  const systemUserId = '00000000-0000-0000-0000-000000000000'

  // 3. Read last state from activity_logs
  const { data: lastLog } = await supabase
    .from('activity_logs')
    .select('details')
    .eq('action', 'auto_rec_submit_summary')
    .eq('user_id', systemUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastDetails = (lastLog?.details as any) ?? {}

  // Parse per-type states
  const manhwaState: TypeState = {
    page:           lastDetails.states?.manhwa?.page           ?? 0,
    mu_zero_streak: lastDetails.states?.manhwa?.mu_zero_streak ?? 0,
    source_mode:    lastDetails.states?.manhwa?.source_mode    ?? 'mu',
    mb_run_count:   lastDetails.states?.manhwa?.mb_run_count   ?? 0,
    mal_run_count:  lastDetails.states?.manhwa?.mal_run_count  ?? 0,
  }
  const manhuaState: TypeState = {
    page:           lastDetails.states?.manhua?.page           ?? 0,
    mu_zero_streak: lastDetails.states?.manhua?.mu_zero_streak ?? 0,
    source_mode:    lastDetails.states?.manhua?.source_mode    ?? 'mu',
    mb_run_count:   lastDetails.states?.manhua?.mb_run_count   ?? 0,
    mal_run_count:  lastDetails.states?.manhua?.mal_run_count  ?? 0,
  }
  const mangaState: TypeState = {
    page:           lastDetails.states?.manga?.page           ?? 0,
    mu_zero_streak: lastDetails.states?.manga?.mu_zero_streak ?? 0,
    source_mode:    lastDetails.states?.manga?.source_mode    ?? 'mu',
    mb_run_count:   lastDetails.states?.manga?.mb_run_count   ?? 0,
    mal_run_count:  lastDetails.states?.manga?.mal_run_count  ?? 0,
  }

  // 4. Build a set of existing DB titles
  const { data: existingRecs } = await supabase
    .from('recommendations')
    .select('title')
    .eq('ai_model', 'auto-submitter')

  const dbTitles = new Set(
    (existingRecs ?? []).map((r: any) => r.title.toLowerCase())
  )

  // 5. Fetch each type (MU → MB → MAL rotation)
  const [manhwaResult, manhuaResult, mangaResult] = await Promise.all([
    fetchForType(manhwaState, MANHWA_COUNT, 'manhwa', 'manhwa', 'MANHWA', 'manhwa', dbTitles),
    fetchForType(manhuaState, MANHUA_COUNT, 'manhua', 'manhua', 'MANHUA', 'manhua', dbTitles),
    fetchForType(mangaState,  MANGA_COUNT,  'manga',  'manga',  'MANGA',  'manga',  dbTitles),
  ])

  // 6. Combine with global dedupe
  const series: SeriesData[] = dedupeWithin([
    ...manhwaResult.results,
    ...manhuaResult.results,
    ...mangaResult.results,
  ])

  if (series.length === 0) {
    return NextResponse.json({ error: 'All sources failed to return data.', submitted: 0, skipped: 0, failed: 0 }, { status: 502 })
  }

  // 7. Process each series with detailed logging
  const logs: SubmissionLog[] = []
  let submitted = 0
  let skipped = 0
  let failed = 0

  for (const s of series) {
    const timestamp = new Date().toISOString()

    if (!s.title.trim()) {
      logs.push({
        title: '(empty)',
        type: 'other',
        status: 'skipped',
        source: 'unknown',
        genres: [],
        platforms: [],
        reason: 'Empty title from source',
        timestamp,
      })
      skipped++
      continue
    }

    try {
      const { data: existing } = await supabase
        .from('recommendations')
        .select('id, title')
        .ilike('title', s.title.trim())
        .maybeSingle()

      if (existing) {
        logs.push({
          title: s.title,
          type: s.type,
          status: 'skipped',
          source: s.source,
          genres: s.genres,
          platforms: s.official_platforms,
          author: s.author,
          artist: s.artist,
          chapters: s.chapter_count,
          year: s.year_released,
          reason: `Duplicate — already exists as "${existing.title}"`,
          external_ids: {
            mangaupdates_id: s.mangaupdates_id,
            mangabaka_id: s.mangabaka_id,
            mangadex_id: s.mangadex_id,
            anilist_id: s.anilist_id,
            mal_id: s.mal_id,
          },
          timestamp,
        })
        skipped++
        continue
      }

      const genres = s.genres.length > 0 ? s.genres : ['Action']

      const { error: insertError } = await supabase
        .from('recommendations')
        .insert({
          user_id:            systemUserId,
          title:              s.title.trim(),
          alternative_titles: s.alternative_titles,
          description:        s.description,
          type:               s.type,
          status:             s.status,
          genres,
          cover_url:          s.cover_url,
          author:             s.author,
          artist:             s.artist,
          year_released:      s.year_released,
          chapter_count:      s.chapter_count,
          official_platforms: s.official_platforms,
          content_rating:     'all_ages',
          is_approved:        false,
          is_ai_generated:    true,
          ai_model:           'auto-submitter',
          mangaupdates_id:    s.mangaupdates_id,
          mangabaka_id:       s.mangabaka_id,
          mangadex_id:        s.mangadex_id,
          anilist_id:         s.anilist_id,
          mal_id:             s.mal_id,
        } as any)

      if (insertError) {
        logs.push({
          title: s.title,
          type: s.type,
          status: 'failed',
          source: s.source,
          genres: s.genres,
          platforms: s.official_platforms,
          author: s.author,
          artist: s.artist,
          chapters: s.chapter_count,
          year: s.year_released,
          error: insertError.message,
          external_ids: {
            mangaupdates_id: s.mangaupdates_id,
            mangabaka_id: s.mangabaka_id,
            mangadex_id: s.mangadex_id,
            anilist_id: s.anilist_id,
            mal_id: s.mal_id,
          },
          timestamp,
        })
        failed++
        continue
      }

      logs.push({
        title: s.title,
        type: s.type,
        status: 'submitted',
        source: s.source,
        genres: s.genres,
        platforms: s.official_platforms,
        author: s.author,
        artist: s.artist,
        chapters: s.chapter_count,
        year: s.year_released,
        external_ids: {
          mangaupdates_id: s.mangaupdates_id,
          mangabaka_id: s.mangabaka_id,
          mangadex_id: s.mangadex_id,
          anilist_id: s.anilist_id,
          mal_id: s.mal_id,
        },
        timestamp,
      })
      submitted++
    } catch (err: any) {
      logs.push({
        title: s.title,
        type: s.type,
        status: 'failed',
        source: s.source,
        genres: s.genres,
        platforms: s.official_platforms,
        author: s.author,
        artist: s.artist,
        chapters: s.chapter_count,
        year: s.year_released,
        error: err?.message ?? 'Unknown error',
        external_ids: {
          mangaupdates_id: s.mangaupdates_id,
          mangabaka_id: s.mangabaka_id,
          mangadex_id: s.mangadex_id,
          anilist_id: s.anilist_id,
          mal_id: s.mal_id,
        },
        timestamp,
      })
      failed++
    }
  }

  // 8. Bulk log all submissions
  try {
    for (const log of logs) {
      await logSubmission(supabase, log)
    }
  } catch (err) {
    console.error('Failed to log submissions:', err)
  }

  // 9. Log the run summary
  await supabase.from('activity_logs').insert({
    user_id:     systemUserId,
    action:      'auto_rec_submit_summary',
    entity_type: 'recommendations',
    details: {
      submitted_count: submitted,
      skipped_count:   skipped,
      failed_count:    failed,
      total_processed: series.length,
      sources: {
        manhwa: manhwaResult.usedSource,
        manhua: manhuaResult.usedSource,
        manga:  mangaResult.usedSource,
      },
      states: {
        manhwa: manhwaResult.nextState,
        manhua: manhuaResult.nextState,
        manga:  mangaResult.nextState,
      },
      timestamp: new Date().toISOString(),
    },
  } as any)

  return NextResponse.json({
    submitted,
    skipped,
    failed,
    total: series.length,
    sources: {
      manhwa: manhwaResult.usedSource,
      manhua: manhuaResult.usedSource,
      manga:  mangaResult.usedSource,
    },
    states: {
      manhwa: manhwaResult.nextState,
      manhua: manhuaResult.nextState,
      manga:  mangaResult.nextState,
    },
    logs_count: logs.length,
  })
}
