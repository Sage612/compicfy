import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE = 10 // Reduced from 20
const API_DELAY_MS = 600 // 600ms between API calls
const REQUEST_TIMEOUT_MS = 8000 // 8 second timeout

// ── Fetch with timeout ────────────────────────────────────────────
async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeoutId)
    return response
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      throw new Error(`Timeout after ${timeoutMs}ms`)
    }
    throw err
  }
}

// ── Logging ───────────────────────────────────────────────────────
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

async function logChapterCheck(supabase: any, log: CheckLog) {
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
    console.error('Failed to log:', err)
  }
}

// ── MangaUpdates ──────────────────────────────────────────────────
async function getLatestChapterFromMU(id: string): Promise<{ chapter: number | null; platforms: string[] }> {
  try {
    await new Promise(resolve => setTimeout(resolve, API_DELAY_MS))
    
    const res = await fetchWithTimeout(`https://api.mangaupdates.com/v1/series/${id}`)
    if (res.ok) {
      const data = await res.json()
      const ch = data?.latest_chapter
      if (ch && !isNaN(Number(ch))) return { chapter: Number(ch), platforms: [] }
    }
  } catch (err) {
    console.error(`MU fetch error for ${id}:`, err)
  }
  return { chapter: null, platforms: [] }
}

// ── MangaBaka ──────────────────────────────────────────────────────
async function getLatestChapterFromMangaBaka(id: string): Promise<{ chapter: number | null; platforms: string[] }> {
  try {
    await new Promise(resolve => setTimeout(resolve, API_DELAY_MS))
    
    const res = await fetchWithTimeout(`https://api.mangabaka.dev/series/${id}`)
    if (res.ok) {
      const data = await res.json()
      if (data?.data?.total_chapters && !isNaN(Number(data.data.total_chapters))) {
        return { chapter: Number(data.data.total_chapters), platforms: [] }
      }
    }
  } catch (err) {
    console.error(`MB fetch error for ${id}:`, err)
  }
  return { chapter: null, platforms: [] }
}

// ── MangaDex ──────────────────────────────────────────────────────
async function getLatestChapterFromMangaDex(id: string): Promise<{ chapter: number | null; platforms: string[] }> {
  try {
    await new Promise(resolve => setTimeout(resolve, API_DELAY_MS))
    
    const res = await fetchWithTimeout(`https://api.mangadex.org/manga/${id}`)
    if (res.ok) {
      const data = await res.json()
      const ch = data?.data?.attributes?.lastChapter
      if (ch && !isNaN(Number(ch))) return { chapter: Number(ch), platforms: [] }
    }
  } catch (err) {
    console.error(`MD fetch error for ${id}:`, err)
  }
  return { chapter: null, platforms: [] }
}

// ── Kuroiru ───────────────────────────────────────────────────────
async function getLatestChapterFromKuroiru(id: string): Promise<{ chapter: number | null; platforms: string[] }> {
  try {
    await new Promise(resolve => setTimeout(resolve, API_DELAY_MS))
    
    const res = await fetchWithTimeout(`https://api.kuroiru.co/manga/${id}`)
    if (res.ok) {
      const data = await res.json()
      if (data?.total_chapters && !isNaN(Number(data.total_chapters))) {
        return { chapter: Number(data.total_chapters), platforms: [] }
      }
      if (data?.latest_chapter && !isNaN(Number(data.latest_chapter))) {
        return { chapter: Number(data.latest_chapter), platforms: [] }
      }
    }
  } catch (err) {
    console.error(`Kuroiru fetch error for ${id}:`, err)
  }
  return { chapter: null, platforms: [] }
}

// ── AniList ───────────────────────────────────────────────────────
async function getLatestChapterFromAniList(id: string): Promise<{ chapter: number | null; platforms: string[] }> {
  try {
    await new Promise(resolve => setTimeout(resolve, API_DELAY_MS))
    
    const gql = `query($id:Int){Media(id:$id,type:MANGA){chapters}}`
    const res = await fetchWithTimeout('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: gql, variables: { id: parseInt(id) } }),
    })
    
    if (res.ok) {
      const data = await res.json()
      const ch = data?.data?.Media?.chapters
      if (ch && !isNaN(Number(ch))) return { chapter: Number(ch), platforms: [] }
    }
  } catch (err) {
    console.error(`AL fetch error for ${id}:`, err)
  }
  return { chapter: null, platforms: [] }
}

