import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAX_TAGS_PER_COMIC = 15

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { recommendation_id, tag_id } = body

  if (!recommendation_id || !tag_id) {
    return NextResponse.json({ error: 'recommendation_id and tag_id are required' }, { status: 400 })
  }

  // Confirm the tag is actually approved — a pending/rejected tag_id
  // should never be attachable, even if someone crafts the request
  // directly (RLS doesn't block this specifically since
  // recommendation_tags' own insert policy only checks added_by).
  const { data: tag, error: tagError } = await supabase
    .from('tags')
    .select('id, status')
    .eq('id', tag_id)
    .single()

  if (tagError || !tag || (tag as any).status !== 'approved') {
    return NextResponse.json({ error: 'Tag not found or not approved' }, { status: 400 })
  }

  // Enforce the cap.
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
    // Unique constraint violation means this exact tag is already on
    // this comic — a friendlier message than a raw DB error.
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This tag is already on this comic' }, { status: 409 })
    }
    console.error('Failed to add tag to comic:', error)
    return NextResponse.json({ error: 'Failed to add tag' }, { status: 500 })
  }

  return NextResponse.json({ relation }, { status: 201 })
}