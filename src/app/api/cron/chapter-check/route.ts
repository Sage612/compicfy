import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SITE_URL   = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://compicfy.cloud'
const BATCH_SIZE = 20

// ── Platform extraction helpers ───────────────────────────────────

function extractPlatformsFromMU(detail: any, record: any): string[] {
  const platforms = new Set<string>()

  const associated = detail?.associated ?? record?.associated ?? []
  associated.forEach((a: any) => {
    const relType = a.relation_type?.toLowerCase() ?? ''
    const name = a.title?.toLowerCase() ?? ''

    if (relType.includes('official')) {
      if (relType.includes('english')) {
        if (name.includes('viz') || relType.includes('viz')) platforms.add('Viz Media')
        if (name.includes('mangaplus') || relType.includes('mangaplus')) platforms.add('Mangaplus')
        if (name.includes('webtoon') || relType.includes('webtoon')) platforms.add('Webtoon')
        if (name.includes('tapas') || relType.includes('tapas')) platforms.add('Tapas')
        if (name.includes('tappytoon')) platforms.add('Tappytoon')
        if (name.includes('inkr')) platforms.add('INKR')
      }
    }
  })

  const pubEnglish = detail?.publication_html?.english ?? ''
  if (pubEnglish) {
    if (pubEnglish.includes('Viz')) platforms.add('Viz Media')
    if (pubEnglish.includes('MangaPlus')) platforms.add('Mangaplus')
    if (pubEnglish.includes('Webtoon')) platforms.add('Webtoon')
  }

  return Array.from(platforms).slice(0, 5)
}

function extractPlatformsFromMangaBaka(detail: any): string[] {
  const platforms = new Set<string>()

  const source = detail?.source ?? detail?.source_name ?? ''
  if (source) {
    const s = source.toLowerCase()
    if (s.includes('webtoon')) platforms.add('Webtoon')
    if (s.includes('tapas')) platforms.add('Tapas')
    if (s.includes('tappytoon')) platforms.add('Tappytoon')
    if (s.includes('mangaplus')) platforms.add('Mangaplus')
    if (s.includes('inkr')) platforms.add('INKR')
  }

  const links = detail?.external_links ?? detail?.links ?? []
  if (Array.isArray(links)) {
    links.forEach((link: any) => {
      const url = (link.url ?? link.link ?? '').toLowerCase()
      if (url.includes('webtoon.com')) platforms.add('Webtoon')
      if (url.includes('tapas.io')) platforms.add('Tapas')
      if (url.includes('tappytoon')) platforms.add('Tappytoon')
      if (url.includes('mangaplus')) platforms.add('Mangaplus')
      if (url.includes('viz.com') || url.includes('vizsignature')) platforms.add('Viz Media')
    })
  }

  return Array.from(platforms).slice(0, 5)
}

function extractPlatformsFromMangaDex(detail: any): string[] {
  const platforms = new Set<string>()

  const links = detail?.attributes?.links ?? detail?.links ?? {}
  
  if (typeof links === 'object') {
    Object.entries(links).forEach(([key, value]: [string, any]) => {
      const url = (value ?? '').toString().toLowerCase()
      if (url.includes('webtoon')) platforms.add('Webtoon')
      if (url.includes('tapas')) platforms.add('Tapas')
      if (url.includes('viz.com') || url.includes('vizsignature')) platforms.add('Viz Media')
      if (url.includes('mangaplus')) platforms.add('Mangaplus')
    })
  }

  return Array.from(platforms).slice(0, 5)
}

function extractPlatformsFromAniList(item: any): string[] {
  const platforms = new Set<string>()

  const externalLinks = item.externalLinks ?? []
  externalLinks.forEach((link: any) => {
    const site = (link.site ?? '').toLowerCase()
    const url = (link.url ?? '').toLowerCase()

    if (site.includes('official') || site.includes('web') || site.includes('eng')) {
      if (url.includes('webtoon')) platforms.add('Webtoon')
      if (url.includes('tapas')) platforms.add('Tapas')
      if (url.includes('viz.com')) platforms.add('Viz Media')
      if (url.includes('mangaplus')) platforms.add('Mangaplus')
    }
  })

  return Array.from(platforms).slice(0, 5)
}

