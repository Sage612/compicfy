import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Ratio config ──────────────────────────────────────────────────
const MANHWA_COUNT = 10  // 50%
const MANHUA_COUNT = 6   // 30%
const MANGA_COUNT  = 4   // 20%

// ── Source rotation config ────────────────────────────────────────
const MU_ZERO_THRESHOLD = 3   // consecutive empty MU pages before switching
const MAL_RUN_LIMIT     = 10  // MAL pages per cycle before retrying MU

const SORT_ORDERS = ['rating', 'subscribers', 'year', 'votes'] as const
type SortOrder = typeof SORT_ORDERS[number]

function resolveSortOrder(page: number): SortOrder {
  return SORT_ORDERS[Math.floor((page - 1) / 10) % SORT_ORDERS.length]
}

function resolveLocalPage(page: number): number {
  return ((page - 1) % 10) + 1
}

// ── Logging ───────────────────────────────────────────────────────
interface SubmissionLog {
  title:     string
  type:      string
  status:    'submitted' | 'skipped' | 'failed'
  source:    string
  genres:    string[]
  platforms: string[]
  author?:   string | null
  artist?:   string | null
  chapters?: number | null
  year?:     number | null
  reason?:   string
  error?:    string
  external_ids?: {
    mangaupdates_id?: string
    mangadex_id?:     string
    anilist_id?:      string
    mal_id?:          string
  }
  timestamp: string
}

async function logSubmission(supabase: any, log: SubmissionLog) {
  try {
    await supabase.from('activity_logs').insert({
      user_id:     null,
      action:      'auto_rec_submit',
      entity_type: 'recommendations',
      details:     log,
    })
  } catch (err) {
    console.error('Failed to log submission:', err)
  }
}

// ── Helpers ───────────────────────────────────────────────────────
function mapStatus(raw: string): 'ongoing' | 'completed' | 'hiatus' | 'cancelled' {
  const s = raw.toLowerCase()
  if (s.includes('complet') || s.includes('finish'))     return 'completed'
  if (s.includes('hiatus'))                              return 'hiatus'
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
  return genres.map(g => g.trim()).filter(Boolean).slice(0, 5)
}

function extractPlatformsFromMU(detail: any, record: any): string[] {
  const platforms = new Set<string>()
  const associated = detail?.associated ?? record?.associated ?? []
  associated.forEach((a: any) => {
    const relType = (a.relation_type ?? '').toLowerCase()
    const name    = (a.title ?? '').toLowerCase()
    if (relType.includes('official') && relType.includes('english')) {
      if (name.includes('viz'))        platforms.add('Viz Media')
      if (name.includes('mangaplus')) platforms.add('Mangaplus')
      if (name.includes('webtoon'))   platforms.add('Webtoon')
      if (name.includes('tapas'))     platforms.add('Tapas')
      if (name.includes('tappytoon')) platforms.add('Tappytoon')
      if (name.includes('inkr'))      platforms.add('INKR')
    }
  })
  const pubEnglish = detail?.publication_html?.english ?? ''
  if (pubEnglish.includes('Viz'))       platforms.add('Viz Media')
  if (pubEnglish.includes('MangaPlus')) platforms.add('Mangaplus')
  if (pubEnglish.includes('Webtoon'))   platforms.add('Webtoon')
  return Array.from(platforms).slice(0, 5)
}

// ── Series data ───────────────────────────────────────────────────
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
  mangaupdates_id:    string | undefined
  mangadex_id:        string | undefined
  anilist_id:         string | undefined
  mal_id:             string | undefined
  source:             'mangaupdates' | 'anilist' | 'jikan'
}

// ── Type state ────────────────────────────────────────────────────
interface TypeState {
  page:           number  // MU page cursor
  mu_zero_streak: number
  source_mode:    'mu' | 'mal'
  mal_page:       number  // MAL page cursor — persisted now
  mal_run_count:  number
}

