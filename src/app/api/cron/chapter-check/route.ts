import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushForUser } from '@/lib/utils/pushHelper'

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

type NormalizedFormat = 'manga' | 'novel' | 'other'

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

type ResolvedStatus = 'completed' | 'hiatus' | 'cancelled' | 'ongoing' | null

function normalizeMUStatus(raw: string | null | undefined): ResolvedStatus {
  if (!raw) return null
  const match = raw.match(/\(([^)]+)\)\s*$/) // grab text inside the LAST parentheses
  const s = (match?.[1] ?? raw).toLowerCase()
  if (s.includes('complete')) return 'completed'
  if (s.includes('cancelled') || s.includes('canceled') || s.includes('dropped')) return 'cancelled'
  if (s.includes('hiatus')) return 'hiatus'
  if (s.includes('ongoing')) return 'ongoing'
  return null
}

function normalizeMDStatus(raw: string | null | undefined): ResolvedStatus {
  if (!raw) return null
  const s = raw.toLowerCase()
  if (s === 'completed') return 'completed'
  if (s === 'cancelled') return 'cancelled'
  if (s === 'hiatus') return 'hiatus'
  if (s === 'ongoing') return 'ongoing'
  return null
}

function normalizeMALStatus(raw: string | null | undefined, publishing?: boolean | null): ResolvedStatus {

  if (publishing === true) return 'ongoing'

  if (!raw) return null
  const s = raw.toLowerCase()
  if (s === 'completed' || s === 'finished' || s.includes('finished')) return 'completed'
  if (s.includes('discontinued') || s.includes('cancelled') || s.includes('canceled')) return 'cancelled'
  if (s.includes('hiatus') || s.includes('on hold')) return 'hiatus'
  return null
}

function normalizeALStatus(raw: string | null | undefined): ResolvedStatus {
  if (!raw) return null
  const s = raw.toUpperCase()
  if (s === 'FINISHED') return 'completed'
  if (s === 'CANCELLED') return 'cancelled'
  if (s === 'HIATUS') return 'hiatus'
  if (s === 'RELEASING') return 'ongoing'
  return null
}

// ── Logging ───────────────────────────────────────────────────────
interface CheckLog {
  comic_id:          string
  comic_title:       string
  database_tried:    string[]
  database_success:  string | null
  old_chapter_count: number | null
  new_chapter_count: number | null
  old_status?:        string
  new_status?:         string
  status:            'success' | 'no_update' | 'failed' | 'skipped_no_ids' | 'skipped_id_checker_active' | 'completed_corrected' | 'status_corrected'
  reason?:           string
  error?:            string
  format_rejections?: string[]
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

interface SourceResult {
  chapter:        number | null
  status:         ResolvedStatus
  formatRejected: boolean
}

const REJECTED: SourceResult = { chapter: null, status: null, formatRejected: true }
const EMPTY:    SourceResult = { chapter: null, status: null, formatRejected: false }

async function getChapterFromMU(id: string): Promise<SourceResult> {
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
          return EMPTY
        }
      } else {
        return EMPTY
      }
    }

    const res = await fetchWithTimeout(`https://api.mangaupdates.com/v1/series/${numericId}`)
    if (!res.ok) return EMPTY
    const data = await res.json()

    const format = normalizeFormat(data?.type ?? null)
    if (format !== 'manga') return REJECTED

    const ch = data?.latest_chapter
    const status = normalizeMUStatus(data?.status ?? null)

    return {
      chapter: ch && !isNaN(Number(ch)) ? Number(ch) : null,
      status,
      formatRejected: false,
    }
  } catch (err) {
    console.error(`MU chapter error for ${id}:`, err)
    return EMPTY
  }
}

