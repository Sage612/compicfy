type NormalizedFormat = 'manga' | 'novel' | 'other'

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeFormat(raw: string | null | undefined): NormalizedFormat {
  if (!raw) return 'other'
  const r = raw.toLowerCase().trim()

  if (
    r === 'novel' ||
    r === 'light novel' ||
    r === 'light_novel' ||
    r === 'web novel' ||
    r === 'web_novel' ||
    r.includes('novel')
  ) {
    return 'novel'
  }

  if (
    r === 'manga' ||
    r === 'manhwa' ||
    r === 'manhua' ||
    r === 'webtoon' ||
    r === 'comic' ||
    r === 'comics' ||
    r === 'one-shot' ||
    r === 'one_shot' ||
    r === 'oneshot' ||
    r === 'doujinshi' ||
    r === 'oel'
  ) {
    return 'manga'
  }

  return 'other'
}

interface Candidate {
  series_id: number
  title:     string
  author?:   string
  artist?:   string
  year?:     number | null
  format:    NormalizedFormat
}

const YEAR_TOLERANCE = 1

function smartMatch(
  query:       string,
  candidates:  Candidate[],
  authorHint?: string | null,
  artistHint?: string | null,
  yearHint?:   number | null,
): Candidate | null {
  const nq = normalize(query)
  const na = authorHint ? normalize(authorHint) : null
  const nr = artistHint ? normalize(artistHint) : null

  const pool = candidates.filter(c => c.format === 'manga')

  const authorArtistConfirmed = (c: Candidate): boolean => {
    if (!na && !nr) return false
    const ca = c.author ? normalize(c.author) : ''
    const cr = c.artist ? normalize(c.artist) : ''
    const authorMatch = na ? (ca.includes(na) || na.includes(ca)) : false
    const artistMatch = nr ? (cr.includes(nr) || nr.includes(cr)) : false
    return authorMatch || artistMatch
  }

  const yearConfirmed = (c: Candidate): boolean => {
    if (!yearHint || !c.year) return false
    return Math.abs(c.year - yearHint) <= YEAR_TOLERANCE
  }

  const exactTitleMatches = pool.filter(c => normalize(c.title) === nq)

  // Exact title + year confirmed — highest confidence
  if (yearHint) {
    const yearMatch = exactTitleMatches.find(yearConfirmed)
    if (yearMatch) return yearMatch
  }

  // Exact title + author/artist confirmed
  if (na || nr) {
    const match = exactTitleMatches.find(authorArtistConfirmed)
    if (match) return match
  }

  if (exactTitleMatches.length === 1) return exactTitleMatches[0]

  if (na || nr) {
    for (const c of pool) {
      const ct = normalize(c.title)
      const isContained = ct.includes(nq) || nq.includes(ct)
      if (isContained && ct !== nq && authorArtistConfirmed(c)) return c
    }
  }

  return null
}

interface AutoFetchResult {
  link:   string | null
  source: 'auto_fetched' | null
}

async function autoFetchMangaUpdatesLink(
  title:   string,
  author?: string | null,
  artist?: string | null,
  year?:   number | null,
): Promise<string | null> {
  try {
    const res = await fetch('https://api.mangaupdates.com/v1/series/search', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ search: title, perpage: 10 }),
    })

    if (!res.ok) return null

    const json = await res.json()
    const rawResults = (json?.results ?? []) as any[]

    const candidatesNoFormat = rawResults.slice(0, 5).map((r: any) => ({
      series_id: Number(r.record?.series_id ?? 0),
      title:     String(r.record?.title ?? ''),
      author:    r.record?.author ?? '',
      artist:    r.record?.artist ?? '',
      year:      r.record?.year ? Number(r.record.year) : null,
    }))

    const candidates: Candidate[] = await Promise.all(
      candidatesNoFormat.map(async (c) => {
        if (!c.series_id) return { ...c, format: 'other' as NormalizedFormat }
        try {
          const detailRes = await fetch(`https://api.mangaupdates.com/v1/series/${c.series_id}`)
          if (!detailRes.ok) return { ...c, format: 'other' as NormalizedFormat }
          const detail = await detailRes.json()
          return { ...c, format: normalizeFormat(detail?.type ?? null) }
        } catch {
          return { ...c, format: 'other' as NormalizedFormat }
        }
      })
    )

    const match = smartMatch(title, candidates, author, artist, year)
    if (!match) return null

    return `https://www.mangaupdates.com/series/${match.series_id}`
  } catch (err) {
    console.error('[autoFetchMangaUpdatesLink] error (non-fatal):', err)
    return null
  }
}

interface ResolvedMoreInfoLink {
  more_info_link:             string | null
  more_info_link_source:      'user_submitted' | 'auto_fetched' | null
  more_info_link_verified_at: string | null
}

export async function resolveMoreInfoLink(
  userProvidedLink: string | null | undefined,
  title:            string,
  author?:          string | null,
  artist?:          string | null,
  year?:            number | null,
): Promise<ResolvedMoreInfoLink> {
  // 1. User provided a link themselves — trust it, flag for review.
  if (userProvidedLink && userProvidedLink.trim().length > 0) {
    return {
      more_info_link:             userProvidedLink.trim(),
      more_info_link_source:      'user_submitted',
      more_info_link_verified_at: null,
    }
  }

  // 2. No link given — try to auto-fetch from MangaUpdates by title,
  // corroborated by author/artist/year when available.
  const autoLink = await autoFetchMangaUpdatesLink(title, author, artist, year)
  if (autoLink) {
    return {
      more_info_link:             autoLink,
      more_info_link_source:      'auto_fetched',
      more_info_link_verified_at: null,
    }
  }

  // 3. Nothing found with sufficient confidence — leave empty.
  return {
    more_info_link:             null,
    more_info_link_source:      null,
    more_info_link_verified_at: null,
  }
}