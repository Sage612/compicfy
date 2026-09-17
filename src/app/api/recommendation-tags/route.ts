// src/app/api/recommendation-tags/route.ts
//
// GET /api/recommendation-tags?recommendation_id=<uuid> — lists all tags
// currently attached to a comic. No auth required (matches the
// "viewable by everyone" RLS policy on recommendation_tags) — needed by
// TagList on the public comic detail page.
//
// POST /api/recommendation-tags — attaches an existing, approved tag to
// a comic. Any logged-in user can do this (not just the original
// submitter), since the whole point is that no single person knows every
// applicable trope/mood for a comic. Enforces a soft cap (15 tags per
// comic) at the application layer.

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAX_TAGS_PER_COMIC = 15

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const recommendationId = searchParams.get('recommendation_id')

  if (!recommendationId) {
    return NextResponse.json({ error: 'recommendation_id is required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('recommendation_tags')
    .select('id, tag_id, tags(id, name, category)')
    .eq('recommendation_id', recommendationId)

  if (error) {
    console.error('Failed to fetch recommendation tags:', error)
    return NextResponse.json({ tags: [] })
  }

  const tags = (data ?? [])
    .filter((row: any) => row.tags) // guard against a dangling tag_id if a tag was ever hard-deleted
    .map((row: any) => ({
      relationId: row.id,
      tag: {
        id:       row.tags.id,
        name:     row.tags.name,
        category: row.tags.category,
      },
    }))

  return NextResponse.json({ tags })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { recommendation_id, tag_id } = body

  if (!recommendation_id || !tag_id) {
    return NextResponse.json({ error: 'recommendation_id and tag_id are required' }, { status: 400 })
  }

  const { data: tag, error: tagError } = await supabase
    .from('tags')
    .select('id, status')
    .eq('id', tag_id)
    .single()

  if (tagError || !tag || (tag as any).status !== 'approved') {
    return NextResponse.json({ error: 'Tag not found or not approved' }, { status: 400 })
  }

  const { count, error: countError } = await supabase
    .from('recommendation_tags')
    .select('id', { count: 'exact', head: true })
    .eq('recommendation_id', recommendation_id)

  if (countError) {
    return NextResponse.json({ error: 'Failed to check tag count' }, { status: 500 })
  }
  if ((count ?? 0) >= MAX_TAGS_PER_COMIC) {
    return NextResponse.json(
      { error: `This comic already has the maximum of ${MAX_TAGS_PER_COMIC} tags` },
      { status: 400 }
    )
  }

  const { data: relation, error } = await (supabase as any)
    .from('recommendation_tags')
    .insert({
      recommendation_id,
      tag_id,
      added_by: user.id,
    })
    .select('id, recommendation_id, tag_id, added_by, created_at, tags(id, name, category)')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This tag is already on this comic' }, { status: 409 })
    }
    console.error('Failed to add tag to comic:', error)
    return NextResponse.json({ error: 'Failed to add tag' }, { status: 500 })
  }

  return NextResponse.json({ relation }, { status: 201 })
}