async function getChapterFromMangaDex(id: string): Promise<SourceResult> {
  try {
    await new Promise(r => setTimeout(r, API_DELAY_MS))
    const res = await fetchWithTimeout(`https://api.mangadex.org/manga/${id}`)
    if (!res.ok) return EMPTY
    const data = await res.json()
    const ch   = data?.data?.attributes?.lastChapter

    const status = normalizeMDStatus(data?.data?.attributes?.status ?? null)

    if (ch && !isNaN(Number(ch))) {
      return { chapter: Number(ch), status, formatRejected: false }
    }

    const feedRes = await fetchWithTimeout(`https://api.mangadex.org/manga/${id}/feed?limit=10&order[chapter]=desc`)
    if (feedRes.ok) {
      const feedData = await feedRes.json()
      const highestFeedCh = feedData?.data?.[0]?.attributes?.chapter
      if (highestFeedCh && !isNaN(Number(highestFeedCh))) {
        return { chapter: Number(highestFeedCh), status, formatRejected: false }
      }
    }
    return { chapter: null, status, formatRejected: false }
  } catch (err) {
    console.error(`MD chapter error for ${id}:`, err)
    return EMPTY
  }
}

async function getChapterFromJikan(id: string): Promise<SourceResult> {
  try {
    await new Promise(r => setTimeout(r, API_DELAY_MS))
    const res = await fetchWithTimeout(`https://api.jikan.moe/v4/manga/${id}`)
    if (!res.ok) return EMPTY
    const data = await res.json()

    const format = normalizeFormat(data?.data?.type ?? null)
    if (format !== 'manga') return REJECTED

    const ch = data?.data?.chapters
    const status = normalizeMALStatus(data?.data?.status ?? null, data?.data?.publishing ?? null)

    return {
      chapter: ch && !isNaN(Number(ch)) ? Number(ch) : null,
      status,
      formatRejected: false,
    }
  } catch (err) {
    console.error(`Jikan chapter error for ${id}:`, err)
    return EMPTY
  }
}

async function getChapterFromAniList(id: string): Promise<SourceResult> {
  try {
    const cleanId = parseInt(String(id).replace(/\D/g, ''), 10)
    if (isNaN(cleanId)) return EMPTY

    await new Promise(r => setTimeout(r, API_DELAY_MS))
    const gql = `query($id:Int){Media(id:$id,type:MANGA){chapters,status,format}}`
    const res = await fetchWithTimeout('https://graphql.anilist.co', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ query: gql, variables: { id: cleanId } }),
    })
    if (!res.ok) return EMPTY
    const data = await res.json()

    const format = normalizeFormat(data?.data?.Media?.format ?? null)
    if (format !== 'manga') return REJECTED

    const ch = data?.data?.Media?.chapters
    const status = normalizeALStatus(data?.data?.Media?.status ?? null)

    return {
      chapter: ch && !isNaN(Number(ch)) ? Number(ch) : null,
      status,
      formatRejected: false,
    }
  } catch (err) {
    console.error(`AL chapter error for ${id}:`, err)
    return EMPTY
  }
}

