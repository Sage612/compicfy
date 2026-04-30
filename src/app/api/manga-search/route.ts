import { NextResponse } from 'next/server'
import type { SearchResult } from '@/app/api/search/route'

// ── Jikan (MyAnimeList) ───────────────────────────────────────────
async function searchJikan(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(query)}&limit=5&sfw=true`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return []
    const data = await res.json()

    return (data.data ?? []).map((item: any): SearchResult => {
      const title  = item.title_english || item.title || ''
      const author = item.authors?.[0]?.name?.replace(/,\s*/, ' ') ?? ''
      const artist = item.authors?.[1]?.name?.replace(/,\s*/, ' ') ?? author
      const cover  = item.images?.jpg?.large_image_url ?? item.images?.jpg?.image_url ?? ''
      const genres = item.genres?.map((g: any) => g.name) ?? []
      const type   = mapType(item.type)
      const status = mapStatus(item.status)
      const desc   = item.synopsis?.replace(/\[Written by MAL Rewrite\]/g, '').trim() ?? ''

      return {
        id:        `jikan-${item.mal_id}`,
        title,
        type,
        cover_url: cover || null,
        author:    author || null,
        genres,
        status,
        source:    'jikan',
        prefill: {
          title,
          type,
          status,
          genres:             genres.slice(0, 5),
          description:        desc,
          author,
          artist,
          cover_url:          cover,
          year_released:      item.published?.prop?.from?.year ?? null,
          chapter_count:      item.chapters ?? null,
          alternative_titles: [item.title, item.title_japanese].filter(Boolean),
          score:              item.score ?? null,
        },
      }
    })
  } catch {
    return []
  }
}

// ── MangaDex ──────────────────────────────────────────────────────
async function searchMangaDex(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `https://api.mangadex.org/manga?title=${encodeURIComponent(query)}&limit=5&includes[]=cover_art&includes[]=author&includes[]=artist&contentRating[]=safe&contentRating[]=suggestive`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return []
    const data = await res.json()

    return (data.data ?? []).map((item: any): SearchResult => {
      const attr      = item.attributes
      const authorRel = item.relationships?.find((r: any) => r.type === 'author')
      const artistRel = item.relationships?.find((r: any) => r.type === 'artist')
      const coverRel  = item.relationships?.find((r: any) => r.type === 'cover_art')
      const coverFile = coverRel?.attributes?.fileName
      const cover     = coverFile
        ? `https://uploads.mangadex.org/covers/${item.id}/${coverFile}.512.jpg`
        : ''

      const title = String(
        attr.title?.en ||
        attr.title?.['ja-ro'] ||
        Object.values(attr.title ?? {})[0] ||
        ''
      )
      const desc = String(
        attr.description?.en ||
        Object.values(attr.description ?? {})[0] ||
        ''
      ).slice(0, 2000)

      const genres = attr.tags
        ?.filter((t: any) => t.attributes?.group === 'genre')
        .map((t: any) => t.attributes?.name?.en ?? '')
        .filter(Boolean) ?? []

      const author = authorRel?.attributes?.name ?? ''
      const artist = artistRel?.attributes?.name ?? author
      const type   = 'manga'
      const status = mapStatus(attr.status)

      const altTitles = (attr.altTitles ?? [])
        .flatMap((a: any) => Object.values(a))
        .filter(Boolean)
        .slice(0, 5) as string[]

      return {
        id:        `mangadex-${item.id}`,
        title,
        type,
        cover_url: cover || null,
        author:    author || null,
        genres,
        status,
        source:    'mangadex',
        prefill: {
          title,
          type,
          status,
          genres:             genres.slice(0, 5),
          description:        desc,
          author,
          artist,
          cover_url:          cover,
          year_released:      attr.year ?? null,
          chapter_count:      attr.lastChapter ? parseInt(attr.lastChapter) : null,
          alternative_titles: altTitles,
          score:              null,
        },
      }
    })
  } catch {
    return []
  }
}

// ── AniList ───────────────────────────────────────────────────────
async function searchAniList(query: string): Promise<SearchResult[]> {
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
            edges { role node { name { full } } }
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
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ query: gql, variables: { search: query } }),
      next:    { revalidate: 3600 },
    })
    if (!res.ok) return []
    const data  = await res.json()
    const items = data?.data?.Page?.media ?? []

    return items.map((item: any): SearchResult => {
      const author = item.staff?.edges?.find((e: any) =>
        e.role?.toLowerCase().includes('story') || e.role?.toLowerCase().includes('author')
      )?.node?.name?.full ?? ''

      const artist = item.staff?.edges?.find((e: any) =>
        e.role?.toLowerCase().includes('art') || e.role?.toLowerCase().includes('illustrat')
      )?.node?.name?.full ?? author

      const title  = item.title?.english || item.title?.romaji || ''
      const cover  = item.coverImage?.extraLarge || item.coverImage?.large || ''
      const genres = item.genres ?? []
      const type   = mapAniListFormat(item.format)
      const status = mapAniListStatus(item.status)
      const desc   = item.description?.replace(/<[^>]*>/g, '').trim() ?? ''

      return {
        id:        `anilist-${item.id}`,
        title,
        type,
        cover_url: cover || null,
        author:    author || null,
        genres,
        status,
        source:    'anilist',
        prefill: {
          title,
          type,
          status,
          genres:             genres.slice(0, 5),
          description:        desc,
          author,
          artist,
          cover_url:          cover,
          year_released:      item.startDate?.year ?? null,
          chapter_count:      item.chapters ?? null,
          alternative_titles: [item.title?.romaji, item.title?.native].filter(Boolean),
          score:              item.averageScore ? item.averageScore / 10 : null,
        },
      }
    })
  } catch {
    return []
  }
}