function extractPlatformsFromJikan(item: any): string[] {
  const platforms = new Set<string>()

  const externalLinks = item.external ?? []
  externalLinks.forEach((link: any) => {
    const url = (link.url ?? '').toLowerCase()

    if (url.includes('webtoon')) platforms.add('Webtoon')
    if (url.includes('tapas')) platforms.add('Tapas')
    if (url.includes('viz.com')) platforms.add('Viz Media')
    if (url.includes('mangaplus')) platforms.add('Mangaplus')
  })

  return Array.from(platforms).slice(0, 5)
}

// ── Logging helper ────────────────────────────────────────────────
interface CheckLog {
  comic_id: string
  comic_title: string
  database_tried: string[]
  database_success: string | null
  old_chapter_count: number | null
  new_chapter_count: number | null
  platforms_found: string[]
  status: 'success' | 'no_update' | 'failed'
  reason?: string
  error?: string
  timestamp: string
}

async function logChapterCheck(
  supabase: any,
  log: CheckLog
) {
  try {
    await supabase.from('activity_logs').insert({
      user_id: null,
      action: 'chapter_check',
      entity_type: 'recommendations',
      entity_id: log.comic_id,
      details: {
        comic_title: log.comic_title,
        database_tried: log.database_tried,
        database_success: log.database_success,
        old_chapter_count: log.old_chapter_count,
        new_chapter_count: log.new_chapter_count,
        platforms_found: log.platforms_found,
        status: log.status,
        reason: log.reason,
        error: log.error,
        timestamp: log.timestamp,
      },
    })
  } catch (err) {
    console.error('Failed to log chapter check:', err)
  }
}

// ── MangaUpdates ──────────────────────────────────────────────────
async function getLatestChapterFromMU(
  id: string
): Promise<{ chapter: number | null; platforms: string[] }> {
  try {
    const res = await fetch(
      `https://api.mangaupdates.com/v1/series/${id}`,
      { next: { revalidate: 0 } }
    )
    if (res.ok) {
      const data = await res.json()
      const ch = data?.latest_chapter
      const platforms = extractPlatformsFromMU(data, {})
      if (ch && !isNaN(Number(ch))) return { chapter: Number(ch), platforms }
    }
  } catch {}
  return { chapter: null, platforms: [] }
}

// ── MangaDex ──────────────────────────────────────────────────────
async function getLatestChapterFromMangaDex(
  id: string
): Promise<{ chapter: number | null; platforms: string[] }> {
  try {
    const res = await fetch(
      `https://api.mangadex.org/manga/${id}`,
      { next: { revalidate: 0 } }
    )
    if (res.ok) {
      const data = await res.json()
      const ch = data?.data?.attributes?.lastChapter
      const platforms = extractPlatformsFromMangaDex(data.data ?? {})
      if (ch && !isNaN(Number(ch))) return { chapter: Number(ch), platforms }
    }
  } catch {}
  return { chapter: null, platforms: [] }
}

// ── MangaBaka ──────────────────────────────────────────────────────
async function getLatestChapterFromMangaBaka(
  id: string
): Promise<{ chapter: number | null; platforms: string[] }> {
  try {
    const res = await fetch(
      `https://api.mangabaka.dev/series/${id}`,
      { next: { revalidate: 0 } }
    )
    if (res.ok) {
      const data = await res.json()
      if (data?.data) {
        const chapters = data.data.total_chapters
        const platforms = extractPlatformsFromMangaBaka(data.data)
        if (chapters && !isNaN(Number(chapters))) {
          return { chapter: Number(chapters), platforms }
        }
      }
    }
  } catch {}
  return { chapter: null, platforms: [] }
}

// ── Kuroiru ───────────────────────────────────────────────────────
async function getLatestChapterFromKuroiru(
  id: string
): Promise<{ chapter: number | null; platforms: string[] }> {
  try {
    const res = await fetch(
      `https://api.kuroiru.co/manga/${id}`,
      { next: { revalidate: 0 } }
    )
    if (res.ok) {
      const data = await res.json()
      if (data?.total_chapters && !isNaN(Number(data.total_chapters))) {
        return { chapter: Number(data.total_chapters), platforms: [] }
      }
      if (data?.latest_chapter && !isNaN(Number(data.latest_chapter))) {
        return { chapter: Number(data.latest_chapter), platforms: [] }
      }
    }
  } catch {}
  return { chapter: null, platforms: [] }
}

