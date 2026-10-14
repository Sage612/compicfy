import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  LIST_FOLDER_NAME_MAX_LENGTH, maxFolderDepth, canMoveFolder, isDescendantOf,
} from '@/lib/utils/folders'
import type { ListFolder } from '@/lib/utils/folders'

interface RouteContext {
  params: Promise<{ id: string }>
}

async function getProfile(supabase: any, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('role, is_pro, pro_expires_at, is_patron, patron_expires_at')
    .eq('id', userId)
    .single()
  return data
}

async function getUserFolders(supabase: any, userId: string): Promise<ListFolder[]> {
  const { data } = await supabase
    .from('list_folders')
    .select('id, parent_id, name, created_at')
    .eq('user_id', userId)
  return (data ?? []) as ListFolder[]
}

// PATCH /api/list-folders/[id]
// Body: { name?: string, parent_id?: string | null }  (null = move to top level)
// Renaming is open to everyone (a lapsed user can still tidy up). Moving a
// folder is checked against the tier's depth limit, with one exception: a
// move that makes the tree shallower is always allowed, so someone whose
// Patron access lapsed can flatten what they built.
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body      = await req.json()
    const hasName   = body.name !== undefined
    const hasParent = body.parent_id !== undefined

    if (!hasName && !hasParent) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const all    = await getUserFolders(supabase, user.id)
    const folder = all.find(f => f.id === id)
    if (!folder) return NextResponse.json({ error: 'Folder not found' }, { status: 404 })

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }

    if (hasName) {
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      if (!name) {
        return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
      }
      if (name.length > LIST_FOLDER_NAME_MAX_LENGTH) {
        return NextResponse.json(
          { error: `Folder name must be ${LIST_FOLDER_NAME_MAX_LENGTH} characters or fewer` },
          { status: 400 }
        )
      }
      updates.name = name
    }

    if (hasParent) {
      if (body.parent_id !== null && typeof body.parent_id !== 'string') {
        return NextResponse.json({ error: 'parent_id must be a string or null' }, { status: 400 })
      }
      const newParent: string | null = body.parent_id

      if (newParent !== folder.parent_id) {
        if (newParent) {
          if (!all.some(f => f.id === newParent)) {
            return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 })
          }
          if (newParent === id || isDescendantOf(newParent, id, all)) {
            return NextResponse.json(
              { error: 'A folder cannot be moved into itself or one of its own subfolders' },
              { status: 400 }
            )
          }
        }

        const profile      = await getProfile(supabase, user.id)
        const allowedDepth = profile ? maxFolderDepth(profile) : 0

        if (!canMoveFolder(id, newParent, all, allowedDepth)) {
          return NextResponse.json(
            {
              error: 'locked',
              message: allowedDepth < 1
                ? 'Folders are a Pro feature.'
                : allowedDepth === 1
                  ? 'Putting a folder inside a folder is a Patron feature.'
                  : `Folders can only be nested ${allowedDepth} levels deep.`,
              upgrade_url: '/pricing',
            },
            { status: 403 }
          )
        }

        updates.parent_id = newParent
      }
    }

    const { data: updated, error } = await (supabase as any)
      .from('list_folders')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, parent_id, name, created_at')
      .single()

    if (error) return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 })

    return NextResponse.json({ folder: updated })
  } catch {
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 })
  }
}

// DELETE /api/list-folders/[id]
// Lists and subfolders inside it move up one level (into this folder's
// parent, or the top level if it has none). Lists are never deleted.
export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const all    = await getUserFolders(supabase, user.id)
    const folder = all.find(f => f.id === id)
    if (!folder) return NextResponse.json({ error: 'Folder not found' }, { status: 404 })

    const { error: listsError } = await (supabase as any)
      .from('reading_lists')
      .update({ folder_id: folder.parent_id })
      .eq('folder_id', id)
      .eq('user_id', user.id)
    if (listsError) return NextResponse.json({ error: 'Failed to remove folder' }, { status: 500 })

    const { error: childrenError } = await (supabase as any)
      .from('list_folders')
      .update({ parent_id: folder.parent_id })
      .eq('parent_id', id)
      .eq('user_id', user.id)
    if (childrenError) return NextResponse.json({ error: 'Failed to remove folder' }, { status: 500 })

    const { error: deleteError } = await (supabase as any)
      .from('list_folders')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (deleteError) return NextResponse.json({ error: 'Failed to remove folder' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to remove folder' }, { status: 500 })
  }
}