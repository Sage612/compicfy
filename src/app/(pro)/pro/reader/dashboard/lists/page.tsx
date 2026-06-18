import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReadingListsClient } from '@/components/user/ReadingListsClient'
import type { Metadata } from 'next'

// Inline image proxy helper to route external covers safely
const proxyCover = (url: string | null): string => {
  if (!url) return ''
  if (url.startsWith('/') || url.startsWith('blob:')) return url
  return \/api/proxy/image?url=\\
}

export const metadata: Metadata = { title: 'Reading Lists | Pro' }

export default async function ProReaderListsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: lists } = await (supabase as any)
    .from('reading_lists')
    .select('id, name, description, is_public, created_at, star_count, user_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const listIds = (lists ?? []).map((l: any) => l.id)

  const { data: countRows } = await (supabase as any)
    .from('reading_list_items')
    .select('list_id')
    .in('list_id', listIds)

  const countMap: Record<string, number> = {}
  for (const row of (countRows ?? [])) {
    countMap[row.list_id] = (countMap[row.list_id] ?? 0) + 1
  }

  const { data: coverRows } = await (supabase as any)
    .from('reading_list_items')
    .select('list_id, recommendations(cover_url)')
    .in('list_id', listIds)
    .not('recommendations', 'is', null)
    .order('added_at', { ascending: false })

  const coverMap: Record<string, string[]> = {}
  for (const row of (coverRows ?? [])) {
    const url = row.recommendations?.cover_url
    if (!url) continue
    if (!coverMap[row.list_id]) coverMap[row.list_id] = []
    if (coverMap[row.list_id].length < 4) coverMap[row.list_id].push(url)
  }

  const enriched = (lists ?? []).map((l: any) => ({
    ...l,
    _item_count: countMap[l.id] ?? 0,
    _cover_urls: coverMap[l.id] ?? [],
  }))

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <ReadingListsClient
        initialLists={enriched}
        basePath="/pro/reader/dashboard/lists"
      />
    </div>
  )
}