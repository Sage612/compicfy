// src/app/api/tags/route.ts
//
// GET /api/tags?category=trope|mood — lists approved tags. No auth
// required (matches the "approved tags viewable by everyone" RLS policy).
// Used by the tag picker on the submission form, the "add tag" affordance
// on comic pages, and the search/browse filter UI.

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')

  const supabase = await createClient()

  let query = supabase
    .from('tags')
    .select('id, name, category')
    .eq('status', 'approved')
    .order('name', { ascending: true })

  if (category === 'trope' || category === 'mood') {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch tags:', error)
    return NextResponse.json({ tags: [] })
  }

  return NextResponse.json({ tags: data ?? [] })
}