// ── MangaUpdates ──────────────────────────────────────────────────
async function fetchMangaUpdatesByType(
  limit: number,
  page: number,
  muType: 'manhwa' | 'manhua' | 'manga'
): Promise<SeriesData[]> {
  try {
    const res = await fetch('https://api.mangaupdates.com/v1/series/search', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderby: resolveSortOrder(page),
        asc:     'desc',
        perpage: limit,
        page:    resolveLocalPage(page),
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
          return { record, detail: detailRes.ok ? await detailRes.json() : null, seriesId }
        } catch {
          return { record, detail: null, seriesId }
        }
      })
    )

    return detailed
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => {
        const { record, detail, seriesId } = (r as PromiseFulfilledResult<any>).value
        const allCredits  = detail?.authors ?? record.authors ?? []
        const authors     = allCredits.filter((a: any) => a.type?.toLowerCase() === 'author').map((a: any) => a.name ?? '')
        const artists     = allCredits.filter((a: any) => a.type?.toLowerCase() === 'artist').map((a: any) => a.name ?? '')
        const firstCredit = allCredits[0]?.name ?? null
        const genreList   = (detail?.genres ?? record.genres ?? []).map((g: any) => g.genre ?? g)
        const catList     = (detail?.categories ?? record.categories ?? []).slice(0, 3).map((c: any) => c.category ?? c)
        const rawDesc     = detail?.description ?? record.description ?? ''
        const altTitles: string[] = []
        ;(detail?.associated ?? record.associated ?? []).forEach((a: any) => { if (a.title) altTitles.push(a.title) })

        return {
          title:              detail?.title ?? record.title ?? '',
          alternative_titles: altTitles.slice(0, 5),
          description:        rawDesc.replace(/<[^>]*>/g, '').trim().slice(0, 2000) || 'No description available.',
          type:               muType,
          status:             mapStatus(detail?.status ?? record.status ?? ''),
          genres:             sanitizeGenres([...new Set([...genreList, ...catList])]),
          cover_url:          detail?.image?.url?.original ?? detail?.image?.url?.thumb ?? record.image?.url?.original ?? record.image?.url?.thumb ?? null,
          author:             authors[0] ?? firstCredit,
          artist:             artists[0] ?? authors[0] ?? firstCredit,
          year_released:      detail?.year ? parseInt(detail.year) : record.year ? parseInt(record.year) : null,
          chapter_count:      detail?.latest_chapter ?? record.latest_chapter ?? null,
          official_platforms: extractPlatformsFromMU(detail, record).length > 0 ? extractPlatformsFromMU(detail, record) : ['INKR'],
          mangaupdates_id:    String(seriesId),
          mangadex_id:        undefined,
          anilist_id:         undefined,
          mal_id:             undefined,
          source:             'mangaupdates' as const,
        }
      })
      .filter(s => s.title.length > 0)
  } catch {
    return []
  }
}

