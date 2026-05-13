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
  const { data: list } = await (supabase as any)
    .from('reading_lists')
    .select('name')
    .eq('id', id)
    .single()
  return { title: list?.name ? `${list.name} | Reading Lists` : 'Reading List' }
}

export default async function ProListDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: allListsData } = await (supabase as any)
    .from('reading_lists')
    .select('id, name, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const list = (allListsData ?? []).find((l: any) => l.id === id)
  if (!list) notFound()

  const { data: items } = await supabase
    .from('reading_list_items')
    .select(`
      id,
      list_id,
      status,
      progress_chapter,
      notes,
      added_at,
      recommendations (
        id, title, cover_url, type, status, genres, upvotes, chapter_count
      )
    `)
    .eq('list_id', id)
    .order('added_at', { ascending: false })

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <ReadingListDetail
        list={list as any}
        initialItems={(items ?? []) as any}
        isLocked={false}
        allLists={(allListsData ?? []) as any}
        backHref="/pro/lists"
      />
    </div>
  )
}