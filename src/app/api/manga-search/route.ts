import { NextResponse } from 'next/server'

interface MangaResult {
  id: string
  title: string
  alternativeTitles: string[]
  author: string
  artist: string
  description: string
  genres: string[]
  type: string
  status: string
  coverUrl: string
  year: number | null
  chapters: number | null
  score: number | null
  source: 'jikan' | 'anilist' | 'mangaupdates'
}

// ── Jikan (MyAnimeList) ──────────────────────────────────────────
async function searchJikan(query: string): Promise<MangaResult[]> {
  try {
    const res = await fetch(
      `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(query)}&limit=5&sfw=true`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return []
    const data = await res.json()

    return (data.data ?? []).map((item: any) => ({
      id: `jikan-${item.mal_id}`,
      title: item.title_english || item.title,
      alternativeTitles: [item.title, item.title_japanese].filter(Boolean),
      author: item.authors?.[0]?.name?.replace(', ', ' ') ?? '',
      artist: item.authors?.[1]?.name?.replace(', ', ' ') ?? item.authors?.[0]?.name?.replace(', ', ' ') ?? '',
      description: item.synopsis?.replace(/\[Written by MAL Rewrite\]/g, '').trim() ?? '',
      genres: item.genres?.map((g: any) => g.name) ?? [],
      type: mapType(item.type),
      status: mapStatus(item.status),
      coverUrl: item.images?.jpg?.large_image_url ?? item.images?.jpg?.image_url ?? '',
      year: item.published?.prop?.from?.year ?? null,
      chapters: item.chapters ?? null,
      score: item.score ?? null,
      source: 'jikan' as const,
    }))
  } catch {
    return []
  }
}

// ── AniList ───────────────────────────────────────────────────────
async function searchAniList(query: string): Promise<MangaResult[]> {
  try {
    const gql = `
      query ($search: String) {
        Page(perPage: 5) {
          media(search: $search, type: MANGA, sort: SEARCH_MATCH) {
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
            averageScore
            status
            format
          }
        }
      }
    `
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: gql, variables: { search: query } }),
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const data = await res.json()
    const items = data?.data?.Page?.media ?? []

    return items.map((item: any) => {
      const author = item.staff?.edges?.find((e: any) =>
        e.role?.toLowerCase().includes('story') || e.role?.toLowerCase().includes('author')
      )?.node?.name?.full ?? ''

      const artist = item.staff?.edges?.find((e: any) =>
        e.role?.toLowerCase().includes('art') || e.role?.toLowerCase().includes('illustrat')
      )?.node?.name?.full ?? author

      return {
        id: `anilist-${item.id}`,
        title: item.title?.english || item.title?.romaji || '',
        alternativeTitles: [item.title?.romaji, item.title?.native].filter(Boolean),
        author,
        artist,
        description: item.description?.replace(/<[^>]*>/g, '').trim() ?? '',
        genres: item.genres ?? [],
        type: mapAniListFormat(item.format),
        status: mapAniListStatus(item.status),
        coverUrl: item.coverImage?.extraLarge || item.coverImage?.large || '',
        year: item.startDate?.year ?? null,
        chapters: item.chapters ?? null,
        score: item.averageScore ? item.averageScore / 10 : null,
        source: 'anilist' as const,
      }
    })
  } catch {
    return []
  }
}

