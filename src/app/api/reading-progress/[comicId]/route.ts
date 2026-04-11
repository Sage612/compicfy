import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface Params {
  params: Promise<{ comicId: string }>
}

// GET /api/reading-progress/[comicId]
// Returns the user's reading progress for a specific comic across all their lists
export async function GET(_req: Request, { params }: Params) {
  try {
    const { comicId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ progress: null })

    // Find this comic across all the user's reading lists
    const { data } = await supabase
      .from('reading_list_items')
      .select(`
        id,
        list_id,
        status,
        progress_chapter,
        notes,
        last_read_at,
        updated_at,
        reading_lists!inner ( id, name, user_id )
      `)
      .eq('recommendation_id', comicId)
      .eq('reading_lists.user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ progress: data ?? null })
  } catch {
    return NextResponse.json({ progress: null }, { status: 500 })
  }
}

// PATCH /api/reading-progress/[comicId]
// Update status and/or chapter for a comic in a specific list
// Body: { list_id, status?, progress_chapter? }
export async function PATCH(req: Request, { params }: Params) {
  try {
    const { comicId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { list_id, status, progress_chapter } = body

    if (!list_id) return NextResponse.json({ error: 'list_id required' }, { status: 400 })

    // Verify user owns this list
    const { data: list } = await supabase
      .from('reading_lists')
      .select('id')
      .eq('id', list_id)
      .eq('user_id', user.id)
      .single()

    if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 })

    // Build update payload
    const updates: Record<string, any> = {}
    if (status !== undefined)           updates.status           = status
    if (progress_chapter !== undefined) updates.progress_chapter = progress_chapter

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    // Upsert — create if doesn't exist, update if it does
    const { data: item, error } = await (supabase as any)
      .from('reading_list_items')
      .upsert(
        {
          list_id,
          recommendation_id: comicId,
          ...updates,
        },
        { onConflict: 'list_id,recommendation_id' }
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ progress: item })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to update' }, { status: 500 })
  }
}

// POST /api/reading-progress/[comicId]
// Add comic to a list with initial status
export async function POST(req: Request, { params }: Params) {
  try {
    const { comicId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { list_id, status = 'plan_to_read', progress_chapter = null } = await req.json()

    if (!list_id) return NextResponse.json({ error: 'list_id required' }, { status: 400 })

    // Verify ownership
    const { data: list } = await supabase
      .from('reading_lists')
      .select('id')
      .eq('id', list_id)
      .eq('user_id', user.id)
      .single()

    if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 })

    const { data: item, error } = await (supabase as any)
      .from('reading_list_items')
      .upsert(
        { list_id, recommendation_id: comicId, status, progress_chapter },
        { onConflict: 'list_id,recommendation_id' }
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ progress: item })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to add' }, { status: 500 })
  }
}