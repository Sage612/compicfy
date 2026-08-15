// src/app/api/import/list/route.ts
//
// POST /api/import/list — accepts a multipart file upload (MAL or AniList
// XML export) + a `source` field, parses it, matches each title against
// ComPicfy via matchToComPicfy(), creates a new reading list named for the
// import source, and adds every matched title to it with the imported
// status/progress carried over.
//
// Processing is done inline (not a background job/queue) for now — see the
// note near MAX_ENTRIES_INLINE below on why, and what would need to change
// to support larger lists safely.

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseMalXml } from '@/lib/import/parseMalXml'
import { matchToComPicfy } from '@/lib/import/matchToComPicfy'

const VALID_SOURCES = ['myanimelist', 'anilist', 'mangaupdates', 'mangabaka'] as const
type ImportSource = typeof VALID_SOURCES[number]

const SOURCE_LIST_NAMES: Record<ImportSource, string> = {
  myanimelist:  'Imported from MyAnimeList',
  anilist:      'Imported from AniList',
  mangaupdates: 'Imported from MangaUpdates',
  mangabaka:    'Imported from MangaBaka',
}

// Inline processing means one request holds open while every title is
// matched (a DB call + possibly 3 external API calls each). This is fine
// for typical list sizes but Vercel's default serverless function timeout
// (10s on Hobby, up to 60s on Pro plans, configurable) will cut off very
// large imports mid-way. A real background-job queue (e.g. via a cron
// worker, or Vercel's own background functions if available) would be
// the correct fix for supporting larger lists — flagged here rather than
// silently truncating; MAX_ENTRIES_INLINE below fails loudly instead.
const MAX_ENTRIES_INLINE = 150

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data with a file field' }, { status: 400 })
  }

  const file = formData.get('file')
  const sourceRaw = formData.get('source')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  if (typeof sourceRaw !== 'string' || !VALID_SOURCES.includes(sourceRaw as ImportSource)) {
    return NextResponse.json(
      { error: `source is required and must be one of: ${VALID_SOURCES.join(', ')}` },
      { status: 400 }
    )
  }
  const source = sourceRaw as ImportSource

  // MangaUpdates/MangaBaka don't have a confirmed parser yet (see roadmap
  // item #1 — phase 2, blocked on format confirmation).
  if (source === 'mangaupdates' || source === 'mangabaka') {
    return NextResponse.json(
      { error: `Import from ${source} is not yet supported. MyAnimeList and AniList imports are available now.` },
      { status: 400 }
    )
  }

  const xmlText = await file.text()
  const { entries, parseErrors } = parseMalXml(xmlText)

  if (entries.length === 0) {
    return NextResponse.json(
      { error: 'No importable entries found in this file.', parseErrors },
      { status: 400 }
    )
  }

  if (entries.length > MAX_ENTRIES_INLINE) {
    return NextResponse.json(
      {
        error: `This list has ${entries.length} entries, which is more than the current import limit of ${MAX_ENTRIES_INLINE}. Support for larger lists is coming soon.`,
      },
      { status: 400 }
    )
  }

  // Create the job row up front so there's a record even if something
  // fails partway through.
  const { data: job, error: jobError } = await (supabase as any)
    .from('import_jobs')
    .insert({
      user_id: user.id,
      source,
      status: 'processing',
      total_entries: entries.length,
    })
    .select()
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Failed to create import job' }, { status: 500 })
  }

  // Create the destination reading list.
  const { data: list, error: listError } = await (supabase as any)
    .from('reading_lists')
    .insert({
      user_id: user.id,
      name: SOURCE_LIST_NAMES[source],
      description: `Automatically created from a ${SOURCE_LIST_NAMES[source].replace('Imported from ', '')} import.`,
      is_public: false,
    })
    .select()
    .single()

  if (listError || !list) {
    await (supabase as any)
      .from('import_jobs')
      .update({ status: 'failed', error_message: 'Failed to create destination reading list' })
      .eq('id', job.id)
    return NextResponse.json({ error: 'Failed to create destination reading list' }, { status: 500 })
  }

  let matchedCount = 0
  const skippedTitles: { title: string; reason: string }[] = []

  for (const entry of entries) {
    const match = await matchToComPicfy(supabase, entry.title)

    if (!match.matched || !match.recommendationId) {
      skippedTitles.push({
        title: entry.title,
        reason: match.foundExternally
          ? 'Found externally but not yet in ComPicfy — consider recommending it.'
          : 'No match found.',
      })
      continue
    }

    const { error: itemError } = await (supabase as any)
      .from('reading_list_items')
      .upsert(
        {
          list_id: list.id,
          recommendation_id: match.recommendationId,
          status: entry.status,
          progress_chapter: entry.progressChapter ?? 0,
        },
        { onConflict: 'list_id,recommendation_id', ignoreDuplicates: false }
      )

    if (itemError) {
      skippedTitles.push({ title: entry.title, reason: 'Matched but failed to add to list.' })
      continue
    }

    matchedCount += 1
  }

  const { data: finalJob } = await (supabase as any)
    .from('import_jobs')
    .update({
      status: 'completed',
      list_id: list.id,
      matched_count: matchedCount,
      skipped_count: skippedTitles.length,
      skipped_titles: skippedTitles,
      completed_at: new Date().toISOString(),
    })
    .eq('id', job.id)
    .select()
    .single()

  return NextResponse.json({ job: finalJob, list, parseErrors }, { status: 201 })
}