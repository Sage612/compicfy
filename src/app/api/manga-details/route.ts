import { NextResponse } from 'next/server'

interface MangaDetail {
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
async function getJikanDetail(malId: string): Promise<MangaDetail | null> {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/manga/${malId}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const { data: item } = await res.json()
    if (!item) return null

    return {
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
    }
  } catch {
    return null
  }
}

// ── AniList ───────────────────────────────────────────────────────
async function getAniListDetail(anilistId: string): Promise<MangaDetail | null> {
  try {
    const gql = `
      query ($id: Int) {
        Media(id: $id, type: MANGA) {
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
    `
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: gql, variables: { id: parseInt(anilistId, 10) } }),
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const item = data?.data?.Media
    if (!item) return null

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
  } catch {
    return null
  }
}

// ── MangaUpdates ──────────────────────────────────────────────────
async function getMangaUpdatesDetail(seriesId: string): Promise<MangaDetail | null> {
  try {
    const detailRes = await fetch(`https://api.mangaupdates.com/v1/series/${seriesId}`, {
      next: { revalidate: 3600 },
    })
    if (!detailRes.ok) return null
    const detail = await detailRes.json()
    if (!detail) return null

    const allCredits = detail.authors ?? []

    const authors = allCredits
      .filter((a: any) => a.type?.toLowerCase() === 'author')
      .map((a: any) => a.name ?? '')
      .filter(Boolean)

    const artists = allCredits
      .filter((a: any) => a.type?.toLowerCase() === 'artist')
      .map((a: any) => a.name ?? '')
      .filter(Boolean)

    const firstCredit = allCredits[0]?.name ?? ''

    const genres = (detail.genres ?? []).map((g: any) => g.genre ?? g)
    const categories = (detail.categories ?? [])
      .slice(0, 3)
      .map((c: any) => c.category ?? c)

    const muType = (detail.type ?? '').toLowerCase()
    let type = 'manga'
    if (muType.includes('manhwa') || muType.includes('korean')) type = 'manhwa'
    else if (muType.includes('manhua') || muType.includes('chinese')) type = 'manhua'
    else if (muType.includes('webtoon')) type = 'webtoon'
    else if (muType.includes('comic')) type = 'comic'

    let status = 'ongoing'
    const muStatus = (detail.status ?? '').toLowerCase()
    if (muStatus.includes('complete')) status = 'completed'
    else if (muStatus.includes('hiatus')) status = 'hiatus'
    else if (muStatus.includes('cancel') || muStatus.includes('discontinu')) status = 'cancelled'

    const coverUrl =
      detail.image?.url?.original ??
      detail.image?.url?.thumb ?? ''

    const rawDesc = detail.description ?? ''
    const description = rawDesc.replace(/<[^>]*>/g, '').trim().slice(0, 2000)

    const year = detail.year ? parseInt(detail.year) : null

    const altTitles: string[] = []
    ;(detail.associated ?? []).forEach((a: any) => {
      if (a.title) altTitles.push(a.title)
    })

    return {
      id: `mangaupdates-${detail.series_id ?? seriesId}`,
      title: detail.title ?? '',
      alternativeTitles: altTitles.slice(0, 5),
      author: authors[0] ?? firstCredit,
      artist: artists[0] ?? authors[0] ?? firstCredit,
      description,
      genres: [...new Set([...genres, ...categories])].slice(0, 8),
      type,
      status,
      coverUrl,
      year,
      chapters: detail.latest_chapter ?? null,
      score: detail.bayesian_rating ? parseFloat(detail.bayesian_rating) : null,
      source: 'mangaupdates' as const,
    }
  } catch {
    return null
  }
}

// ── Helpers (kept identical to /api/manga-search for consistent mapping) ──
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

// ── Main handler ──────────────────────────────────────────────────
// GET /api/manga-details?source=jikan&id=jikan-123   (id may include or omit the source prefix)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const source = searchParams.get('source')?.trim()
  let id = searchParams.get('id')?.trim()

  if (!source || !id) {
    return NextResponse.json({ error: 'Missing source or id' }, { status: 400 })
  }

  // Strip a redundant "${source}-" prefix if the raw id (e.g. "jikan-123") was passed
  const prefix = `${source}-`
  if (id.startsWith(prefix)) {
    id = id.slice(prefix.length)
  }

  let result: MangaDetail | null = null

  switch (source) {
    case 'jikan':
      result = await getJikanDetail(id)
      break
    case 'anilist':
      result = await getAniListDetail(id)
      break
    case 'mangaupdates':
      result = await getMangaUpdatesDetail(id)
      break
    default:
      return NextResponse.json({ error: 'Unknown source' }, { status: 400 })
  }

  if (!result) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ result })
}