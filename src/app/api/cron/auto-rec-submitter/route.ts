import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE = 20

// ── Helpers ───────────────────────────────────────────────────────

function mapType(raw: string): 'manga' | 'manhwa' | 'manhua' | 'webtoon' | 'comic' | 'other' {
  const t = raw.toLowerCase()
  if (t.includes('manhwa') || t.includes('korean'))   return 'manhwa'
  if (t.includes('manhua') || t.includes('chinese'))  return 'manhua'
  if (t.includes('webtoon'))                          return 'webtoon'
  if (t.includes('comic'))                            return 'comic'
  if (t.includes('manga'))                            return 'manga'
  return 'other'
}

function mapStatus(raw: string): 'ongoing' | 'completed' | 'hiatus' | 'cancelled' {
  const s = raw.toLowerCase()
  if (s.includes('complet') || s.includes('finish'))          return 'completed'
  if (s.includes('hiatus'))                                   return 'hiatus'
  if (s.includes('cancel') || s.includes('discontinu'))       return 'cancelled'
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
  // Keep max 5, trim whitespace, remove empty strings
  return genres
    .map((g) => g.trim())
    .filter(Boolean)
    .slice(0, 5)
}

// ── Normalised shape we work with internally ──────────────────────

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
  content_rating:     'all_ages' | 'teen' | 'mature' | 'adult'
  // Source IDs for chapter-check cron to use later
  mangaupdates_id:    string | null
  anilist_id:         string | null
  mal_id:             string | null
  mangadex_id:        string | null
  source:             'mangaupdates' | 'anilist' | 'jikan'
}

// ── Source 1: MangaUpdates top series ────────────────────────────