// ── AniList ───────────────────────────────────────────────────────
async function getLatestChapterFromAniList(
  id: string
): Promise<{ chapter: number | null; platforms: string[] }> {
  try {
    const gql = `query($id:Int){Media(id:$id,type:MANGA){chapters externalLinks{url site}}}`
    const res = await fetch('https://graphql.anilist.co', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ query: gql, variables: { id: parseInt(id) } }),
      next:    { revalidate: 0 },
    })
    if (res.ok) {
      const data = await res.json()
      const media = data?.data?.Media
      const ch = media?.chapters
      const platforms = extractPlatformsFromAniList(media ?? {})
      if (ch && !isNaN(Number(ch))) return { chapter: Number(ch), platforms }
    }
  } catch {}
  return { chapter: null, platforms: [] }
}

// ── Jikan (MAL) ───────────────────────────────────────────────────
async function getLatestChapterFromJikan(
  id: string
): Promise<{ chapter: number | null; platforms: string[] }> {
  try {
    const res = await fetch(
      `https://api.jikan.moe/v4/manga/${id}`,
      { next: { revalidate: 0 } }
    )
    if (res.ok) {
      const data = await res.json()
      const manga = data?.data
      const ch = manga?.chapters
      const platforms = extractPlatformsFromJikan(manga ?? {})
      if (ch && !isNaN(Number(ch))) return { chapter: Number(ch), platforms }
    }
  } catch {}
  return { chapter: null, platforms: [] }
}

// ── Main chapter getter with fresh platform fetching ───────────────
async function getLatestChapterCount(comic: {
  id: string
  title: string
  mangaupdates_id?: string | null
  anilist_id?:      string | null
  mal_id?:          string | null
  mangadex_id?:     string | null
  mangabaka_id?:    string | null
  kuroiru_id?:      string | null
}): Promise<{ chapter: number | null; source: string | null; tried: string[]; platforms: string[] }> {
  const tried: string[] = []
  let allPlatforms: string[] = []

  // Priority order: MangaUpdates → MangaBaka → MangaDex → Kuroiru → AniList → MAL

  // 1. MangaUpdates
  if (comic.mangaupdates_id) {
    tried.push('MangaUpdates')
    const { chapter: ch, platforms } = await getLatestChapterFromMU(comic.mangaupdates_id)
    allPlatforms = [...new Set([...allPlatforms, ...platforms])]
    if (ch) return { chapter: ch, source: 'MangaUpdates', tried, platforms: allPlatforms }
  }

  // 2. MangaBaka
  if (comic.mangabaka_id) {
    tried.push('MangaBaka')
    const { chapter: ch, platforms } = await getLatestChapterFromMangaBaka(comic.mangabaka_id)
    allPlatforms = [...new Set([...allPlatforms, ...platforms])]
    if (ch) return { chapter: ch, source: 'MangaBaka', tried, platforms: allPlatforms }
  }

  // 3. MangaDex
  if (comic.mangadex_id) {
    tried.push('MangaDex')
    const { chapter: ch, platforms } = await getLatestChapterFromMangaDex(comic.mangadex_id)
    allPlatforms = [...new Set([...allPlatforms, ...platforms])]
    if (ch) return { chapter: ch, source: 'MangaDex', tried, platforms: allPlatforms }
  }

  // 4. Kuroiru
  if (comic.kuroiru_id) {
    tried.push('Kuroiru')
    const { chapter: ch, platforms } = await getLatestChapterFromKuroiru(comic.kuroiru_id)
    allPlatforms = [...new Set([...allPlatforms, ...platforms])]
    if (ch) return { chapter: ch, source: 'Kuroiru', tried, platforms: allPlatforms }
  }

  // 5. AniList
  if (comic.anilist_id) {
    tried.push('AniList')
    const { chapter: ch, platforms } = await getLatestChapterFromAniList(comic.anilist_id)
    allPlatforms = [...new Set([...allPlatforms, ...platforms])]
    if (ch) return { chapter: ch, source: 'AniList', tried, platforms: allPlatforms }
  }

  // 6. MAL via Jikan
  if (comic.mal_id) {
    tried.push('Jikan')
    const { chapter: ch, platforms } = await getLatestChapterFromJikan(comic.mal_id)
    allPlatforms = [...new Set([...allPlatforms, ...platforms])]
    if (ch) return { chapter: ch, source: 'Jikan', tried, platforms: allPlatforms }
  }

  return { chapter: null, source: null, tried, platforms: allPlatforms }
}