// ── AniList ───────────────────────────────────────────────────────
async function fetchAniListByFormat(limit: number, format: 'MANHWA' | 'MANHUA' | 'MANGA'): Promise<SeriesData[]> {
  try {
    const gql = `
      query ($perPage: Int, $format: MediaFormat) {
        Page(perPage: $perPage) {
          media(type: MANGA, sort: TRENDING_DESC, format: $format, status_in: [RELEASING, FINISHED]) {
            id title { english romaji } description(asHtml: false)
            genres coverImage { extraLarge large } startDate { year } chapters status format
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
      .map((item: any): SeriesData => ({
        title:              item.title?.english || item.title?.romaji || '',
        alternative_titles: [item.title?.romaji, item.title?.native].filter(Boolean),
        description:        item.description?.replace(/<[^>]*>/g, '').trim().slice(0, 2000) || 'No description available.',
        type:               mapAniListFormat(item.format),
        status:             mapAniListStatus(item.status),
        genres:             sanitizeGenres(item.genres ?? []),
        cover_url:          item.coverImage?.extraLarge || item.coverImage?.large || null,
        author:             null,
        artist:             null,
        year_released:      item.startDate?.year ?? null,
        chapter_count:      item.chapters ?? null,
        official_platforms: ['INKR'],
        mangaupdates_id:    undefined,
        mangadex_id:        undefined,
        anilist_id:         String(item.id),
        mal_id:             undefined,
        source:             'anilist' as const,
      }))
      .filter((s: SeriesData) => s.title.length > 0)
  } catch {
    return []
  }
}

// ── Jikan (MAL) ───────────────────────────────────────────────────
async function fetchJikanByType(
  limit: number,
  page: number,   // explicit page — always passed in, never derived
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
      .map((item: any): SeriesData => ({
        title:              item.title_english || item.title || '',
        alternative_titles: [item.title, item.title_japanese].filter(Boolean),
        description:        item.synopsis?.replace(/\[Written by MAL Rewrite\]/g, '').trim().slice(0, 2000) || 'No description available.',
        type:               malType,
        status:             mapStatus(item.status ?? ''),
        genres:             sanitizeGenres(item.genres?.map((g: any) => g.name) ?? []),
        cover_url:          item.images?.jpg?.large_image_url ?? item.images?.jpg?.image_url ?? null,
        author:             item.authors?.[0]?.name?.replace(', ', ' ') ?? null,
        artist:             item.authors?.[1]?.name?.replace(', ', ' ') ?? item.authors?.[0]?.name?.replace(', ', ' ') ?? null,
        year_released:      item.published?.prop?.from?.year ?? null,
        chapter_count:      item.chapters ?? null,
        official_platforms: ['INKR'],
        mangaupdates_id:    undefined,
        mangadex_id:        undefined,
        anilist_id:         undefined,
        mal_id:             String(item.mal_id),
        source:             'jikan' as const,
      }))
      .filter((s: SeriesData) => s.title.length > 0)
  } catch {
    return []
  }
}

// ── Dedupe helpers ────────────────────────────────────────────────
function dedupeWithin(series: SeriesData[]): SeriesData[] {
  const seen = new Set<string>()
  return series.filter(s => {
    const key = s.title.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── Smart fetch for a single type (MU → MAL rotation, no MangaBaka) ──
async function fetchForType(
  state:     TypeState,
  count:     number,
  muType:    'manhwa' | 'manhua' | 'manga',
  aniFormat: 'MANHWA' | 'MANHUA' | 'MANGA',
  malType:   'manhwa' | 'manhua' | 'manga',
  dbTitles:  Set<string>
): Promise<{ results: SeriesData[]; nextState: TypeState; usedSource: string }> {

  let nextState          = { ...state }
  let results:           SeriesData[] = []
  let usedSource: string = state.source_mode

  if (state.source_mode === 'mu') {
    const nextPage = state.page + 1
    nextState.page = nextPage

    const muRaw   = dedupeWithin(await fetchMangaUpdatesByType(count + 5, nextPage, muType))
    const muFresh = muRaw.filter(s => !dbTitles.has(s.title.toLowerCase()))

    if (muFresh.length === 0) {
      nextState.mu_zero_streak++
      usedSource = `mu (empty page ${nextPage}, streak ${nextState.mu_zero_streak})`

      if (nextState.mu_zero_streak >= MU_ZERO_THRESHOLD) {
        // Switch to MAL — advance MAL page
        nextState.source_mode = 'mal'
        nextState.mal_page    = state.mal_page + 1
        nextState.mal_run_count = 1
        usedSource = `mal (switched from mu, page ${nextState.mal_page})`

        const malRaw = dedupeWithin(await fetchJikanByType(count + 5, nextState.mal_page, malType))
        results = malRaw.filter(s => !dbTitles.has(s.title.toLowerCase())).slice(0, count)
      } else {
        // Still in MU mode but empty — top up with AniList
        const aniRaw = dedupeWithin(await fetchAniListByFormat(count + 5, aniFormat))
        results = aniRaw.filter(s => !dbTitles.has(s.title.toLowerCase())).slice(0, count)
      }
    } else {
      nextState.mu_zero_streak = 0
      results = muFresh.slice(0, count)
      usedSource = `mu (page ${nextPage})`

      // Top up with AniList if MU didn't fill the quota
      if (results.length < count) {
        const aniRaw  = dedupeWithin(await fetchAniListByFormat(count + 5, aniFormat))
        const aniFresh = aniRaw.filter(s => !dbTitles.has(s.title.toLowerCase()) && !results.some(r => r.title.toLowerCase() === s.title.toLowerCase()))
        results.push(...aniFresh.slice(0, count - results.length))
      }
    }
  } else {
    // MAL mode — advance page each run
    const malPage       = state.mal_page + 1
    nextState.mal_page  = malPage
    nextState.mal_run_count++
    usedSource = `mal (page ${malPage}, run ${nextState.mal_run_count}/${MAL_RUN_LIMIT})`

    const malRaw   = dedupeWithin(await fetchJikanByType(count + 5, malPage, malType))
    const malFresh = malRaw.filter(s => !dbTitles.has(s.title.toLowerCase()))
    results = malFresh.slice(0, count)

    if (nextState.mal_run_count >= MAL_RUN_LIMIT) {
      // Try switching back to MU after MAL cycle
      const muCheckPage = state.page + 1
      const muRaw       = dedupeWithin(await fetchMangaUpdatesByType(count + 5, muCheckPage, muType))
      const muFresh     = muRaw.filter(s => !dbTitles.has(s.title.toLowerCase()))

      if (muFresh.length > 0) {
        nextState.source_mode   = 'mu'
        nextState.page          = muCheckPage
        nextState.mu_zero_streak = 0
        nextState.mal_run_count  = 0
        results    = muFresh.slice(0, count)
        usedSource = `mu (switched back from mal, page ${muCheckPage})`
      } else {
        // MU still dry — keep MAL going, reset run counter
        nextState.mal_run_count = 0
        usedSource = `mal (mu still dry, continuing from page ${malPage})`
      }
    }

    // Top up with AniList if needed
    if (results.length < count) {
      const aniRaw   = dedupeWithin(await fetchAniListByFormat(count + 5, aniFormat))
      const aniFresh = aniRaw.filter(s => !dbTitles.has(s.title.toLowerCase()) && !results.some(r => r.title.toLowerCase() === s.title.toLowerCase()))
      results.push(...aniFresh.slice(0, count - results.length))
    }
  }

  return { results, nextState, usedSource }
}

// ── Main handler ──────────────────────────────────────────────────
export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const systemUserId = '00000000-0000-0000-0000-000000000000'

  // Load last state
  const { data: lastLog } = await supabase
    .from('activity_logs')
    .select('details')
    .eq('action', 'auto_rec_submit_summary')
    .eq('user_id', systemUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastDetails = (lastLog?.details as any) ?? {}

  const manhwaState: TypeState = {
    page:           lastDetails.states?.manhwa?.page           ?? 0,
    mu_zero_streak: lastDetails.states?.manhwa?.mu_zero_streak ?? 0,
    source_mode:    lastDetails.states?.manhwa?.source_mode    ?? 'mu',
    mal_page:       lastDetails.states?.manhwa?.mal_page       ?? 0,
    mal_run_count:  lastDetails.states?.manhwa?.mal_run_count  ?? 0,
  }
  const manhuaState: TypeState = {
    page:           lastDetails.states?.manhua?.page           ?? 0,
    mu_zero_streak: lastDetails.states?.manhua?.mu_zero_streak ?? 0,
    source_mode:    lastDetails.states?.manhua?.source_mode    ?? 'mu',
    mal_page:       lastDetails.states?.manhua?.mal_page       ?? 0,
    mal_run_count:  lastDetails.states?.manhua?.mal_run_count  ?? 0,
  }
  const mangaState: TypeState = {
    page:           lastDetails.states?.manga?.page           ?? 0,
    mu_zero_streak: lastDetails.states?.manga?.mu_zero_streak ?? 0,
    source_mode:    lastDetails.states?.manga?.source_mode    ?? 'mu',
    mal_page:       lastDetails.states?.manga?.mal_page       ?? 0,
    mal_run_count:  lastDetails.states?.manga?.mal_run_count  ?? 0,
  }

  // ── Load ALL existing titles (not just auto-submitter) ──
  // This prevents resubmitting comics that users already added manually
  const { data: existingRecs } = await supabase
    .from('recommendations')
    .select('title')

  const dbTitles = new Set(
    (existingRecs ?? []).map((r: any) => r.title.toLowerCase())
  )

  const [manhwaResult, manhuaResult, mangaResult] = await Promise.all([
    fetchForType(manhwaState, MANHWA_COUNT, 'manhwa', 'MANHWA', 'manhwa', dbTitles),
    fetchForType(manhuaState, MANHUA_COUNT, 'manhua', 'MANHUA', 'manhua', dbTitles),
    fetchForType(mangaState,  MANGA_COUNT,  'manga',  'MANGA',  'manga',  dbTitles),
  ])

  const series: SeriesData[] = dedupeWithin([
    ...manhwaResult.results,
    ...manhuaResult.results,
    ...mangaResult.results,
  ])

  if (series.length === 0) {
    // Save state even on empty run so page cursors advance
    await supabase.from('activity_logs').insert({
      user_id:     systemUserId,
      action:      'auto_rec_submit_summary',
      entity_type: 'recommendations',
      details: {
        submitted_count: 0,
        skipped_count:   0,
        failed_count:    0,
        total_processed: 0,
        note:            'All sources returned only already-seen titles',
        sources: { manhwa: manhwaResult.usedSource, manhua: manhuaResult.usedSource, manga: mangaResult.usedSource },
        states:  { manhwa: manhwaResult.nextState,  manhua: manhuaResult.nextState,  manga: mangaResult.nextState  },
        timestamp: new Date().toISOString(),
      },
    } as any)
    return NextResponse.json({ error: 'No new titles found across all sources.', submitted: 0, skipped: 0, failed: 0 }, { status: 200 })
  }

  const logs: SubmissionLog[] = []
  let submitted = 0
  let skipped   = 0
  let failed    = 0

  for (const s of series) {
    const timestamp = new Date().toISOString()

    if (!s.title.trim()) {
      skipped++
      continue
    }

    try {
      // Final DB check — catch anything dbTitles missed (e.g. titles loaded mid-run)
      const { data: existing } = await supabase
        .from('recommendations')
        .select('id, title')
        .ilike('title', s.title.trim())
        .maybeSingle()

      if (existing) {
        logs.push({ title: s.title, type: s.type, status: 'skipped', source: s.source, genres: s.genres, platforms: s.official_platforms, author: s.author, artist: s.artist, chapters: s.chapter_count, year: s.year_released, reason: `Duplicate — already exists as "${existing.title}"`, timestamp })
        skipped++
        continue
      }

      const { error: insertError } = await supabase
        .from('recommendations')
        .insert({
          user_id:            systemUserId,
          title:              s.title.trim(),
          alternative_titles: s.alternative_titles,
          description:        s.description,
          type:               s.type,
          status:             s.status,
          genres:             s.genres.length > 0 ? s.genres : ['Action'],
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
          mangadex_id:        s.mangadex_id,
          anilist_id:         s.anilist_id,
          mal_id:             s.mal_id,
        } as any)

      if (insertError) {
        logs.push({ title: s.title, type: s.type, status: 'failed', source: s.source, genres: s.genres, platforms: s.official_platforms, author: s.author, artist: s.artist, chapters: s.chapter_count, year: s.year_released, error: insertError.message, timestamp })
        failed++
        continue
      }

      logs.push({ title: s.title, type: s.type, status: 'submitted', source: s.source, genres: s.genres, platforms: s.official_platforms, author: s.author, artist: s.artist, chapters: s.chapter_count, year: s.year_released, timestamp })
      submitted++
    } catch (err: any) {
      logs.push({ title: s.title, type: s.type, status: 'failed', source: s.source, genres: s.genres, platforms: s.official_platforms, author: s.author, artist: s.artist, chapters: s.chapter_count, year: s.year_released, error: err?.message ?? 'Unknown error', timestamp })
      failed++
    }
  }

  for (const log of logs) await logSubmission(supabase, log)

  await supabase.from('activity_logs').insert({
    user_id:     systemUserId,
    action:      'auto_rec_submit_summary',
    entity_type: 'recommendations',
    details: {
      submitted_count: submitted,
      skipped_count:   skipped,
      failed_count:    failed,
      total_processed: series.length,
      sources: { manhwa: manhwaResult.usedSource, manhua: manhuaResult.usedSource, manga: mangaResult.usedSource },
      states:  { manhwa: manhwaResult.nextState,  manhua: manhuaResult.nextState,  manga: mangaResult.nextState  },
      timestamp: new Date().toISOString(),
    },
  } as any)

  return NextResponse.json({
    submitted, skipped, failed,
    total: series.length,
    sources: { manhwa: manhwaResult.usedSource, manhua: manhuaResult.usedSource, manga: mangaResult.usedSource },
    states:  { manhwa: manhwaResult.nextState,  manhua: manhuaResult.nextState,  manga: mangaResult.nextState  },
  })
}