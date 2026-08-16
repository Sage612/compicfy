import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

interface RpcCandidate {
  id: string
  title: string
  alternative_titles_flat: string | null
  title_similarity: number
  alt_similarity: number
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, ' ').trim()
}

function isCloseMatch(a: string, b: string): boolean {
  const na = normalizeTitle(a)
  const nb = normalizeTitle(b)
  if (na === nb) return true
  const strip = (s: string) => s.replace(/[:\-–—'".,!?]/g, '').replace(/\s+/g, ' ').trim()
  return strip(na) === strip(nb)
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: entry, error: entryError } = await supabase
    .from('custom_entries')
    .select('id, title, user_id')
    .eq('id', id)
    .single()

  if (entryError || !entry || (entry as any).user_id !== user.id) {
    return NextResponse.json({ error: 'Custom entry not found' }, { status: 404 })
  }

  const { data: candidates, error: rpcError } = await supabase.rpc('match_recommendation_title', {
    search_title: (entry as any).title,
    similarity_threshold: 0.3,
    match_limit: 3,
  })

  if (rpcError) {
    return NextResponse.json({ match: null })
  }

  for (const candidate of (candidates ?? []) as RpcCandidate[]) {
    if (isCloseMatch((entry as any).title, candidate.title)) {
      return NextResponse.json({
        match: { recommendation_id: candidate.id, title: candidate.title },
      })
    }
    if (candidate.alternative_titles_flat && isCloseMatch((entry as any).title, candidate.alternative_titles_flat)) {
      return NextResponse.json({
        match: { recommendation_id: candidate.id, title: candidate.title },
      })
    }
  }

  return NextResponse.json({ match: null })
}

export async function POST(req: Request, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { recommendation_id } = body
  if (!recommendation_id || typeof recommendation_id !== 'string') {
    return NextResponse.json({ error: 'recommendation_id is required' }, { status: 400 })
  }

  const { data: entry, error: entryError } = await supabase
    .from('custom_entries')
    .select('id, user_id')
    .eq('id', id)
    .single()

  if (entryError || !entry || (entry as any).user_id !== user.id) {
    return NextResponse.json({ error: 'Custom entry not found' }, { status: 404 })
  }

  // Find the reading_list_items row(s) pointing at this custom entry —
  // could technically be more than one if the same custom entry was added
  // to multiple lists, though the current UI only ever creates one.
  const { data: items, error: itemsError } = await (supabase as any)
    .from('reading_list_items')
    .select('id, list_id, status, progress_chapter, notes')
    .eq('custom_entry_id', id)

  if (itemsError) {
    return NextResponse.json({ error: 'Failed to look up list items' }, { status: 500 })
  }

  // Convert each affected row: point at the real recommendation instead,
  // carrying over status/progress/notes, clear custom_entry_id.
  // The unique index on (list_id, recommendation_id) protects against a
  // conflict if that list already separately has the real recommendation
  // tracked — in that case this specific row's update will fail the
  // constraint, so it's skipped rather than erroring the whole operation.
  let convertedCount = 0
  for (const item of items ?? []) {
    const { error: updateError } = await (supabase as any)
      .from('reading_list_items')
      .update({
        recommendation_id,
        custom_entry_id: null,
      })
      .eq('id', item.id)

    if (!updateError) convertedCount += 1
  }

  // Only delete the custom entry if every referencing row was converted —
  // otherwise leave it in place so the still-pointing row isn't orphaned.
  if (convertedCount === (items?.length ?? 0)) {
    await (supabase as any).from('custom_entries').delete().eq('id', id)
  }

  return NextResponse.json({ converted: convertedCount, total: items?.length ?? 0 })
}