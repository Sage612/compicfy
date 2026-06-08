import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReadingListsClient } from '@/components/user/ReadingListsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Reading Lists | Pro' }

export default async function ProReaderListsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: lists } = await (supabase as any)
    .from('reading_lists')
    .select(`
      id, name, description, is_public, created_at, star_count,
      user_id,
      reading_list_items(
        count,
        recommendations(cover_url)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <ReadingListsClient
        initialLists={lists ?? []}
        basePath="/pro/reader/dashboard/lists"
      />
    </div>
  )
}