import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE         = 10
const API_DELAY_MS       = 600
const REQUEST_TIMEOUT_MS = 8000

async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeoutId)
    return response
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') throw new Error(`Timeout after ${timeoutMs}ms`)
    throw err
  }
}

interface CheckLog {
  comic_id:          string
  comic_title:       string
  database_tried:    string[]
  database_success:  string | null
  old_chapter_count: number | null
  new_chapter_count: number | null
  status:            'success' | 'no_update' | 'failed'
  reason?:           string
  error?:            string
  timestamp:         string
}

async function logChapterCheck(supabase: any, log: CheckLog) {
  try {
    await supabase.from('activity_logs').insert({
      user_id:     null,
      action:      'chapter_check',
      entity_type: 'recommendations',
      entity_id:   log.comic_id,
      details:     log,
    })
  } catch (err) {
    console.error('Failed to log:', err)
  }
}

// ── MangaUpdates ──────────────────────────────────────────────────
// Most reliable for ongoing series — community-updated, fast
async function getChapterFromMU(id: string): Promise<number | null> {
  try {
    await new Promise(r => setTimeout(r, API_DELAY_MS))
    const res = await fetchWithTimeout(`https://api.mangaupdates.com/v1/series/${id}`)
    if (!res.ok) return null
    const data = await res.json()
    const ch   = data?.latest_chapter
    return ch && !isNaN(Number(ch)) ? Number(ch) : null
  } catch (err) {
    console.error(`MU chapter error for ${id}:`, err)
    return null
  }
}

async function getChapterFromMangaDexFeed(id: string): Promise<number | null> {
  try {
    await new Promise(r => setTimeout(r, API_DELAY_MS))
    const url = `https://api.mangadex.org/manga/${id}/feed?limit=1&order[chapter]=desc&translatedLanguage[]=en&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic`
    const res = await fetchWithTimeout(url)
    if (!res.ok) return null
    const data    = await res.json()
    const chapter = data?.data?.[0]?.attributes?.chapter
    return chapter && !isNaN(Number(chapter)) ? Math.floor(Number(chapter)) : null
  } catch (err) {
    console.error(`MD feed error for ${id}:`, err)
    return null
  }
}

