import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Ratio config ──────────────────────────────────────────────────
const BATCH_SIZE   = 20
const MANHWA_COUNT = 10  // 50%
const MANHUA_COUNT = 6   // 30%
const MANGA_COUNT  = 4   // 20%

// ── Sort rotation — cycles every 10 pages per type ───────────────
// This prevents hitting the same top-rated wall forever
const SORT_ORDERS = ['rating', 'subscribers', 'latest', 'votes'] as const
type SortOrder = typeof SORT_ORDERS[number]

function resolveSortOrder(page: number): SortOrder {
  const index = Math.floor((page - 1) / 10) % SORT_ORDERS.length
  return SORT_ORDERS[index]
}

// Normalize page within the current sort block (1-10, then resets)
function resolveLocalPage(page: number): number {
  return ((page - 1) % 10) + 1
}

// ── Helpers ───────────────────────────────────────────────────────

function mapStatus(raw: string): 'ongoing' | 'completed' | 'hiatus' | 'cancelled' {
  const s = raw.toLowerCase()
  if (s.includes('complet') || s.includes('finish'))        return 'completed'
  if (s.includes('hiatus'))                                 return 'hiatus'
  if (s.includes('cancel') || s.includes('discontinu'))     return 'cancelled'
  return 'ongoing'
}

