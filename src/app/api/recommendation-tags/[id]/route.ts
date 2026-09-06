// src/app/api/recommendation-tags/[id]/route.ts
//
// DELETE /api/recommendation-tags/[id] — removes a tag assignment. RLS
// ("Users can remove tags they personally added") already enforces that
// only the user who added a given relation can delete it, so this route
// just forwards the request and reports whether anything was actually
// deleted (0 rows affected means either it doesn't exist or RLS blocked
// it — same 404 either way, no need to distinguish for the caller).

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('recommendation_tags')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('Failed to remove tag:', error)
    return NextResponse.json({ error: 'Failed to remove tag' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Tag assignment not found, or you do not own it' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}