// src/app/api/tags/suggest/route.ts
//
// POST /api/tags/suggest — suggests a new tag. Goes to 'pending' status,
// invisible to /api/tags (approved-only) and thus invisible in every
// picker/filter, until an admin/mod approves it via the admin dashboard
// (not built in this pass — approval happens directly in Supabase or via
// a future admin UI, out of scope for the core tagging feature itself).

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAX_NAME_LENGTH = 40

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, category } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (name.trim().length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: `name must be ${MAX_NAME_LENGTH} characters or fewer` }, { status: 400 })
  }
  if (category !== 'trope' && category !== 'mood') {
    return NextResponse.json({ error: "category must be 'trope' or 'mood'" }, { status: 400 })
  }

  const trimmedName = name.trim()

  // Check for an existing tag with the same name+category first (case-
  // insensitive), in any status — no point suggesting "Slow Burn" again
  // if "slow burn" is already pending or approved.
  const { data: existing } = await supabase
    .from('tags')
    .select('id, name, status')
    .eq('category', category)
    .ilike('name', trimmedName)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      {
        error: existing.status === 'approved'
          ? `"${existing.name}" already exists as an approved tag`
          : `"${existing.name}" has already been suggested and is awaiting review`,
      },
      { status: 409 }
    )
  }

  const { data: tag, error } = await (supabase as any)
    .from('tags')
    .insert({
      name: trimmedName,
      category,
      status: 'pending',
      suggested_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to suggest tag:', error)
    return NextResponse.json({ error: 'Failed to suggest tag' }, { status: 500 })
  }

  return NextResponse.json({ tag }, { status: 201 })
}