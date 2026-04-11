// src/app/(dashboard)/dashboard/lists/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ReadingListDetail } from '@/components/user/ReadingListDetail'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

const FREE_LIST_LIMIT = 3

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

export default async function ListDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch profile for pro check
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('is_pro, pro_expires_at, role')
    .eq('id', user.id)
    .single()

  const isPro = profile
    ? profile.role === 'admin' ||
      ['admin', 'moderator'].includes(profile.role) ||
      (profile.is_pro &&
        (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
    : false

  // Fetch all lists for "Move to List" functionality and locking check
  const { data: allListsData } = await (supabase as any)
    .from('reading_lists')
    .select('id, name, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const list = (allListsData ?? []).find((l: any) => l.id === id)
  if (!list) notFound()

  // Compute isLocked: free users — check if this list is beyond the 3 oldest
  let isLocked = false
  if (!isPro && allListsData) {
    const freeListIds = new Set(allListsData.slice(0, FREE_LIST_LIMIT).map((l: any) => l.id))
    isLocked = !freeListIds.has(id)
  }

  // Fetch items with list_id and chapter_count
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
        isLocked={isLocked}
        allLists={(allListsData ?? []) as any}
      />
    </div>
  )
}