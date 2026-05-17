import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Ratio config ──────────────────────────────────────────────────
const BATCH_SIZE   = 20
const MANHWA_COUNT = 10  // 50%
const MANHUA_COUNT = 6   // 30%
const MANGA_COUNT  = 4   // 20%

// ── Smart switching config ────────────────────────────────────────
// If MU returns 0 new results for a type N times in a row → switch to MAL
// After MAL_RUN_LIMIT MAL runs → try MU again
const MU_ZERO_THRESHOLD = 3   // consecutive MU zeros before switching
const MAL_RUN_LIMIT     = 5   // MAL runs before re-checking MU

// ── Sort rotation — cycles every 10 pages per type ───────────────
const SORT_ORDERS = ['rating', 'subscribers', 'year', 'votes'] as const
type SortOrder = typeof SORT_ORDERS[number]

function resolveSortOrder(page: number): SortOrder {
  const index = Math.floor((page - 1) / 10) % SORT_ORDERS.length
  return SORT_ORDERS[index]
}

function resolveLocalPage(page: number): number {
  return ((page - 1) % 10) + 1
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

function resolvePlatforms(type: string): string[] {
  switch (type) {
    case 'manhwa':  return ['Webtoon', 'Tapas', 'Tappytoon']
    case 'manhua':  return ['Mangatoon', 'Webcomics', 'INKR']
    case 'webtoon': return ['Webtoon', 'Tapas']
    default:        return ['Mangaplus', 'Viz Media', 'INKR']
  }
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
  anilist_id:         string | null
  mal_id:             string | null
  mangadex_id:        string | null
  source:             'mangaupdates' | 'anilist' | 'jikan'
}

// ── Per-type state stored in activity_logs ────────────────────────
interface TypeState {
  page:           number   // current MU page for this type
  mu_zero_streak: number   // consecutive runs where MU gave 0 new results
  source_mode:    'mu' | 'mal'  // which source is active
  mal_run_count:  number   // how many MAL runs done in current MAL stint
}

function defaultTypeState(): TypeState {
  return { page: 0, mu_zero_streak: 0, source_mode: 'mu', mal_run_count: 0 }
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
          record.image?.url?.thumb     ?? null

        const year = detail?.year
          ? parseInt(detail.year)
          : record.year ? parseInt(record.year) : null

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
          official_platforms: resolvePlatforms(muType),
          mangaupdates_id:    String(seriesId),
          anilist_id:         null,
          mal_id:             null,
          mangadex_id:        null,
          source:             'mangaupdates' as const,
        } satisfies SeriesData
      })
      .filter((s) => s.title.length > 0)
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
            title { romaji english native }
            description(asHtml: false)
            genres
            coverImage { extraLarge large }
            staff(perPage: 10) {
              edges { role node { name { full } } }
            }
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

    return items.map((item: any): SeriesData => {
      const author = item.staff?.edges?.find((e: any) =>
        e.role?.toLowerCase().includes('story') || e.role?.toLowerCase().includes('author')
      )?.node?.name?.full ?? null

      const artist = item.staff?.edges?.find((e: any) =>
        e.role?.toLowerCase().includes('art') || e.role?.toLowerCase().includes('illustrat')
      )?.node?.name?.full ?? author

      const type = mapAniListFormat(item.format)

      return {
        title:              item.title?.english || item.title?.romaji || '',
        alternative_titles: [item.title?.romaji, item.title?.native].filter(Boolean),
        description:        item.description?.replace(/<[^>]*>/g, '').trim().slice(0, 2000) || 'No description available.',
        type,
        status:             mapAniListStatus(item.status),
        genres:             sanitizeGenres(item.genres ?? []),
        cover_url:          item.coverImage?.extraLarge || item.coverImage?.large || null,
        author,
        artist,
        year_released:      item.startDate?.year ?? null,
        chapter_count:      item.chapters ?? null,
        official_platforms: resolvePlatforms(type),
        mangaupdates_id:    null,
        anilist_id:         String(item.id),
        mal_id:             null,
        mangadex_id:        null,
        source:             'anilist' as const,
      }
    }).filter((s: SeriesData) => s.title.length > 0)
  } catch {
    return []
  }
}

// ── Jikan (MAL) fetcher — paginated so MAL runs don't repeat ─────

