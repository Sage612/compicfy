import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH /api/lists/[id]/folder
// Body: { folder_id: string | null }  (null = back to the top level)
// A separate route rather than a new field on PATCH /api/lists/[id], so
// that existing route stays exactly as it is.
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { id: listId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    if (body.folder_id !== null && typeof body.folder_id !== 'string') {
      return NextResponse.json({ error: 'folder_id must be a string or null' }, { status: 400 })
    }
    const folderId: string | null = body.folder_id

    const { data: list } = await (supabase as any)
      .from('reading_lists')
      .select('id')
      .eq('id', listId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 })

    if (folderId) {
      const { data: folder } = await (supabase as any)
        .from('list_folders')
        .select('id')
        .eq('id', folderId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!folder) return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    const { error } = await (supabase as any)
      .from('reading_lists')
      .update({ folder_id: folderId })
      .eq('id', listId)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: 'Failed to move list' }, { status: 500 })

    return NextResponse.json({ list: { id: listId, folder_id: folderId } })
  } catch {
    return NextResponse.json({ error: 'Failed to move list' }, { status: 500 })
  }
}