// ── Kitsu ─────────────────────────────────────────────────────────
// chapterCount is community-maintained and reliable for ongoing series
// Pure public REST, no auth, no Cloudflare block
async function getChapterFromKitsu(id: string): Promise<number | null> {
  try {
    await new Promise(r => setTimeout(r, API_DELAY_MS))
    const res = await fetchWithTimeout(
      `https://kitsu.io/api/edge/manga/${id}`,
      { headers: { 'Accept': 'application/vnd.api+json' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const ch   = data?.data?.attributes?.chapterCount
    return ch && !isNaN(Number(ch)) ? Number(ch) : null
  } catch (err) {
    console.error(`Kitsu chapter error for ${id}:`, err)
    return null
  }
}

// ── Jikan (MAL) ───────────────────────────────────────────────────
// Good for completed series, mostly null for ongoing
async function getChapterFromJikan(id: string): Promise<number | null> {
  try {
    await new Promise(r => setTimeout(r, API_DELAY_MS))
    const res = await fetchWithTimeout(`https://api.jikan.moe/v4/manga/${id}`)
    if (!res.ok) return null
    const data = await res.json()
    const ch   = data?.data?.chapters
    return ch && !isNaN(Number(ch)) ? Number(ch) : null
  } catch (err) {
    console.error(`Jikan chapter error for ${id}:`, err)
    return null
  }
}

// ── AniList ───────────────────────────────────────────────────────
// Good for completed series, mostly null for ongoing — final fallback
async function getChapterFromAniList(id: string): Promise<number | null> {
  try {
    await new Promise(r => setTimeout(r, API_DELAY_MS))
    const gql = `query($id:Int){Media(id:$id,type:MANGA){chapters}}`
    const res = await fetchWithTimeout('https://graphql.anilist.co', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ query: gql, variables: { id: parseInt(id) } }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const ch   = data?.data?.Media?.chapters
    return ch && !isNaN(Number(ch)) ? Number(ch) : null
  } catch (err) {
    console.error(`AL chapter error for ${id}:`, err)
    return null
  }
}

async function resolveChapterCount(comic: any): Promise<{
  chapter: number | null
  source:  string | null
  tried:   string[]
}> {
  const tried: string[] = []

  // ── Primary: MangaUpdates ──────────────────────────────────────
  let muChapter: number | null = null
  if (comic.mangaupdates_id) {
    tried.push('MangaUpdates')
    muChapter = await getChapterFromMU(comic.mangaupdates_id)
  }

  // ── Confirmation 1: MangaDex feed ─────────────────────────────
  let mdChapter: number | null = null
  if (comic.mangadex_id) {
    tried.push('MangaDex-feed')
    mdChapter = await getChapterFromMangaDexFeed(comic.mangadex_id)
  }

  // MU + MD feed agree → highest confidence
  if (muChapter !== null && mdChapter !== null && Math.abs(muChapter - mdChapter) <= 1) {
    return { chapter: Math.max(muChapter, mdChapter), source: 'MU+MD confirmed', tried }
  }

  // ── Confirmation 2: Kitsu ──────────────────────────────────────
  let kitsuChapter: number | null = null
  if (comic.kitsu_id) {
    tried.push('Kitsu')
    kitsuChapter = await getChapterFromKitsu(comic.kitsu_id)
  }

  // MU + Kitsu agree
  if (muChapter !== null && kitsuChapter !== null && Math.abs(muChapter - kitsuChapter) <= 1) {
    return { chapter: Math.max(muChapter, kitsuChapter), source: 'MU+Kitsu confirmed', tried }
  }

  // MD feed + Kitsu agree
  if (mdChapter !== null && kitsuChapter !== null && Math.abs(mdChapter - kitsuChapter) <= 1) {
    return { chapter: Math.max(mdChapter, kitsuChapter), source: 'MD+Kitsu confirmed', tried }
  }

  // ── Fallback: MAL ──────────────────────────────────────────────
  let malChapter: number | null = null
  if (comic.mal_id) {
    tried.push('MAL')
    malChapter = await getChapterFromJikan(comic.mal_id)
  }

  if (malChapter !== null) {
    if (muChapter !== null && Math.abs(malChapter - muChapter) <= 1) {
      return { chapter: Math.max(malChapter, muChapter), source: 'MU+MAL confirmed', tried }
    }
    if (mdChapter !== null && Math.abs(malChapter - mdChapter) <= 1) {
      return { chapter: Math.max(malChapter, mdChapter), source: 'MD+MAL confirmed', tried }
    }
    if (kitsuChapter !== null && Math.abs(malChapter - kitsuChapter) <= 1) {
      return { chapter: Math.max(malChapter, kitsuChapter), source: 'Kitsu+MAL confirmed', tried }
    }
  }

  // ── Final fallback: AniList ────────────────────────────────────
  if (comic.anilist_id) {
    tried.push('AniList')
    const alChapter = await getChapterFromAniList(comic.anilist_id)
    if (alChapter !== null) {
      if (muChapter !== null && Math.abs(alChapter - muChapter) <= 1) {
        return { chapter: Math.max(alChapter, muChapter), source: 'MU+AL confirmed', tried }
      }
      if (mdChapter !== null && Math.abs(alChapter - mdChapter) <= 1) {
        return { chapter: Math.max(alChapter, mdChapter), source: 'MD+AL confirmed', tried }
      }
      if (kitsuChapter !== null && Math.abs(alChapter - kitsuChapter) <= 1) {
        return { chapter: Math.max(alChapter, kitsuChapter), source: 'Kitsu+AL confirmed', tried }
      }
      // AniList solo — only trust if nothing else returned anything
      if (muChapter === null && mdChapter === null && kitsuChapter === null && malChapter === null) {
        return { chapter: alChapter, source: 'AniList', tried }
      }
    }
  }

  // ── Best single unconfirmed value ──────────────────────────────
  // Priority: MU > MD feed > Kitsu > MAL
  // MU is most reliable single source for ongoing series
  if (muChapter !== null)    return { chapter: muChapter,    source: 'MangaUpdates (unconfirmed)', tried }
  if (mdChapter !== null)    return { chapter: mdChapter,    source: 'MangaDex-feed (unconfirmed)', tried }
  if (kitsuChapter !== null) return { chapter: kitsuChapter, source: 'Kitsu (unconfirmed)',         tried }
  if (malChapter !== null)   return { chapter: malChapter,   source: 'MAL (unconfirmed)',           tried }

  return { chapter: null, source: null, tried }
}

// ── Main handler ──────────────────────────────────────────────────
export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const cutoff = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()

  const { data: comics, error } = await supabase
    .from('recommendations')
    .select('id, title, chapter_count, mangaupdates_id, mangadex_id, anilist_id, mal_id, kitsu_id')
    .eq('is_approved', true)
    .eq('status', 'ongoing')
    .or(`last_chapter_check.is.null,last_chapter_check.lt.${cutoff}`)
    .limit(BATCH_SIZE)

  if (error) {
    console.error('DB error:', error)
    return NextResponse.json({ error: 'DB fetch failed' }, { status: 500 })
  }

  if (!comics || comics.length === 0) {
    return NextResponse.json({ checked: 0, updated: 0, logs: [] })
  }

  let updated = 0
  const results: any[] = []
  const logs: CheckLog[] = []

  for (const comic of comics) {
    const timestamp = new Date().toISOString()

    try {
      const { chapter: newChapterCount, source, tried } = await resolveChapterCount(comic)

      const logEntry: CheckLog = {
        comic_id:          comic.id,
        comic_title:       comic.title,
        database_tried:    tried,
        database_success:  source,
        old_chapter_count: comic.chapter_count,
        new_chapter_count: newChapterCount,
        status:            'no_update',
        timestamp,
      }

      await supabase.from('recommendations')
        .update({ last_chapter_check: timestamp })
        .eq('id', comic.id)

      if (newChapterCount && newChapterCount > (comic.chapter_count ?? 0)) {
        await supabase.from('recommendations')
          .update({ chapter_count: newChapterCount, last_chapter_check: timestamp })
          .eq('id', comic.id)

        const { data: trackers } = await supabase
          .from('reading_list_items')
          .select('list_id, reading_lists!inner(user_id)')
          .eq('recommendation_id', comic.id)
          .in('status', ['reading', 'plan_to_read'])

        if (trackers && trackers.length > 0) {
          const userIds = [...new Set(trackers.map((t: any) => t.reading_lists?.user_id).filter(Boolean))]
          const notifications = userIds.map((userId: string) => ({
            user_id: userId,
            type:    'system',
            title:   `📖 ${comic.title} updated`,
            content: `New chapters available, now at chapter ${newChapterCount}`,
            data:    { recommendation_id: comic.id, new_chapter_count: newChapterCount, old_chapter_count: comic.chapter_count },
          }))
          await supabase.from('notifications').insert(notifications)
        }

        updated++
        logEntry.status = 'success'
        results.push({
          id:       comic.id,
          title:    comic.title,
          old:      comic.chapter_count,
          new:      newChapterCount,
          source,
          notified: trackers?.length ?? 0,
        })
      } else if (newChapterCount === null) {
        logEntry.status = 'failed'
        logEntry.reason = 'No valid ID or all APIs returned null'
      }

      logs.push(logEntry)

    } catch (err: any) {
      console.error(`Failed to check ${comic.title}:`, err)
      logs.push({
        comic_id:          comic.id,
        comic_title:       comic.title,
        database_tried:    [],
        database_success:  null,
        old_chapter_count: comic.chapter_count,
        new_chapter_count: null,
        status:            'failed',
        error:             err?.message ?? 'Unknown error',
        timestamp,
      })
    }
  }

  for (const log of logs) await logChapterCheck(supabase, log)

  return NextResponse.json({
    checked:    comics.length,
    updated,
    results,
    logs_count: logs.length,
    logs:       logs.slice(0, 5),
  })
}