async function fetchMangaUpdatesTop(limit: number): Promise<SeriesData[]> {
  try {
    // MangaUpdates /v1/series/search with orderby=rating gives top-rated series
    const res = await fetch('https://api.mangaupdates.com/v1/series/search', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderby:  'rating',
        asc:      'desc',
        perpage:  limit,
        type:     'series',
      }),
      next: { revalidate: 0 },
    })
    if (!res.ok) return []

    const data  = await res.json()
    const items = data.results ?? []

    // Fetch full detail for each (author/artist/description live in detail endpoint)
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

        const allCredits = detail?.authors ?? record.authors ?? []
        const authors    = allCredits.filter((a: any) => a.type?.toLowerCase() === 'author').map((a: any) => a.name ?? '')
        const artists    = allCredits.filter((a: any) => a.type?.toLowerCase() === 'artist').map((a: any) => a.name ?? '')
        const firstCredit = allCredits[0]?.name ?? null

        const genreList    = (detail?.genres    ?? record.genres    ?? []).map((g: any) => g.genre ?? g)
        const categoryList = (detail?.categories ?? record.categories ?? []).slice(0, 3).map((c: any) => c.category ?? c)

        const muType = (detail?.type ?? record.type ?? '').toLowerCase()

        const rawDesc   = detail?.description ?? record.description ?? ''
        const cleanDesc = rawDesc.replace(/<[^>]*>/g, '').trim().slice(0, 2000)

        const altTitles: string[] = []
        ;(detail?.associated ?? record.associated ?? []).forEach((a: any) => {
          if (a.title) altTitles.push(a.title)
        })

        const coverUrl =
          detail?.image?.url?.original ??
          detail?.image?.url?.thumb    ??
          record.image?.url?.original  ??
          record.image?.url?.thumb     ?? null

        const year = detail?.year ? parseInt(detail.year) : record.year ? parseInt(record.year) : null

        // Determine official platforms from type
        const platforms = resolvePlatforms(mapType(muType))

        return {
          title:              detail?.title ?? record.title ?? '',
          alternative_titles: altTitles.slice(0, 5),
          description:        cleanDesc || 'No description available.',
          type:               mapType(muType),
          status:             mapStatus(detail?.status ?? record.status ?? ''),
          genres:             sanitizeGenres([...new Set([...genreList, ...categoryList])]),
          cover_url:          coverUrl,
          author:             authors[0] ?? firstCredit,
          artist:             artists[0] ?? authors[0] ?? firstCredit,
          year_released:      year,
          chapter_count:      detail?.latest_chapter ?? record.latest_chapter ?? null,
          official_platforms: platforms,
          content_rating:     'all_ages' as const,
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

// ── Source 2: AniList trending manga ─────────────────────────────

async function fetchAniListTrending(limit: number): Promise<SeriesData[]> {
  try {
    const gql = `
      query ($perPage: Int) {
        Page(perPage: $perPage) {
          media(type: MANGA, sort: TRENDING_DESC, status_in: [RELEASING, FINISHED]) {
            id
            title { romaji english native }
            description(asHtml: false)
            genres
            coverImage { extraLarge large }
            staff(perPage: 10) {
              edges {
                role
                node { name { full } }
              }
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
      body:    JSON.stringify({ query: gql, variables: { perPage: limit } }),
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

      const type      = mapAniListFormat(item.format)
      const platforms = resolvePlatforms(type)

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
        official_platforms: platforms,
        content_rating:     'all_ages' as const,
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

// ── Source 3: Jikan (MAL) popular manga ──────────────────────────

async function fetchJikanPopular(limit: number): Promise<SeriesData[]> {
  try {
    const res = await fetch(
      `https://api.jikan.moe/v4/top/manga?limit=${limit}&type=manga`,
      { next: { revalidate: 0 } }
    )
    if (!res.ok) return []

    const data = await res.json()

    return (data.data ?? []).map((item: any): SeriesData => {
      const type      = mapType(item.type ?? 'manga')
      const platforms = resolvePlatforms(type)

      return {
        title:              item.title_english || item.title || '',
        alternative_titles: [item.title, item.title_japanese].filter(Boolean),
        description:        item.synopsis?.replace(/\[Written by MAL Rewrite\]/g, '').trim().slice(0, 2000) || 'No description available.',
        type,
        status:             mapStatus(item.status ?? ''),
        genres:             sanitizeGenres(item.genres?.map((g: any) => g.name) ?? []),
        cover_url:          item.images?.jpg?.large_image_url ?? item.images?.jpg?.image_url ?? null,
        author:             item.authors?.[0]?.name?.replace(', ', ' ') ?? null,
        artist:             item.authors?.[1]?.name?.replace(', ', ' ') ?? item.authors?.[0]?.name?.replace(', ', ' ') ?? null,
        year_released:      item.published?.prop?.from?.year ?? null,
        chapter_count:      item.chapters ?? null,
        official_platforms: platforms,
        content_rating:     'all_ages' as const,
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

// ── Platform resolver ─────────────────────────────────────────────
// Maps comic type to a sensible default platform list
function resolvePlatforms(type: string): string[] {
  switch (type) {
    case 'manhwa':  return ['Webtoon', 'Tapas', 'Tappytoon']
    case 'manhua':  return ['Mangatoon', 'Webcomics', 'INKR']
    case 'webtoon': return ['Webtoon', 'Tapas']
    default:        return ['Mangaplus', 'Viz Media', 'INKR']
  }
}

// ── Main handler ──────────────────────────────────────────────────

export async function GET(req: Request) {
  // 1. Auth check — same pattern as chapter-check
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 2. System user — profiles id: 00000000-0000-0000-0000-000000000000, username: their_shadow, display_name: Ghost
  const systemUserId = '00000000-0000-0000-0000-000000000000'

  // 3. Fetch from MangaUpdates first, fall back to AniList then Jikan
  let series: SeriesData[] = []

  const muResults = await fetchMangaUpdatesTop(BATCH_SIZE)

  if (muResults.length >= BATCH_SIZE) {
    // MangaUpdates gave us enough — use it exclusively
    series = muResults
  } else {
    // Partial or empty — fill remaining slots with fallbacks
    series = [...muResults]
    const remaining = BATCH_SIZE - series.length

    if (remaining > 0) {
      const anilistResults = await fetchAniListTrending(remaining + 5)
      // Avoid title overlaps with MangaUpdates results
      const muTitles = new Set(series.map((s) => s.title.toLowerCase()))
      const filtered  = anilistResults.filter((s) => !muTitles.has(s.title.toLowerCase()))
      series.push(...filtered.slice(0, remaining))
    }

    // Still need more? Use Jikan
    if (series.length < BATCH_SIZE) {
      const stillNeeded  = BATCH_SIZE - series.length
      const jikanResults = await fetchJikanPopular(stillNeeded + 5)
      const existingTitles = new Set(series.map((s) => s.title.toLowerCase()))
      const filtered = jikanResults.filter((s) => !existingTitles.has(s.title.toLowerCase()))
      series.push(...filtered.slice(0, stillNeeded))
    }
  }

  if (series.length === 0) {
    return NextResponse.json({ error: 'All sources failed to return data.' }, { status: 502 })
  }

  // 4. Process each series
  const report = {
    submitted: [] as { title: string; source: string }[],
    skipped:   [] as { title: string; reason: string }[],
    failed:    [] as { title: string; error: string }[],
  }

  for (const s of series) {
    // Skip if title is empty
    if (!s.title.trim()) {
      report.skipped.push({ title: '(empty)', reason: 'Empty title from source' })
      continue
    }

    try {
      // 5. Duplicate check — case-insensitive title match
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

      // 6. Genres must have at least 1 — fallback to ['Action'] if empty
      const genres = s.genres.length > 0 ? s.genres : ['Action']

      // 7. Insert — is_approved false, is_ai_generated true, ai_model = 'auto-submitter'
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
          content_rating:     'all_ages',      // Default — admin can update during review
          is_approved:        false,           // Admin reviews manually
          is_ai_generated:    true,            // System label
          ai_model:           'auto-submitter',// Distinguishes from user submissions
          // Store source IDs so chapter-check cron can track these too
          mangaupdates_id:    s.mangaupdates_id,
          anilist_id:         s.anilist_id,
          mal_id:             s.mal_id,
          mangadex_id:        s.mangadex_id,
        } as any)

      if (insertError) {
        report.failed.push({ title: s.title, error: insertError.message })
        continue
      }

      report.submitted.push({ title: s.title, source: s.source })
    } catch (err: any) {
      report.failed.push({ title: s.title, error: err?.message ?? 'Unknown error' })
    }
  }

  // 8. Log the run to activity_logs so it shows in your admin logs viewer
  await supabase.from('activity_logs').insert({
    user_id:     systemUserId,
    action:      'auto_rec_submit',
    entity_type: 'recommendations',
    details: {
      submitted_count: report.submitted.length,
      skipped_count:   report.skipped.length,
      failed_count:    report.failed.length,
    },
  } as any)

  return NextResponse.json({
    submitted_count: report.submitted.length,
    skipped_count:   report.skipped.length,
    failed_count:    report.failed.length,
    report,
  })
}