// ── MangaUpdates ──────────────────────────────────────────────────
async function searchMangaUpdates(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch('https://api.mangaupdates.com/v1/series/search', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ search: query, perpage: 5 }),
      next:    { revalidate: 3600 },
    })
    if (!res.ok) return []
    const data  = await res.json()
    const items = data.results ?? []

    return items.map((item: any): SearchResult => {
      const record   = item.record ?? {}
      const credits  = record.authors ?? []
      const authors  = credits.filter((a: any) => a.type?.toLowerCase() === 'author').map((a: any) => a.name ?? '')
      const artists  = credits.filter((a: any) => a.type?.toLowerCase() === 'artist').map((a: any) => a.name ?? '')
      const first    = credits[0]?.name ?? ''

      const genres = [
        ...(record.genres ?? []).map((g: any) => g.genre ?? g),
        ...(record.categories ?? []).slice(0, 3).map((c: any) => c.category ?? c),
      ]

      const muType = record.type?.toLowerCase() ?? ''
      let type = 'manga'
      if (muType.includes('manhwa') || muType.includes('korean'))  type = 'manhwa'
      else if (muType.includes('manhua') || muType.includes('chinese')) type = 'manhua'
      else if (muType.includes('webtoon')) type = 'webtoon'
      else if (muType.includes('comic'))   type = 'comic'

      const muStatus = (record.status ?? '').toLowerCase()
      let status = 'ongoing'
      if (muStatus.includes('complete'))                           status = 'completed'
      else if (muStatus.includes('hiatus'))                        status = 'hiatus'
      else if (muStatus.includes('cancel') || muStatus.includes('discontinu')) status = 'cancelled'

      const cover = record.image?.url?.original ?? record.image?.url?.thumb ?? ''
      const desc  = (record.description ?? '').replace(/<[^>]*>/g, '').trim().slice(0, 2000)
      const title = record.title ?? ''
      const author = authors[0] ?? first
      const artist = artists[0] ?? author

      const altTitles = (record.associated ?? [])
        .map((a: any) => a.title).filter(Boolean).slice(0, 5)

      return {
        id:        `mangaupdates-${record.series_id}`,
        title,
        type,
        cover_url: cover || null,
        author:    author || null,
        genres:    [...new Set(genres)].slice(0, 8),
        status,
        source:    'mangaupdates',
        prefill: {
          title,
          type,
          status,
          genres:             [...new Set(genres)].slice(0, 5),
          description:        desc,
          author,
          artist,
          cover_url:          cover,
          year_released:      record.year ? parseInt(record.year) : null,
          chapter_count:      record.latest_chapter ?? null,
          alternative_titles: altTitles,
          score:              record.bayesian_rating ? parseFloat(record.bayesian_rating) : null,
        },
      }
    })
  } catch {
    return []
  }
}

// ── Helpers ───────────────────────────────────────────────────────
function mapType(t: string): string {
  const m: Record<string, string> = {
    Manga: 'manga', Manhwa: 'manhwa', Manhua: 'manhua',
    Webtoon: 'webtoon', 'One-shot': 'manga', Novel: 'other',
  }
  return m[t] ?? 'manga'
}

function mapStatus(s: string): string {
  const l = (s ?? '').toLowerCase()
  if (l.includes('finish') || l.includes('complet')) return 'completed'
  if (l.includes('hiatus') || l.includes('on_hiatus')) return 'hiatus'
  if (l.includes('cancel') || l.includes('discontinu')) return 'cancelled'
  return 'ongoing'
}

function mapAniListFormat(f: string): string {
  const m: Record<string, string> = {
    MANGA: 'manga', MANHWA: 'manhwa', MANHUA: 'manhua',
    ONE_SHOT: 'manga', NOVEL: 'other',
  }
  return m[f] ?? 'manga'
}

function mapAniListStatus(s: string): string {
  const m: Record<string, string> = {
    FINISHED: 'completed', RELEASING: 'ongoing',
    NOT_YET_RELEASED: 'ongoing', CANCELLED: 'cancelled', HIATUS: 'hiatus',
  }
  return m[s] ?? 'ongoing'
}

function dedup(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>()
  return results.filter(r => {
    const key = r.title.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── Handler ───────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''

  if (q.length < 2) return NextResponse.json({ results: [] })

  const [jikan, mangadex, anilist, mangaupdates] = await Promise.allSettled([
    searchJikan(q),
    searchMangaDex(q),
    searchAniList(q),
    searchMangaUpdates(q),
  ])

  const all: SearchResult[] = [
    ...(jikan.status        === 'fulfilled' ? jikan.value        : []),
    ...(mangadex.status     === 'fulfilled' ? mangadex.value     : []),
    ...(anilist.status      === 'fulfilled' ? anilist.value      : []),
    ...(mangaupdates.status === 'fulfilled' ? mangaupdates.value : []),
  ]

  return NextResponse.json({ results: dedup(all).slice(0, 12) })
}