function mapAniListFormat(format: string): 'manga' | 'manhwa' | 'manhua' | 'webtoon' | 'comic' | 'other' {
  const map: Record<string, 'manga' | 'manhwa' | 'manhua' | 'webtoon' | 'comic' | 'other'> = {
    MANGA: 'manga', MANHWA: 'manhwa', MANHUA: 'manhua',
    ONE_SHOT: 'manga', NOVEL: 'other',
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

// ── MangaUpdates fetcher by type + rotating sort ──────────────────

async function fetchMangaUpdatesByType(
  limit:  number,
  page:   number,
  muType: 'Manhwa' | 'Manhua' | 'Manga'
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

    const internalType: 'manga' | 'manhwa' | 'manhua' =
      muType === 'Manhwa' ? 'manhwa' :
      muType === 'Manhua' ? 'manhua' : 'manga'

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
          type:               internalType,
          status:             mapStatus(detail?.status ?? record.status ?? ''),
          genres:             sanitizeGenres([...new Set([...genreList, ...categoryList])]),
          cover_url:          coverUrl,
          author:             authors[0] ?? firstCredit,
          artist:             artists[0] ?? authors[0] ?? firstCredit,
          year_released:      year,
          chapter_count:      detail?.latest_chapter ?? record.latest_chapter ?? null,
          official_platforms: resolvePlatforms(internalType),
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

// ── AniList fallback by format ────────────────────────────────────

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

// ── Jikan fallback ────────────────────────────────────────────────

async function fetchJikanPopular(limit: number): Promise<SeriesData[]> {
  try {
    const res = await fetch(
      `https://api.jikan.moe/v4/top/manga?limit=${limit}&type=manga`,
      { next: { revalidate: 0 } }
    )
    if (!res.ok) return []

    const data = await res.json()

    return (data.data ?? []).map((item: any): SeriesData => {
      return {
        title:              item.title_english || item.title || '',
        alternative_titles: [item.title, item.title_japanese].filter(Boolean),
        description:        item.synopsis?.replace(/\[Written by MAL Rewrite\]/g, '').trim().slice(0, 2000) || 'No description available.',
        type:               'manga',
        status:             mapStatus(item.status ?? ''),
        genres:             sanitizeGenres(item.genres?.map((g: any) => g.name) ?? []),
        cover_url:          item.images?.jpg?.large_image_url ?? item.images?.jpg?.image_url ?? null,
        author:             item.authors?.[0]?.name?.replace(', ', ' ') ?? null,
        artist:             item.authors?.[1]?.name?.replace(', ', ' ') ?? item.authors?.[0]?.name?.replace(', ', ' ') ?? null,
        year_released:      item.published?.prop?.from?.year ?? null,
        chapter_count:      item.chapters ?? null,
        official_platforms: resolvePlatforms('manga'),
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

// ── Dedupe helper ─────────────────────────────────────────────────

function dedupe(existing: SeriesData[], incoming: SeriesData[]): SeriesData[] {
  const seen = new Set(existing.map((s) => s.title.toLowerCase()))
  return incoming.filter((s) => !seen.has(s.title.toLowerCase()))
}

function dedupeWithin(series: SeriesData[]): SeriesData[] {
  const seen = new Set<string>()
  return series.filter((s) => {
    const key = s.title.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
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

  // 3. Read last pages from activity_logs
  const { data: lastLog } = await supabase
    .from('activity_logs')
    .select('details')
    .eq('action', 'auto_rec_submit')
    .eq('user_id', systemUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastDetails = (lastLog?.details as any) ?? {}
  const manhwaPage  = (lastDetails.page_manhwa ?? 0) + 1
  const manhuaPage  = (lastDetails.page_manhua ?? 0) + 1
  const mangaPage   = (lastDetails.page_manga  ?? 0) + 1

  // Log what sort order is being used this run
  const sortInfo = {
    manhwa: resolveSortOrder(manhwaPage),
    manhua: resolveSortOrder(manhuaPage),
    manga:  resolveSortOrder(mangaPage),
  }

  // 4. Fetch each type separately in parallel — fetch extra to cover within-run dupes
  const [manhwaRaw, manhuaRaw, mangaRaw] = await Promise.all([
    fetchMangaUpdatesByType(MANHWA_COUNT + 5, manhwaPage, 'Manhwa'),
    fetchMangaUpdatesByType(MANHUA_COUNT + 5, manhuaPage, 'Manhua'),
    fetchMangaUpdatesByType(MANGA_COUNT  + 5, mangaPage,  'Manga'),
  ])

  // 5. Dedupe within each bucket first, then slice to target count
  let manhwa = dedupeWithin(manhwaRaw).slice(0, MANHWA_COUNT)
  let manhua = dedupeWithin(manhuaRaw).slice(0, MANHUA_COUNT)
  let manga  = dedupeWithin(mangaRaw).slice(0, MANGA_COUNT)

  // 6. Fill shortfalls with AniList/Jikan fallbacks
  if (manhwa.length < MANHWA_COUNT) {
    const fallback = await fetchAniListByFormat(MANHWA_COUNT + 5, 'MANHWA')
    const fresh    = dedupe(manhwa, dedupeWithin(fallback))
    manhwa.push(...fresh.slice(0, MANHWA_COUNT - manhwa.length))
  }

  if (manhua.length < MANHUA_COUNT) {
    const fallback = await fetchAniListByFormat(MANHUA_COUNT + 5, 'MANHUA')
    const fresh    = dedupe(manhua, dedupeWithin(fallback))
    manhua.push(...fresh.slice(0, MANHUA_COUNT - manhua.length))
  }

  if (manga.length < MANGA_COUNT) {
    const fallback = await fetchJikanPopular(MANGA_COUNT + 5)
    const fresh    = dedupe(manga, dedupeWithin(fallback))
    manga.push(...fresh.slice(0, MANGA_COUNT - manga.length))
  }

  // 7. Combine and do a final global dedupe across all three buckets
  const series: SeriesData[] = dedupeWithin([...manhwa, ...manhua, ...manga])

  if (series.length === 0) {
    return NextResponse.json({ error: 'All sources failed to return data.' }, { status: 502 })
  }

  // 8. Process each series
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
      // Duplicate check against DB
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

  // 9. Log run — advance all three pages
  await supabase.from('activity_logs').insert({
    user_id:     systemUserId,
    action:      'auto_rec_submit',
    entity_type: 'recommendations',
    details: {
      submitted_count: report.submitted.length,
      skipped_count:   report.skipped.length,
      failed_count:    report.failed.length,
      page_manhwa:     manhwaPage,
      page_manhua:     manhuaPage,
      page_manga:      mangaPage,
      sort_used:       sortInfo,
    },
  } as any)

  return NextResponse.json({
    submitted_count: report.submitted.length,
    skipped_count:   report.skipped.length,
    failed_count:    report.failed.length,
    pages:           { manhwa: manhwaPage, manhua: manhuaPage, manga: mangaPage },
    sort_used:       sortInfo,
    report,
  })
}