async function resolveChapterCount(comic: any): Promise<{
  chapter:          number | null
  source:           string | null
  tried:            string[]
  resolvedStatus:   ResolvedStatus
  statusSources:    string[]
  formatRejections: string[]
}> {
  const tried: string[] = []
  const formatRejections: string[] = []
  const statusVotes: { source: string; status: ResolvedStatus }[] = []

  let muChapter: number | null = null
  if (comic.mangaupdates_id) {
    tried.push('MangaUpdates')
    const muRes = await getChapterFromMU(comic.mangaupdates_id)
    if (muRes.formatRejected) {
      formatRejections.push('MangaUpdates')
    } else {
      muChapter = muRes.chapter
      if (muRes.status) statusVotes.push({ source: 'MangaUpdates', status: muRes.status })
    }
  }

  let mdChapter: number | null = null
  if (comic.mangadex_id) {
    tried.push('MangaDex')
    const mdRes = await getChapterFromMangaDex(comic.mangadex_id)
    if (mdRes.formatRejected) {
      formatRejections.push('MangaDex')
    } else {
      mdChapter = mdRes.chapter
      if (mdRes.status) statusVotes.push({ source: 'MangaDex', status: mdRes.status })
    }
  }

  let malChapter: number | null = null
  if (comic.mal_id) {
    tried.push('MAL')
    const malRes = await getChapterFromJikan(comic.mal_id)
    if (malRes.formatRejected) {
      formatRejections.push('MAL')
    } else {
      malChapter = malRes.chapter
      if (malRes.status) statusVotes.push({ source: 'MAL', status: malRes.status })
    }
  }

  let alChapter: number | null = null
  if (comic.anilist_id) {
    tried.push('AniList')
    const alRes = await getChapterFromAniList(comic.anilist_id)
    if (alRes.formatRejected) {
      formatRejections.push('AniList')
    } else {
      alChapter = alRes.chapter
      if (alRes.status) statusVotes.push({ source: 'AniList', status: alRes.status })
    }
  }

  let resolvedStatus: ResolvedStatus = null
  let statusSources: string[] = []

  const statusGroups = new Map<string, string[]>()
  for (const vote of statusVotes) {
    if (!vote.status) continue
    const list = statusGroups.get(vote.status) ?? []
    list.push(vote.source)
    statusGroups.set(vote.status, list)
  }

  for (const [status, sources] of statusGroups.entries()) {
    if (sources.length >= 2) {
      resolvedStatus = status as ResolvedStatus
      statusSources  = sources
      break
    }
  }

  // ── Chapter count resolution — unchanged logic from before ──
  if (muChapter !== null && mdChapter !== null && Math.abs(muChapter - mdChapter) <= 1) {
    return { chapter: Math.max(muChapter, mdChapter), source: 'MU+MD confirmed', tried, resolvedStatus, statusSources, formatRejections }
  }

  if (malChapter !== null) {
    if (muChapter !== null && Math.abs(malChapter - muChapter) <= 1) {
      return { chapter: Math.max(malChapter, muChapter), source: 'MU+MAL confirmed', tried, resolvedStatus, statusSources, formatRejections }
    }
    if (mdChapter !== null && Math.abs(malChapter - mdChapter) <= 1) {
      return { chapter: Math.max(malChapter, mdChapter), source: 'MD+MAL confirmed', tried, resolvedStatus, statusSources, formatRejections }
    }
  }

  if (alChapter !== null) {
    if (muChapter !== null && Math.abs(alChapter - muChapter) <= 1) {
      return { chapter: Math.max(alChapter, muChapter), source: 'MU+AniList confirmed', tried, resolvedStatus, statusSources, formatRejections }
    }
    if (mdChapter !== null && Math.abs(alChapter - mdChapter) <= 1) {
      return { chapter: Math.max(alChapter, mdChapter), source: 'MD+AniList confirmed', tried, resolvedStatus, statusSources, formatRejections }
    }
    if (malChapter !== null && Math.abs(alChapter - malChapter) <= 1) {
      return { chapter: Math.max(alChapter, malChapter), source: 'MAL+AniList confirmed', tried, resolvedStatus, statusSources, formatRejections }
    }
    if (muChapter === null && mdChapter === null && malChapter === null) {
      return { chapter: alChapter, source: 'AniList', tried, resolvedStatus, statusSources, formatRejections }
    }
  }

  if (muChapter !== null)  return { chapter: muChapter,  source: 'MangaUpdates (unconfirmed)', tried, resolvedStatus, statusSources, formatRejections }
  if (mdChapter !== null)  return { chapter: mdChapter,  source: 'MangaDex (unconfirmed)',      tried, resolvedStatus, statusSources, formatRejections }
  if (malChapter !== null) return { chapter: malChapter, source: 'MAL (unconfirmed)',           tried, resolvedStatus, statusSources, formatRejections }

  return { chapter: null, source: null, tried, resolvedStatus, statusSources, formatRejections }
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
    const fastCutoff = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()
    const slowCutoff = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString()

    const [{ data: fastPool, error: fastError }, { data: slowPool, error: slowError }] = await Promise.all([
      supabase
        .from('recommendations')
        .select('id, title, status, chapter_count, mangaupdates_id, mangadex_id, anilist_id, mal_id, last_id_check')
        .eq('is_approved', true)
        .in('status', ['ongoing', 'hiatus'])
        .or(`last_chapter_check.is.null,last_chapter_check.lt.${fastCutoff}`)
        .not('last_id_check', 'is', null)
        .limit(BATCH_SIZE),
      supabase
        .from('recommendations')
        .select('id, title, status, chapter_count, mangaupdates_id, mangadex_id, anilist_id, mal_id, last_id_check')
        .eq('is_approved', true)
        .in('status', ['completed', 'cancelled'])
        .or(`last_chapter_check.is.null,last_chapter_check.lt.${slowCutoff}`)
        .not('last_id_check', 'is', null)
        .limit(BATCH_SIZE),
    ])

    if (fastError || slowError) {
      console.error('DB error:', fastError ?? slowError)
      return NextResponse.json({ error: 'DB fetch failed' }, { status: 500 })
    }

    const comics = [...(fastPool ?? []), ...(slowPool ?? [])].slice(0, BATCH_SIZE)

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
        const { chapter: newChapterCount, source, tried, resolvedStatus, statusSources, formatRejections } = await resolveChapterCount(comic)

        if (formatRejections.length > 0) {
          const clearPayload: Record<string, any> = {}
          if (formatRejections.includes('MangaUpdates')) clearPayload.mangaupdates_id = null
          if (formatRejections.includes('MangaDex'))     clearPayload.mangadex_id     = null
          if (formatRejections.includes('MAL'))          clearPayload.mal_id          = null
          if (formatRejections.includes('AniList'))      clearPayload.anilist_id      = null
          if (Object.keys(clearPayload).length > 0) {
            clearPayload.last_id_check = null // force ID checker to re-verify on its next pass
            await supabase.from('recommendations').update(clearPayload).eq('id', comic.id)
          }
        }

        const logEntry: CheckLog = {
          comic_id:          comic.id,
          comic_title:       comic.title,
          database_tried:    tried,
          database_success:  source,
          old_chapter_count: comic.chapter_count,
          new_chapter_count: newChapterCount,
          old_status:        comic.status,
          status:            'no_update',
          format_rejections: formatRejections.length > 0 ? formatRejections : undefined,
          timestamp,
        }

        if (resolvedStatus && resolvedStatus !== comic.status) {
          const finalChapter = newChapterCount ?? comic.chapter_count ?? 0
          const updatePayload: Record<string, any> = {
            status:              resolvedStatus,
            chapter_count:       finalChapter,
            last_chapter_check:  timestamp,
          }

          await supabase.from('recommendations').update(updatePayload).eq('id', comic.id)

          logEntry.status           = resolvedStatus === 'completed' ? 'completed_corrected' : 'status_corrected'
          logEntry.new_status       = resolvedStatus
          logEntry.new_chapter_count = finalChapter
          logEntry.reason           = `${statusSources.length} sources (${statusSources.join(', ')}) agree status is now "${resolvedStatus}".`
          logs.push(logEntry)
          continue
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
            const pushTitle     = `📖 ${comic.title} updated`
            const pushBody      = `New chapters available, now at chapter ${newChapterCount}`
            const notifications = userIds.map((userId: string) => ({
              user_id: userId,
              type:    'system',
              title:   pushTitle,
              content: pushBody,
              data:    { recommendation_id: comic.id, new_chapter_count: newChapterCount, old_chapter_count: comic.chapter_count },
            }))

            await supabase.from('notifications').insert(notifications)

            Promise.allSettled(
              userIds.map((userId: string) =>
                sendPushForUser(userId, pushTitle, pushBody, `/comic/${comic.id}`)
              )
            ).catch(() => {})
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

          await supabase.from('recommendations')
            .update({ last_chapter_check: timestamp })
            .eq('id', comic.id)

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
          // 3. ZERO RESULTS FOUND (this now also covers "all sources were
          // format-rejected" — the bad IDs were already cleared above)
          await supabase.from('recommendations')
            .update({ last_chapter_check: timestamp })
            .eq('id', comic.id)

          logEntry.status = 'failed'
          logEntry.reason = formatRejections.length > 0
            ? `Stored ID(s) pointed to non-manga formats (${formatRejections.join(', ')}) cleared for ID Checker re-verification.`
            : 'No valid ID or all APIs returned null'

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