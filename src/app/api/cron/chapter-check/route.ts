import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SITE_URL   = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://compicfy.cloud'
const BATCH_SIZE = 20 // comics to check per run

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
    .select('id, title, chapter_count, mangaupdates_id, anilist_id, mal_id, mangadex_id')
    .eq('is_approved', true)
    .eq('status', 'ongoing')
    .or(`last_chapter_check.is.null,last_chapter_check.lt.${cutoff}`)
    .limit(BATCH_SIZE)

  if (!comics || comics.length === 0) {
    return NextResponse.json({ checked: 0, updated: 0 })
  }

  let updated = 0
  const results = []

  for (const comic of comics) {
    try {
      // Try sources in order of reliability
      const newChapterCount = await getLatestChapterCount(comic)

      // Update last_chapter_check regardless
      await supabase
        .from('recommendations')
        .update({ last_chapter_check: new Date().toISOString() })
        .eq('id', comic.id)

      if (newChapterCount && newChapterCount > (comic.chapter_count ?? 0)) {
        // Chapter count increased — update and notify
        await supabase
          .from('recommendations')
          .update({
            chapter_count:      newChapterCount,
            last_chapter_check: new Date().toISOString(),
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
        }

        results.push({
          id:      comic.id,
          title:   comic.title,
          old:     comic.chapter_count,
          new:     newChapterCount,
          notified: trackers?.length ?? 0,
        })
      }
    } catch (err) {
      console.error(`Failed to check ${comic.title}:`, err)
    }
  }

  return NextResponse.json({
    checked: comics.length,
    updated,
    results,
  })
}

async function getLatestChapterCount(comic: {
  title:            string
  mangaupdates_id?: string | null
  anilist_id?:      string | null
  mal_id?:          string | null
  mangadex_id?:     string | null
}): Promise<number | null> {

  // 1. MangaUpdates — most reliable
  if (comic.mangaupdates_id) {
    try {
      const res = await fetch(
        `https://api.mangaupdates.com/v1/series/${comic.mangaupdates_id}`,
        { next: { revalidate: 0 } }
      )
      if (res.ok) {
        const data = await res.json()
        const ch = data?.latest_chapter
        if (ch && !isNaN(Number(ch))) return Number(ch)
      }
    } catch {}
  }

  // 2. AniList
  if (comic.anilist_id) {
    try {
      const gql = `query($id:Int){Media(id:$id,type:MANGA){chapters}}`
      const res = await fetch('https://graphql.anilist.co', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query: gql, variables: { id: parseInt(comic.anilist_id) } }),
        next:    { revalidate: 0 },
      })
      if (res.ok) {
        const data = await res.json()
        const ch = data?.data?.Media?.chapters
        if (ch && !isNaN(Number(ch))) return Number(ch)
      }
    } catch {}
  }

  // 3. MAL via Jikan
  if (comic.mal_id) {
    try {
      const res = await fetch(
        `https://api.jikan.moe/v4/manga/${comic.mal_id}`,
        { next: { revalidate: 0 } }
      )
      if (res.ok) {
        const data = await res.json()
        const ch = data?.data?.chapters
        if (ch && !isNaN(Number(ch))) return Number(ch)
      }
    } catch {}
  }

  // 4. MangaDex
  if (comic.mangadex_id) {
    try {
      const res = await fetch(
        `https://api.mangadex.org/manga/${comic.mangadex_id}`,
        { next: { revalidate: 0 } }
      )
      if (res.ok) {
        const data = await res.json()
        const ch = data?.data?.attributes?.lastChapter
        if (ch && !isNaN(Number(ch))) return Number(ch)
      }
    } catch {}
  }

  return null
}