// ── MangaUpdates ──────────────────────────────────────────────────
async function searchMangaUpdates(query: string): Promise<MangaResult[]> {
  try {
    const res = await fetch(
      'https://api.mangaupdates.com/v1/series/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search: query, perpage: 5, type: 'series' }),
        next: { revalidate: 3600 },
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    const items = data.results ?? []

    // Fetch full series detail for each result in parallel (author/artist only in detail)
    const detailedItems = await Promise.allSettled(
      items.map(async (item: any) => {
        const record = item.record ?? {}
        const seriesId = record.series_id
        if (!seriesId) return { record, detail: null }

        try {
          const detailRes = await fetch(
            `https://api.mangaupdates.com/v1/series/${seriesId}`,
            { next: { revalidate: 3600 } }
          )
          const detail = detailRes.ok ? await detailRes.json() : null
          return { record, detail }
        } catch {
          return { record, detail: null }
        }
      })
    )

    return detailedItems
      .filter((r) => r.status === 'fulfilled')
      .map((r) => {
        const { record, detail } = (r as PromiseFulfilledResult<any>).value

        // Authors/artists come from detail endpoint
        const allCredits = detail?.authors ?? record.authors ?? []

        const authors = allCredits
          .filter((a: any) => a.type?.toLowerCase() === 'author')
          .map((a: any) => a.name ?? '')
          .filter(Boolean)

        const artists = allCredits
          .filter((a: any) => a.type?.toLowerCase() === 'artist')
          .map((a: any) => a.name ?? '')
          .filter(Boolean)

        const firstCredit = allCredits[0]?.name ?? ''

        // Genres
        const genres = (detail?.genres ?? record.genres ?? []).map((g: any) => g.genre ?? g)
        const categories = (detail?.categories ?? record.categories ?? [])
          .slice(0, 3)
          .map((c: any) => c.category ?? c)

        // Type
        const muType = (detail?.type ?? record.type ?? '').toLowerCase()
        let type = 'manga'
        if (muType.includes('manhwa') || muType.includes('korean'))  type = 'manhwa'
        else if (muType.includes('manhua') || muType.includes('chinese')) type = 'manhua'
        else if (muType.includes('webtoon')) type = 'webtoon'
        else if (muType.includes('comic'))   type = 'comic'

        // Status
        let status = 'ongoing'
        const muStatus = (detail?.status ?? record.status ?? '').toLowerCase()
        if (muStatus.includes('complete'))                              status = 'completed'
        else if (muStatus.includes('hiatus'))                          status = 'hiatus'
        else if (muStatus.includes('cancel') || muStatus.includes('discontinu')) status = 'cancelled'

        // Cover
        const coverUrl =
          detail?.image?.url?.original ??
          detail?.image?.url?.thumb ??
          record.image?.url?.original ??
          record.image?.url?.thumb ?? ''

        // Description
        const rawDesc = detail?.description ?? record.description ?? ''
        const description = rawDesc.replace(/<[^>]*>/g, '').trim().slice(0, 2000)

        // Year
        const year = detail?.year ? parseInt(detail.year) : record.year ? parseInt(record.year) : null

        // Alt titles
        const altTitles: string[] = []
        ;(detail?.associated ?? record.associated ?? []).forEach((a: any) => {
          if (a.title) altTitles.push(a.title)
        })

        return {
          id: `mangaupdates-${record.series_id}`,
          title: detail?.title ?? record.title ?? '',
          alternativeTitles: altTitles.slice(0, 5),
          author: authors[0] ?? firstCredit,
          artist: artists[0] ?? authors[0] ?? firstCredit,
          description,
          genres: [...new Set([...genres, ...categories])].slice(0, 8),
          type,
          status,
          coverUrl,
          year,
          chapters: detail?.latest_chapter ?? record.latest_chapter ?? null,
          score: detail?.bayesian_rating ? parseFloat(detail.bayesian_rating) : null,
          source: 'mangaupdates' as const,
        }
      })
  } catch {
    return []
  }
}

// ── Helpers ───────────────────────────────────────────────────────
function mapType(type: string): string {
  const map: Record<string, string> = {
    Manga: 'manga', Manhwa: 'manhwa', Manhua: 'manhua',
    Webtoon: 'webtoon', 'One-shot': 'manga', Novel: 'other',
  }
  return map[type] ?? 'manga'
}

function mapStatus(status: string): string {
  const s = status?.toLowerCase() ?? ''
  if (s.includes('finish') || s.includes('complet')) return 'completed'
  if (s.includes('hiatus') || s.includes('on_hiatus')) return 'hiatus'
  if (s.includes('cancel') || s.includes('discontinu')) return 'cancelled'
  return 'ongoing'
}

function mapAniListFormat(format: string): string {
  const map: Record<string, string> = {
    MANGA: 'manga', MANHWA: 'manhwa', MANHUA: 'manhua',
    ONE_SHOT: 'manga', NOVEL: 'other',
  }
  return map[format] ?? 'manga'
}

function mapAniListStatus(status: string): string {
  const map: Record<string, string> = {
    FINISHED: 'completed', RELEASING: 'ongoing',
    NOT_YET_RELEASED: 'ongoing', CANCELLED: 'cancelled', HIATUS: 'hiatus',
  }
  return map[status] ?? 'ongoing'
}

function deduplicateResults(results: MangaResult[]): MangaResult[] {
  const seen = new Set<string>()
  return results.filter((r) => {
    const key = r.title.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
    if (!key) return false
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── Main handler ──────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    // Run three sources in parallel (MangaDex removed for form auto-fill)
    // MangaDex is only used for chapter checking, not search
    const [jikan, anilist, mangaupdates] = await Promise.allSettled([
      searchJikan(query),
      searchAniList(query),
      searchMangaUpdates(query),
    ])

    const all: MangaResult[] = [
      ...(jikan.status         === 'fulfilled' ? jikan.value         : []),
      ...(anilist.status       === 'fulfilled' ? anilist.value       : []),
      ...(mangaupdates.status  === 'fulfilled' ? mangaupdates.value  : []),
    ]

    const deduplicated = deduplicateResults(all)

    return NextResponse.json({ results: deduplicated.slice(0, 12) })
  } catch {
    return NextResponse.json({ results: [] })
  }
}