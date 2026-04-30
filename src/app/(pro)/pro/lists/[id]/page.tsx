import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ReadingListDetail } from '@/components/user/ReadingListDetail'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Reading List | Pro' }

export default async function ProListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id }   = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_pro, pro_expires_at')
    .eq('id', user.id)
    .single() as { data: any }

  const isPro =
    profile?.role === 'admin' ||
    (profile?.is_pro &&
      (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))

  if (!isPro) redirect('/pricing?reason=pro_required')

  // Fetch the list — must belong to this user
  const { data: list } = await supabase
    .from('reading_lists')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!list) notFound()

  // Fetch items with recommendation data
  const { data: items } = await supabase
    .from('reading_list_items')
    .select(`
      id, status, progress_chapter, notes, added_at,
      recommendations(
        id, title, cover_url, type, status,
        genres, upvotes, chapter_count
      )
    `)
    .eq('list_id', id)
    .order('added_at', { ascending: false })

 // All lists for the "add to other list" selector
  const { data: allLists } = await supabase
    .from('reading_lists')
    .select('id, name')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false }) as { data: { id: string; name: string }[] | null }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <ReadingListDetail
        list={list}
        initialItems={(items ?? []) as any}
        isLocked={false}
        allLists={(allLists ?? []).filter(l => l.id !== id)}
        backHref="/pro/lists"
      />
    </div>
  )
}