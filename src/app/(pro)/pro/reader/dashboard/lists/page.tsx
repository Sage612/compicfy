import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReadingListsClient } from '@/components/user/ReadingListsClient'
import { PageShell } from '@/components/dashboard/PageHeader'
import { maxFolderDepth } from '@/lib/utils/folders'
import type { Metadata } from 'next'

type ReadingListRow = {
  id: string
  name: string
  description: string | null
  is_public: boolean
  created_at: string
  star_count: number
  user_id: string
  folder_id: string | null
}

type ReadingListItemRow = { list_id: string }

type CoverRow = {
  list_id: string
  recommendations: { cover_url: string | null } | null
}

type FolderRow = {
  id: string
  parent_id: string | null
  name: string
  created_at: string
}

type ProfileRow = {
  role: string | null
  is_pro: boolean | null
  pro_expires_at: string | null
  is_patron: boolean | null
  patron_expires_at: string | null
}

export const metadata: Metadata = { title: 'Reading Lists | Pro' }

export default async function ProReaderListsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: lists } = (await supabase
    .from('reading_lists')
    .select('id, name, description, is_public, created_at, star_count, user_id, folder_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })) as { data: ReadingListRow[] | null }

  const listIds = (lists ?? []).map((list) => list.id)

  const { data: countRows } = (await supabase
    .from('reading_list_items')
    .select('list_id')
    .in('list_id', listIds)) as { data: ReadingListItemRow[] | null }

  const countMap: Record<string, number> = {}
  for (const row of countRows ?? []) {
    countMap[row.list_id] = (countMap[row.list_id] ?? 0) + 1
  }

  const { data: coverRows } = (await supabase
    .from('reading_list_items')
    .select('list_id, recommendations(cover_url)')
    .in('list_id', listIds)
    .not('recommendations', 'is', null)
    .order('added_at', { ascending: false })) as { data: CoverRow[] | null }

  const coverMap: Record<string, string[]> = {}
  for (const row of coverRows ?? []) {
    const url = row.recommendations?.cover_url
    if (!url) continue
    if (!coverMap[row.list_id]) coverMap[row.list_id] = []
    if (coverMap[row.list_id].length < 4) coverMap[row.list_id].push(url)
  }

  const enriched = (lists ?? []).map((list) => ({
    ...list,
    _item_count: countMap[list.id] ?? 0,
    _cover_urls: coverMap[list.id] ?? [],
  }))

  const { data: folders } = (await supabase
    .from('list_folders')
    .select('id, parent_id, name, created_at')
    .eq('user_id', user.id)
    .order('name', { ascending: true })) as { data: FolderRow[] | null }

  const { data: profile } = (await supabase
    .from('profiles')
    .select('role, is_pro, pro_expires_at, is_patron, patron_expires_at')
    .eq('id', user.id)
    .single()) as { data: ProfileRow | null }

  const safeProfile = profile ? { ...profile, role: profile.role ?? '' } : null

  return (
    <PageShell>
      <ReadingListsClient
        initialLists={enriched}
        initialFolders={folders ?? []}
        folderDepthLimit={safeProfile ? maxFolderDepth(safeProfile) : 0}
        basePath="/pro/reader/dashboard/lists"
      />
    </PageShell>
  )
}