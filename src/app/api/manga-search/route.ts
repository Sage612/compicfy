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
  source: 'jikan' | 'mangadex' | 'anilist'
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
      source: 'jikan',
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
        source: 'mangadex',
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
        source: 'anilist',
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
    const key = r.title.toLowerCase().replace(/\s+/g, '')
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
    // Run all three in parallel with fallback
    const [jikan, mangadex, anilist] = await Promise.allSettled([
      searchJikan(query),
      searchMangaDex(query),
      searchAniList(query),
    ])

    const all: MangaResult[] = [
      ...(jikan.status === 'fulfilled' ? jikan.value : []),
      ...(mangadex.status === 'fulfilled' ? mangadex.value : []),
      ...(anilist.status === 'fulfilled' ? anilist.value : []),
    ]

    const deduplicated = deduplicateResults(all)

    return NextResponse.json({ results: deduplicated.slice(0, 10) })
  } catch {
    return NextResponse.json({ results: [] })
  }
}