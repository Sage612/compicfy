import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { LIST_FOLDER_NAME_MAX_LENGTH, maxFolderDepth, canCreateFolderUnder } from '@/lib/utils/folders'
import type { ListFolder } from '@/lib/utils/folders'

async function getProfile(supabase: any, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('role, is_pro, pro_expires_at, is_patron, patron_expires_at')
    .eq('id', userId)
    .single()
  return data
}

// GET /api/list-folders
// Open to every signed-in user, including lapsed Pro: existing folders
// stay visible and usable, same "your stuff is safe" approach as locked lists.
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await (supabase as any)
      .from('list_folders')
      .select('id, parent_id, name, created_at')
      .eq('user_id', user.id)
      .order('name', { ascending: true })

    if (error) return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 })

    return NextResponse.json({ folders: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 })
  }
}

// POST /api/list-folders — body: { name: string, parent_id?: string | null }
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body     = await req.json()
    const name     = typeof body.name === 'string' ? body.name.trim() : ''
    const parentId = typeof body.parent_id === 'string' ? body.parent_id : null

    if (!name) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
    }
    if (name.length > LIST_FOLDER_NAME_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Folder name must be ${LIST_FOLDER_NAME_MAX_LENGTH} characters or fewer` },
        { status: 400 }
      )
    }

    const profile      = await getProfile(supabase, user.id)
    const allowedDepth = profile ? maxFolderDepth(profile) : 0

    if (allowedDepth < 1) {
      return NextResponse.json(
        { error: 'locked', message: 'Folders are a Pro feature.', upgrade_url: '/pricing' },
        { status: 403 }
      )
    }

    const { data: existing } = await (supabase as any)
      .from('list_folders')
      .select('id, parent_id, name, created_at')
      .eq('user_id', user.id)
    const all = (existing ?? []) as ListFolder[]

    if (parentId && !all.some(f => f.id === parentId)) {
      return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 })
    }

    if (!canCreateFolderUnder(parentId, all, allowedDepth)) {
      return NextResponse.json(
        {
          error: 'locked',
          message: allowedDepth === 1
            ? 'Putting a folder inside a folder is a Patron feature.'
            : `Folders can only be nested ${allowedDepth} levels deep.`,
          upgrade_url: '/pricing',
        },
        { status: 403 }
      )
    }

    const { data: folder, error } = await (supabase as any)
      .from('list_folders')
      .insert({ user_id: user.id, parent_id: parentId, name })
      .select('id, parent_id, name, created_at')
      .single()

    if (error) return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 })

    return NextResponse.json({ folder }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 })
  }
}