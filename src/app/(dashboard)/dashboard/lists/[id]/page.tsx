import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ReadingListDetail } from '@/components/user/ReadingListDetail'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('reading_lists')
    .select('name')
    .eq('id', id)
    .single()
  return { title: data?.name ?? 'Reading List' }
}

export default async function ReadingListDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: list } = await supabase
    .from('reading_lists')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!list) notFound()

  const { data: items } = await (supabase as any)
    .from('reading_list_items')
    .select('*, recommendations(id, title, cover_url, type, status, genres, upvotes)')
    .eq('list_id', id)
    .order('added_at', { ascending: false })

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <ReadingListDetail list={list} initialItems={items ?? []} />
    </div>
  )
}