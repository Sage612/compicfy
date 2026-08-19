import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ReadingListDetail } from '@/components/user/ReadingListDetail'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Reading List | Pro' }

export const dynamic = 'force-dynamic'

export default async function ProReaderListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id }   = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: list } = await supabase
    .from('reading_lists')
    .select('id, name, description, is_public, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!list) notFound()

  const { data: allLists } = await supabase
    .from('reading_lists')
    .select('id, name')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: items } = await supabase
    .from('reading_list_items')
    .select(`
      id,
      list_id,
      status,
      progress_chapter,
      notes,
      position,
      last_read_at,
      added_at,
      recommendation_id,
      custom_entry_id,
      recommendations (
        id,
        title,
        cover_url,
        type,
        status,
        genres,
        upvotes,
        chapter_count
      ),
      custom_entries (
        id,
        title,
        cover_url,
        notes
      )
    `)
    .eq('list_id', id)
    .order('position', { ascending: true })

  return (
    <ReadingListDetail
      list={list as any}
      initialItems={(items ?? []) as any}
      allLists={allLists ?? []}
      backHref="/pro/reader/dashboard/lists"
      isPro={true}
    />
  )
}