// ── Main handler ──────────────────────────────────────────────────
export async function GET(req: Request) {
  // Verify cron secret
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get ongoing approved comics that haven't been checked in 23+ hours
  const cutoff = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()

  const { data: comics } = await supabase
    .from('recommendations')
    .select('id, title, chapter_count, official_platforms, mangaupdates_id, anilist_id, mal_id, mangadex_id, mangabaka_id, kuroiru_id')
    .eq('is_approved', true)
    .eq('status', 'ongoing')
    .or(`last_chapter_check.is.null,last_chapter_check.lt.${cutoff}`)
    .limit(BATCH_SIZE)

  if (!comics || comics.length === 0) {
    return NextResponse.json({ checked: 0, updated: 0, logs: [] })
  }

  let updated = 0
  const results = []
  const logs: CheckLog[] = []

  for (const comic of comics) {
    const timestamp = new Date().toISOString()
    
    try {
      // Get latest chapter with fresh platform fetching
      const { chapter: newChapterCount, source, tried, platforms: freshPlatforms } = await getLatestChapterCount(comic)

      // Merge fresh platforms with stored ones
      const storedPlatforms = comic.official_platforms ?? []
      const mergedPlatforms = [...new Set([...storedPlatforms, ...freshPlatforms])].slice(0, 5)

      // Log the attempt
      const logEntry: CheckLog = {
        comic_id: comic.id,
        comic_title: comic.title,
        database_tried: tried,
        database_success: source,
        old_chapter_count: comic.chapter_count,
        new_chapter_count: newChapterCount,
        platforms_found: freshPlatforms,
        status: 'no_update',
        timestamp,
      }

      // Update last_chapter_check and platforms
      await supabase
        .from('recommendations')
        .update({
          last_chapter_check: timestamp,
          official_platforms: mergedPlatforms.length > 0 ? mergedPlatforms : ['INKR'],
        })
        .eq('id', comic.id)

      // Check if there's a new chapter
      if (newChapterCount && newChapterCount > (comic.chapter_count ?? 0)) {
        // Chapter count increased — update and notify
        await supabase
          .from('recommendations')
          .update({
            chapter_count: newChapterCount,
            last_chapter_check: timestamp,
            official_platforms: mergedPlatforms.length > 0 ? mergedPlatforms : ['INKR'],
          })
          .eq('id', comic.id)

        // Find all users tracking this comic with relevant status
        const { data: trackers } = await supabase
          .from('reading_list_items')
          .select('list_id, reading_lists!inner(user_id)')
          .eq('recommendation_id', comic.id)
          .in('status', ['reading', 'plan_to_read'])

        if (trackers && trackers.length > 0) {
          // Get unique user IDs
          const userIds = [...new Set(
            trackers.map((t: any) => t.reading_lists?.user_id).filter(Boolean)
          )]

          // Insert notifications for each user
          const notifications = userIds.map((userId: string) => ({
            user_id: userId,
            type:    'system',
            title:   `📖 ${comic.title} updated`,
            content: `New chapters available, now at chapter ${newChapterCount}`,
            data:    {
              recommendation_id: comic.id,
              new_chapter_count: newChapterCount,
              old_chapter_count: comic.chapter_count,
            },
          }))

          await supabase.from('notifications').insert(notifications)
          updated++
          
          logEntry.status = 'success'
          results.push({
            id:      comic.id,
            title:   comic.title,
            old:     comic.chapter_count,
            new:     newChapterCount,
            source:  source,
            platforms: mergedPlatforms,
            notified: trackers?.length ?? 0,
          })
        }
      } else if (newChapterCount === null) {
        logEntry.status = 'failed'
        logEntry.reason = 'No ID available or all sources failed'
      }

      logs.push(logEntry)
    } catch (err: any) {
      console.error(`Failed to check ${comic.title}:`, err)
      logs.push({
        comic_id: comic.id,
        comic_title: comic.title,
        database_tried: [],
        database_success: null,
        old_chapter_count: comic.chapter_count,
        new_chapter_count: null,
        platforms_found: [],
        status: 'failed',
        error: err?.message ?? 'Unknown error',
        timestamp,
      })
    }
  }

  // Bulk log all attempts
  try {
    for (const log of logs) {
      await logChapterCheck(supabase, log)
    }
  } catch (err) {
    console.error('Failed to log chapter checks:', err)
  }

  return NextResponse.json({
    checked: comics.length,
    updated,
    results,
    logs_count: logs.length,
    logs: logs.slice(0, 5),
  })
}