async function fetchJikanByType(
  limit:   number,
  page:    number,
  malType: 'manhwa' | 'manhua' | 'manga'
): Promise<SeriesData[]> {
  // Jikan type param: manga | manhwa | manhua
  try {
    const res = await fetch(
      `https://api.jikan.moe/v4/top/manga?limit=${limit}&type=${malType}&page=${page}`,
      { next: { revalidate: 0 } }
    )
    if (!res.ok) return []

    const data = await res.json()

    return (data.data ?? []).map((item: any): SeriesData => {
      const internalType: 'manga' | 'manhwa' | 'manhua' = malType
      return {
        title:              item.title_english || item.title || '',
        alternative_titles: [item.title, item.title_japanese].filter(Boolean),
        description:        item.synopsis?.replace(/\[Written by MAL Rewrite\]/g, '').trim().slice(0, 2000) || 'No description available.',
        type:               internalType,
        status:             mapStatus(item.status ?? ''),
        genres:             sanitizeGenres(item.genres?.map((g: any) => g.name) ?? []),
        cover_url:          item.images?.jpg?.large_image_url ?? item.images?.jpg?.image_url ?? null,
        author:             item.authors?.[0]?.name?.replace(', ', ' ') ?? null,
        artist:             item.authors?.[1]?.name?.replace(', ', ' ') ?? item.authors?.[0]?.name?.replace(', ', ' ') ?? null,
        year_released:      item.published?.prop?.from?.year ?? null,
        chapter_count:      item.chapters ?? null,
        official_platforms: resolvePlatforms(internalType),
        mangaupdates_id:    null,
        anilist_id:         null,
        mal_id:             String(item.mal_id),
        mangadex_id:        null,
        source:             'jikan' as const,
      }
    }).filter((s: SeriesData) => s.title.length > 0)
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

// ── Smart fetch for a single type ────────────────────────────────
// Returns { results, nextState } so we can update the log correctly

async function fetchForType(
  state:      TypeState,
  count:      number,
  muType:     'manhwa' | 'manhua' | 'manga',
  aniFormat:  'MANHWA' | 'MANHUA' | 'MANGA',
  malType:    'manhwa' | 'manhua' | 'manga',
  dbTitles:   Set<string>   // already in DB — for counting "new" MU results
): Promise<{ results: SeriesData[]; nextState: TypeState; usedSource: string }> {

  let nextState = { ...state }
  let results:  SeriesData[] = []
  let usedSource: string = state.source_mode

  if (state.source_mode === 'mu') {
    // ── MU mode ──────────────────────────────────────────────────
    const nextPage = state.page + 1
    nextState.page = nextPage

    const muRaw   = dedupeWithin(await fetchMangaUpdatesByType(count + 5, nextPage, muType))
    // Count how many are actually new (not already in DB)
    const muFresh = muRaw.filter(s => !dbTitles.has(s.title.toLowerCase()))

    if (muFresh.length === 0) {
      // MU gave nothing new — increment zero streak
      nextState.mu_zero_streak = state.mu_zero_streak + 1

      if (nextState.mu_zero_streak >= MU_ZERO_THRESHOLD) {
        // Switch to MAL
        nextState.source_mode  = 'mal'
        nextState.mal_run_count = 0
        usedSource = 'mal (switched from mu)'
      }

      // Fall through to MAL/AniList regardless for this run
      const malPage = state.mal_run_count + 1
      const malRaw  = dedupeWithin(await fetchJikanByType(count + 5, malPage, malType))
      results       = malRaw.slice(0, count)

      // Fill shortfall with AniList
      if (results.length < count) {
        const aniRaw = dedupeWithin(await fetchAniListByFormat(count + 5, aniFormat))
        const fresh  = dedupeAgainst(results, aniRaw)
        results.push(...fresh.slice(0, count - results.length))
      }
    } else {
      // MU gave fresh results — reset zero streak, use MU
      nextState.mu_zero_streak = 0
      results = muFresh.slice(0, count)

      // Fill shortfall with AniList if needed
      if (results.length < count) {
        const aniRaw = dedupeWithin(await fetchAniListByFormat(count + 5, aniFormat))
        const fresh  = dedupeAgainst(results, aniRaw)
        results.push(...fresh.slice(0, count - results.length))
      }
    }
  } else {
    // ── MAL mode ─────────────────────────────────────────────────
    const malPage = state.mal_run_count + 1
    nextState.mal_run_count = malPage

    if (malPage >= MAL_RUN_LIMIT) {
      // Time to check if MU has new stuff again
      const muCheckPage = state.page + 1
      const muRaw       = dedupeWithin(await fetchMangaUpdatesByType(count + 5, muCheckPage, muType))
      const muFresh     = muRaw.filter(s => !dbTitles.has(s.title.toLowerCase()))

      if (muFresh.length > 0) {
        // MU is back — switch back
        nextState.source_mode   = 'mu'
        nextState.page          = muCheckPage
        nextState.mu_zero_streak = 0
        nextState.mal_run_count  = 0
        results    = muFresh.slice(0, count)
        usedSource = 'mu (switched back from mal)'
      } else {
        // MU still dry — reset MAL run counter and keep going with MAL
        nextState.mal_run_count  = 0
        nextState.mu_zero_streak = MU_ZERO_THRESHOLD // stays at threshold
        usedSource = 'mal (mu still dry)'

        const malRaw = dedupeWithin(await fetchJikanByType(count + 5, malPage, malType))
        results = malRaw.slice(0, count)
      }
    } else {
      // Still in MAL stint
      usedSource = `mal (run ${malPage}/${MAL_RUN_LIMIT})`
      const malRaw = dedupeWithin(await fetchJikanByType(count + 5, malPage, malType))
      results = malRaw.slice(0, count)
    }

    // Fill shortfall with AniList in either case
    if (results.length < count) {
      const aniRaw = dedupeWithin(await fetchAniListByFormat(count + 5, aniFormat))
      const fresh  = dedupeAgainst(results, aniRaw)
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
    .eq('action', 'auto_rec_submit')
    .eq('user_id', systemUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastDetails = (lastLog?.details as any) ?? {}

  // Parse per-type states — falls back to default if first run
  const manhwaState: TypeState = {
    page:           lastDetails.manhwa?.page           ?? 0,
    mu_zero_streak: lastDetails.manhwa?.mu_zero_streak ?? 0,
    source_mode:    lastDetails.manhwa?.source_mode    ?? 'mu',
    mal_run_count:  lastDetails.manhwa?.mal_run_count  ?? 0,
  }
  const manhuaState: TypeState = {
    page:           lastDetails.manhua?.page           ?? 0,
    mu_zero_streak: lastDetails.manhua?.mu_zero_streak ?? 0,
    source_mode:    lastDetails.manhua?.source_mode    ?? 'mu',
    mal_run_count:  lastDetails.manhua?.mal_run_count  ?? 0,
  }
  const mangaState: TypeState = {
    page:           lastDetails.manga?.page           ?? 0,
    mu_zero_streak: lastDetails.manga?.mu_zero_streak ?? 0,
    source_mode:    lastDetails.manga?.source_mode    ?? 'mu',
    mal_run_count:  lastDetails.manga?.mal_run_count  ?? 0,
  }

  // 4. Build a set of existing DB titles (lowercase) for "new result" detection
  //    Only need titles from auto-submitter entries to keep query fast
  const { data: existingRecs } = await supabase
    .from('recommendations')
    .select('title')
    .eq('ai_model', 'auto-submitter')

  const dbTitles = new Set(
    (existingRecs ?? []).map((r: any) => r.title.toLowerCase())
  )

  // 5. Fetch each type using smart switching — runs independently per type
  const [manhwaResult, manhuaResult, mangaResult] = await Promise.all([
    fetchForType(manhwaState, MANHWA_COUNT, 'manhwa', 'MANHWA', 'manhwa', dbTitles),
    fetchForType(manhuaState, MANHUA_COUNT, 'manhua', 'MANHUA', 'manhua', dbTitles),
    fetchForType(mangaState,  MANGA_COUNT,  'manga',  'MANGA',  'manga',  dbTitles),
  ])

  // 6. Combine with global dedupe
  const series: SeriesData[] = dedupeWithin([
    ...manhwaResult.results,
    ...manhuaResult.results,
    ...mangaResult.results,
  ])

  if (series.length === 0) {
    return NextResponse.json({ error: 'All sources failed to return data.' }, { status: 502 })
  }

  // 7. Process each series
  const report = {
    submitted: [] as { title: string; type: string; source: string }[],
    skipped:   [] as { title: string; reason: string }[],
    failed:    [] as { title: string; error: string }[],
  }

  for (const s of series) {
    if (!s.title.trim()) {
      report.skipped.push({ title: '(empty)', reason: 'Empty title from source' })
      continue
    }

    try {
      const { data: existing } = await supabase
        .from('recommendations')
        .select('id, title')
        .ilike('title', s.title.trim())
        .maybeSingle()

      if (existing) {
        report.skipped.push({
          title:  s.title,
          reason: `Duplicate — already exists as "${existing.title}" (id: ${existing.id})`,
        })
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
          anilist_id:         s.anilist_id,
          mal_id:             s.mal_id,
          mangadex_id:        s.mangadex_id,
        } as any)

      if (insertError) {
        report.failed.push({ title: s.title, error: insertError.message })
        continue
      }

      report.submitted.push({ title: s.title, type: s.type, source: s.source })
    } catch (err: any) {
      report.failed.push({ title: s.title, error: err?.message ?? 'Unknown error' })
    }
  }

  // 8. Log run — store full state for each type so next run picks up correctly
  await supabase.from('activity_logs').insert({
    user_id:     systemUserId,
    action:      'auto_rec_submit',
    entity_type: 'recommendations',
    details: {
      submitted_count: report.submitted.length,
      skipped_count:   report.skipped.length,
      failed_count:    report.failed.length,
      // Full state stored per type
      manhwa: manhwaResult.nextState,
      manhua: manhuaResult.nextState,
      manga:  mangaResult.nextState,
      // Human-readable source info for debugging
      sources: {
        manhwa: manhwaResult.usedSource,
        manhua: manhuaResult.usedSource,
        manga:  mangaResult.usedSource,
      },
    },
  } as any)

  return NextResponse.json({
    submitted_count: report.submitted.length,
    skipped_count:   report.skipped.length,
    failed_count:    report.failed.length,
    sources:  {
      manhwa: manhwaResult.usedSource,
      manhua: manhuaResult.usedSource,
      manga:  mangaResult.usedSource,
    },
    states: {
      manhwa: manhwaResult.nextState,
      manhua: manhuaResult.nextState,
      manga:  mangaResult.nextState,
    },
    report,
  })
}