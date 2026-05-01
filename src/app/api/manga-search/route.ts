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
  source: 'jikan' | 'mangadex' | 'anilist' | 'mangaupdates'
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

// ── MangaDex ─────────────────────────────────────────────────────
async function searchMangaDex(query: string): Promise<MangaResult[]> {
  try {
    const res = await fetch(
      `https://api.mangadex.org/manga?title=${encodeURIComponent(query)}&limit=5&includes[]=cover_art&includes[]=author&includes[]=artist&contentRating[]=safe&contentRating[]=suggestive`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return []
    const data = await res.json()

    return (data.data ?? []).map((item: any) => {
      const attr = item.attributes
      const authorRel = item.relationships?.find((r: any) => r.type === 'author')
      const artistRel = item.relationships?.find((r: any) => r.type === 'artist')
      const coverRel = item.relationships?.find((r: any) => r.type === 'cover_art')
      const coverFile = coverRel?.attributes?.fileName
      const coverUrl = coverFile
        ? `https://uploads.mangadex.org/covers/${item.id}/${coverFile}.512.jpg`
        : ''

      const title =
        attr.title?.en ||
        attr.title?.['ja-ro'] ||
        Object.values(attr.title ?? {})[0] ||
        ''

      const description =
        attr.description?.en ||
        Object.values(attr.description ?? {})[0] ||
        ''

      return {
        id: `mangadex-${item.id}`,
        title: String(title),
        alternativeTitles: Object.values(attr.altTitles?.[0] ?? {}),
        author: authorRel?.attributes?.name ?? '',
        artist: artistRel?.attributes?.name ?? authorRel?.attributes?.name ?? '',
        description: String(description).slice(0, 2000),
        genres: attr.tags
          ?.filter((t: any) => t.attributes?.group === 'genre')
          .map((t: any) => t.attributes?.name?.en ?? '') ?? [],
        type: 'manga',
        status: mapStatus(attr.status),
        coverUrl,
        year: attr.year ?? null,
        chapters: attr.lastChapter ? parseInt(attr.lastChapter) : null,
        score: null,
        source: 'mangadex' as const,
      }
    })
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
        body: JSON.stringify({
          search: query,
          perpage: 5,
          type: 'series',
        }),
        next: { revalidate: 3600 },
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    const items = data.results ?? []

    return items.map((item: any) => {
      const record = item.record ?? {}

      // Authors and artists — handle missing/inconsistent type casing
      const allCredits = record.authors ?? record.author_info ?? []

      const authors = allCredits
        .filter((a: any) => a.type?.toLowerCase() === 'author')
        .map((a: any) => a.name ?? a.author_name ?? '')
        .filter(Boolean)

      const artists = allCredits
        .filter((a: any) => a.type?.toLowerCase() === 'artist')
        .map((a: any) => a.name ?? a.author_name ?? '')
        .filter(Boolean)

      // Fallback: if no typed split, treat first entry as author
      const firstCredit = allCredits[0]?.name ?? allCredits[0]?.author_name ?? ''

      // Genres
      const genres = (record.genres ?? []).map((g: any) => g.genre ?? g)

      // Categories (used as additional genre hints)
      const categories = (record.categories ?? [])
        .slice(0, 3)
        .map((c: any) => c.category ?? c)

      // Type mapping
      const muType = record.type?.toLowerCase() ?? ''
      let type = 'manga'
      if (muType.includes('manhwa') || muType.includes('korean')) type = 'manhwa'
      else if (muType.includes('manhua') || muType.includes('chinese')) type = 'manhua'
      else if (muType.includes('webtoon')) type = 'webtoon'
      else if (muType.includes('comic')) type = 'comic'

      // Status
      let status = 'ongoing'
      const muStatus = (record.status ?? '').toLowerCase()
      if (muStatus.includes('complete')) status = 'completed'
      else if (muStatus.includes('hiatus')) status = 'hiatus'
      else if (muStatus.includes('cancel') || muStatus.includes('discontinu')) status = 'cancelled'

      // Cover image
      const coverUrl = record.image?.url?.original ?? record.image?.url?.thumb ?? ''

      // Description — strip HTML tags
      const rawDesc = record.description ?? ''
      const description = rawDesc.replace(/<[^>]*>/g, '').trim().slice(0, 2000)

      // Year from first published
      const year = record.year ? parseInt(record.year) : null

      // Alternative titles
      const altTitles: string[] = []
      ;(record.associated ?? []).forEach((a: any) => {
        if (a.title) altTitles.push(a.title)
      })

      return {
        id: `mangaupdates-${record.series_id}`,
        title: record.title ?? '',
        alternativeTitles: altTitles.slice(0, 5),
        author: authors[0] ?? firstCredit,
        artist: artists[0] ?? authors[0] ?? firstCredit,
        description,
        genres: [...new Set([...genres, ...categories])].slice(0, 8),
        type,
        status,
        coverUrl,
        year,
        chapters: record.latest_chapter ?? null,
        score: record.bayesian_rating ? parseFloat(record.bayesian_rating) : null,
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
    // Run all four in parallel with individual fallbacks
    const [jikan, mangadex, anilist, mangaupdates] = await Promise.allSettled([
      searchJikan(query),
      searchMangaDex(query),
      searchAniList(query),
      searchMangaUpdates(query),
    ])

    const all: MangaResult[] = [
      ...(jikan.status         === 'fulfilled' ? jikan.value         : []),
      ...(mangadex.status      === 'fulfilled' ? mangadex.value      : []),
      ...(anilist.status       === 'fulfilled' ? anilist.value       : []),
      ...(mangaupdates.status  === 'fulfilled' ? mangaupdates.value  : []),
    ]

    const deduplicated = deduplicateResults(all)

    return NextResponse.json({ results: deduplicated.slice(0, 12) })
  } catch {
    return NextResponse.json({ results: [] })
  }
}