// ── Jikan (MAL) ───────────────────────────────────────────────────
async function getLatestChapterFromJikan(id: string): Promise<{ chapter: number | null; platforms: string[] }> {
  try {
    await new Promise(resolve => setTimeout(resolve, API_DELAY_MS))
    
    const res = await fetchWithTimeout(`https://api.jikan.moe/v4/manga/${id}`)
    if (res.ok) {
      const data = await res.json()
      const ch = data?.data?.chapters
      if (ch && !isNaN(Number(ch))) return { chapter: Number(ch), platforms: [] }
    }
  } catch (err) {
    console.error(`Jikan fetch error for ${id}:`, err)
  }
  return { chapter: null, platforms: [] }
}

// ── Main chapter getter - SEQUENTIAL ───────────────────────────────
async function getLatestChapterCount(comic: any): Promise<{ chapter: number | null; source: string | null; tried: string[]; platforms: string[] }> {
  const tried: string[] = []

  // Try each source SEQUENTIALLY with delays
  if (comic.mangaupdates_id) {
    tried.push('MangaUpdates')
    const { chapter: ch } = await getLatestChapterFromMU(comic.mangaupdates_id)
    if (ch) return { chapter: ch, source: 'MangaUpdates', tried, platforms: [] }
  }

  if (comic.mangabaka_id) {
    tried.push('MangaBaka')
    const { chapter: ch } = await getLatestChapterFromMangaBaka(comic.mangabaka_id)
    if (ch) return { chapter: ch, source: 'MangaBaka', tried, platforms: [] }
  }

  if (comic.mangadex_id) {
    tried.push('MangaDex')
    const { chapter: ch } = await getLatestChapterFromMangaDex(comic.mangadex_id)
    if (ch) return { chapter: ch, source: 'MangaDex', tried, platforms: [] }
  }

  if (comic.kuroiru_id) {
    tried.push('Kuroiru')
    const { chapter: ch } = await getLatestChapterFromKuroiru(comic.kuroiru_id)
    if (ch) return { chapter: ch, source: 'Kuroiru', tried, platforms: [] }
  }

  if (comic.anilist_id) {
    tried.push('AniList')
    const { chapter: ch } = await getLatestChapterFromAniList(comic.anilist_id)
    if (ch) return { chapter: ch, source: 'AniList', tried, platforms: [] }
  }

  if (comic.mal_id) {
    tried.push('Jikan')
    const { chapter: ch } = await getLatestChapterFromJikan(comic.mal_id)
    if (ch) return { chapter: ch, source: 'Jikan', tried, platforms: [] }
  }

  return { chapter: null, source: null, tried, platforms: [] }
}

// ── Main handler ──────────────────────────────────────────────────
export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const cutoff = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()

  const { data: comics, error } = await supabase
    .from('recommendations')
    .select('id, title, chapter_count, official_platforms, mangaupdates_id, anilist_id, mal_id, mangadex_id, mangabaka_id, kuroiru_id')
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
  const results = []
  const logs: CheckLog[] = []

  for (const comic of comics) {
    const timestamp = new Date().toISOString()

    try {
      const { chapter: newChapterCount, source, tried } = await getLatestChapterCount(comic)

      const logEntry: CheckLog = {
        comic_id: comic.id,
        comic_title: comic.title,
        database_tried: tried,
        database_success: source,
        old_chapter_count: comic.chapter_count,
        new_chapter_count: newChapterCount,
        platforms_found: [],
        status: 'no_update',
        timestamp,
      }

      // Update last_chapter_check
      await supabase.from('recommendations').update({ last_chapter_check: timestamp }).eq('id', comic.id)

      // Check if there's a new chapter
      if (newChapterCount && newChapterCount > (comic.chapter_count ?? 0)) {
        await supabase
          .from('recommendations')
          .update({
            chapter_count: newChapterCount,
            last_chapter_check: timestamp,
          })
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
            type: 'system',
            title: `📖 ${comic.title} updated`,
            content: `New chapters available, now at chapter ${newChapterCount}`,
            data: { recommendation_id: comic.id, new_chapter_count: newChapterCount, old_chapter_count: comic.chapter_count },
          }))

          await supabase.from('notifications').insert(notifications)
          updated++

          logEntry.status = 'success'
          results.push({
            id: comic.id,
            title: comic.title,
            old: comic.chapter_count,
            new: newChapterCount,
            source,
            notified: trackers?.length ?? 0,
          })
        }
      } else if (newChapterCount === null) {
        logEntry.status = 'failed'
        logEntry.reason = 'No valid ID or all APIs failed'
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

  // Log all
  for (const log of logs) {
    await logChapterCheck(supabase, log)
  }

  return NextResponse.json({
    checked: comics.length,
    updated,
    results,
    logs_count: logs.length,
    logs: logs.slice(0, 5),
  })
}