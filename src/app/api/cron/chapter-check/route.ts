import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE         = 10
const API_DELAY_MS       = 600
const REQUEST_TIMEOUT_MS = 8000
const LOCK_NAME          = 'chapter_checker'
const LOCK_DURATION_MS   = 55_000 // just under the 1-minute cron interval
const ID_LOCK_NAME       = 'id_checker'

// ── Fetch with timeout ────────────────────────────────────────────
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

// ── Logging ───────────────────────────────────────────────────────
interface CheckLog {
  comic_id:          string
  comic_title:       string
  database_tried:    string[]
  database_success:  string | null
  old_chapter_count: number | null
  new_chapter_count: number | null
  status:            'success' | 'no_update' | 'failed' | 'skipped_no_ids' | 'skipped_id_checker_active'
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
async function getChapterFromMU(id: string): Promise<number | null> {
  try {
    await new Promise(r => setTimeout(r, API_DELAY_MS))

    let numericId = id
    if (isNaN(Number(id))) {
      const resolveRes = await fetchWithTimeout(`https://api.mangaupdates.com/v1/series/by_letter/${id[0] || 'a'}`)
      if (resolveRes.ok) {
        const resolveData = await resolveRes.json()
        const matchedItem = resolveData?.results?.find((item: any) => item.unique_id === id)
        if (matchedItem?.series_id) {
          numericId = String(matchedItem.series_id)
        } else {
          return null
        }
      } else {
        return null
      }
    }

    const res = await fetchWithTimeout(`https://api.mangaupdates.com/v1/series/${numericId}`)
    if (!res.ok) return null
    const data = await res.json()
    const ch   = data?.latest_chapter
    return ch && !isNaN(Number(ch)) ? Number(ch) : null
  } catch (err) {
    console.error(`MU chapter error for ${id}:`, err)
    return null
  }
}

// ── MangaDex ──────────────────────────────────────────────────────
async function getChapterFromMangaDex(id: string): Promise<number | null> {
  try {
    await new Promise(r => setTimeout(r, API_DELAY_MS))
    const res = await fetchWithTimeout(`https://api.mangadex.org/manga/${id}`)
    if (!res.ok) return null
    const data = await res.json()
    const ch   = data?.data?.attributes?.lastChapter

    if (ch && !isNaN(Number(ch))) return Number(ch)

    const feedRes = await fetchWithTimeout(`https://api.mangadex.org/manga/${id}/feed?limit=10&order[chapter]=desc`)
    if (feedRes.ok) {
      const feedData = await feedRes.json()
      const highestFeedCh = feedData?.data?.[0]?.attributes?.chapter
      if (highestFeedCh && !isNaN(Number(highestFeedCh))) {
        return Number(highestFeedCh)
      }
    }
    return null
  } catch (err) {
    console.error(`MD chapter error for ${id}:`, err)
    return null
  }
}

// ── Jikan (MAL) ───────────────────────────────────────────────────
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
async function getChapterFromAniList(id: string): Promise<number | null> {
  try {
    const cleanId = parseInt(String(id).replace(/\D/g, ''), 10)
    if (isNaN(cleanId)) return null

    await new Promise(r => setTimeout(r, API_DELAY_MS))
    const gql = `query($id:Int){Media(id:$id,type:MANGA){chapters}}`
    const res = await fetchWithTimeout('https://graphql.anilist.co', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ query: gql, variables: { id: cleanId } }),
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

// ── Resolve chapter count across sources ──
async function resolveChapterCount(comic: any): Promise<{ chapter: number | null; source: string | null; tried: string[] }> {
  const tried: string[] = []

  let muChapter: number | null = null
  if (comic.mangaupdates_id) {
    tried.push('MangaUpdates')
    muChapter = await getChapterFromMU(comic.mangaupdates_id)
  }

  let mdChapter: number | null = null
  if (comic.mangadex_id) {
    tried.push('MangaDex')
    mdChapter = await getChapterFromMangaDex(comic.mangadex_id)
  }

  if (muChapter !== null && mdChapter !== null && Math.abs(muChapter - mdChapter) <= 1) {
    return { chapter: Math.max(muChapter, mdChapter), source: 'MU+MD confirmed', tried }
  }

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
  }

  if (comic.anilist_id) {
    tried.push('AniList')
    const alChapter = await getChapterFromAniList(comic.anilist_id)
    if (alChapter !== null) {
      if (muChapter !== null && Math.abs(alChapter - muChapter) <= 1) {
        return { chapter: Math.max(alChapter, muChapter), source: 'MU+AniList confirmed', tried }
      }
      if (mdChapter !== null && Math.abs(alChapter - mdChapter) <= 1) {
        return { chapter: Math.max(alChapter, mdChapter), source: 'MD+AniList confirmed', tried }
      }
      if (malChapter !== null && Math.abs(alChapter - malChapter) <= 1) {
        return { chapter: Math.max(alChapter, malChapter), source: 'MAL+AniList confirmed', tried }
      }
      if (muChapter === null && mdChapter === null && malChapter === null) {
        return { chapter: alChapter, source: 'AniList', tried }
      }
    }
  }

  if (muChapter !== null)  return { chapter: muChapter,  source: 'MangaUpdates (unconfirmed)', tried }
  if (mdChapter !== null)  return { chapter: mdChapter,  source: 'MangaDex (unconfirmed)',      tried }
  if (malChapter !== null) return { chapter: malChapter, source: 'MAL (unconfirmed)',           tried }

  return { chapter: null, source: null, tried }
}

// ── Lock helpers ──────────────────────────────────────────────────
async function acquireLock(supabase: any): Promise<boolean> {
  const { data: existing } = await supabase
    .from('cron_locks')
    .select('locked_until')
    .eq('job_name', LOCK_NAME)
    .maybeSingle()

  if (existing && new Date(existing.locked_until) > new Date()) {
    return false
  }

  await supabase
    .from('cron_locks')
    .upsert({ job_name: LOCK_NAME, locked_until: new Date(Date.now() + LOCK_DURATION_MS).toISOString() })

  return true
}

async function isIdCheckerActive(supabase: any): Promise<boolean> {
  const { data: idLock } = await supabase
    .from('cron_locks')
    .select('locked_until')
    .eq('job_name', ID_LOCK_NAME)
    .maybeSingle()

  return !!(idLock && new Date(idLock.locked_until) > new Date())
}

async function releaseLock(supabase: any) {
  await supabase.from('cron_locks').delete().eq('job_name', LOCK_NAME)
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

  if (await isIdCheckerActive(supabase)) {
    return NextResponse.json({ message: 'ID Checker lock is active. Yielding chapter validation execution.' })
  }

  const gotLock = await acquireLock(supabase)
  if (!gotLock) {
    return NextResponse.json({ message: 'Previous run still in progress, skipping this tick' })
  }

  try {
    const cutoff = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()

    const { data: comics, error } = await supabase
      .from('recommendations')
      .select('id, title, chapter_count, mangaupdates_id, mangadex_id, anilist_id, mal_id, last_id_check')
      .eq('is_approved', true)
      .eq('status', 'ongoing')
      .or(`last_chapter_check.is.null,last_chapter_check.lt.${cutoff}`)
      .not('last_id_check', 'is', null)
      .limit(BATCH_SIZE)

    if (error) {
      console.error('DB error:', error)
      return NextResponse.json({ error: 'DB fetch failed' }, { status: 500 })
    }

    if (!comics || comics.length === 0) {
      return NextResponse.json({ checked: 0, updated: 0, logs: [] })
    }

    let updated = 0
    const results  = []
    const logs: CheckLog[] = []

    for (const comic of comics) {
      const timestamp = new Date().toISOString()

      if (!comic.mangaupdates_id && !comic.mangadex_id && !comic.anilist_id && !comic.mal_id) {
        await supabase.from('recommendations')
          .update({ last_chapter_check: timestamp })
          .eq('id', comic.id)

        logs.push({
          comic_id:          comic.id,
          comic_title:       comic.title,
          database_tried:    [],
          database_success:  null,
          old_chapter_count: comic.chapter_count,
          new_chapter_count: null,
          status:            'skipped_no_ids',
          reason:            'Skipped tracking: No valid external platform mappings discovered by ID Checker.',
          timestamp,
        })
        continue
      }

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

        // ── Conditional Routing Path ─────────────────────────────────
        if (newChapterCount && newChapterCount > (comic.chapter_count ?? 0)) {
          // 1. SUCCESS: Chapter progression found
          await supabase.from('recommendations')
            .update({ chapter_count: newChapterCount, last_chapter_check: timestamp })
            .eq('id', comic.id)

          const { data: trackers } = await supabase
            .from('reading_list_items')
            .select('list_id, reading_lists!inner(user_id)')
            .eq('recommendation_id', comic.id)
            .in('status', ['reading', 'plan_to_read'])

          if (trackers && trackers.length > 0) {
            const userIds       = [...new Set(trackers.map((t: any) => t.reading_lists?.user_id).filter(Boolean))]
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

        } else if (newChapterCount !== null && newChapterCount < (comic.chapter_count ?? 0)) {
          // 2. REGRESSION DETECTED: External APIs returned stale or lower counts
          logEntry.status = 'failed'
          logEntry.reason = `Stale API Data: External source returned ${newChapterCount}, but database is already ahead at ${comic.chapter_count}.`

          // ✅ FIXED: Update timestamp normally so it doesn't re-check immediately
          await supabase.from('recommendations')
            .update({ last_chapter_check: timestamp })
            .eq('id', comic.id)

          // Log discrepancy for admin review
          await supabase.from('activity_logs').insert({
            user_id: null,
            action: 'chapter_discrepancy',
            entity_type: 'recommendations',
            entity_id: comic.id,
            details: {
              comic_title: comic.title,
              db_chapter_count: comic.chapter_count,
              api_chapter_count: newChapterCount,
              source,
              timestamp,
            }
          })

        } else if (newChapterCount === null) {
          // 3. ZERO RESULTS FOUND
          await supabase.from('recommendations')
            .update({ last_chapter_check: timestamp })
            .eq('id', comic.id)

          logEntry.status = 'failed'
          logEntry.reason = 'No valid ID or all APIs returned null'

        } else {
          // 4. EQUAL COUNTS: Simply complete the tracking check cleanly
          await supabase.from('recommendations')
            .update({ last_chapter_check: timestamp })
            .eq('id', comic.id)
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
  } finally {
    await releaseLock(supabase)
  }
}