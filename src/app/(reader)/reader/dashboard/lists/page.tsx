import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReadingListsClient } from '@/components/user/ReadingListsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Reading Lists' }

export default async function ReaderListsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch lists with cover previews (no count aggregate — conflicts with nested select)
  const { data: lists } = await (supabase as any)
    .from('reading_lists')
    .select(`
      id, name, description, is_public, created_at, star_count, user_id,
      reading_list_items(
        recommendations(cover_url)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch item counts separately to avoid Supabase aggregate + relation conflict
  const { data: countRows } = await (supabase as any)
    .from('reading_list_items')
    .select('list_id')
    .in('list_id', (lists ?? []).map((l: any) => l.id))

  const countMap: Record<string, number> = {}
  for (const row of (countRows ?? [])) {
    countMap[row.list_id] = (countMap[row.list_id] ?? 0) + 1
  }

  // Merge count into each list as reading_list_items[0].count shape
  const enriched = (lists ?? []).map((l: any) => ({
    ...l,
    _item_count: countMap[l.id] ?? 0,
  }))

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <ReadingListsClient
        initialLists={enriched}
        basePath="/reader/dashboard/lists"
      />
    </div>
  )
}