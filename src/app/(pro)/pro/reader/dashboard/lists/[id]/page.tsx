import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ReadingListDetail } from '@/components/user/ReadingListDetail'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Reading List' }

export default async function ProReaderListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: list } = await supabase.from('reading_lists').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!list) notFound()

  const { data: items } = await supabase
    .from('reading_list_items')
    .select('id, recommendation_id, notes, added_at, recommendations(id, title, cover_url)')
    .eq('reading_list_id', id)
    .order('added_at', { ascending: false })

  return <ReadingListDetail list={list as any} initialItems={items ?? []} backHref="/pro/reader/dashboard/lists" />
}
