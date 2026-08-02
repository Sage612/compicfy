import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  BookOpen, Globe, ArrowLeft, BookMarked, ThumbsUp, Lock,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import type { Metadata } from 'next'
import { PublicListDetailClient } from '@/components/lists/PublicListDetailClient'
import { isProUser } from '@/lib/access'

interface Props {
  params: Promise<{ id: string }>
}

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-teal-500/10   text-teal-500   border-teal-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
}

const STATUS_META: Record<string, { label: string; emoji: string }> = {
  reading:      { label: 'Reading',      emoji: '📖' },
  plan_to_read: { label: 'Plan to Read', emoji: '📌' },
  marinating:   { label: 'Marinating',   emoji: '🫙' },
  completed:    { label: 'Completed',    emoji: '✅' },
  on_hold:      { label: 'On Hold',      emoji: '⏸️' },
  dropped:      { label: 'Dropped',      emoji: '🗑️' },
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

export default async function PublicListPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch the list — allow owner to see their own list even if private
  const { data: list } = await (supabase as any)
    .from('reading_lists')
    .select('*')
    .eq('id', id)
    .single()

  if (!list) notFound()

  const isOwner = user?.id === list.user_id

  // Block non-owners from private lists
  if (!list.is_public && !isOwner) notFound()

  // Resolve the correct dashboard path based on user type and pro status
  let myListsHref = '/reader/dashboard/lists'
  if (user && isOwner) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type, role, is_pro, pro_expires_at, is_patron, patron_expires_at')
      .eq('id', user.id)
      .single()

    if (profile) {
      const isPro = isProUser(profile as any)
      const isCreator = (profile as any).user_type === 'creator'

      if (isCreator) {
        myListsHref = isPro ? '/pro/creator/dashboard/works' : '/creator/dashboard/works'
      } else {
        myListsHref = isPro ? '/pro/reader/dashboard/lists' : '/reader/dashboard/lists'
      }
    }
  }

  // Fetch owner profile
  const { data: ownerData } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url')
    .eq('id', list.user_id)
    .single()

  const owner = ownerData as {
    username: string
    display_name: string | null
    avatar_url: string | null
  } | null

  // Fetch items with recommendation details
  const { data: itemsData } = await supabase
    .from('reading_list_items')
    .select('*, recommendations(id, title, cover_url, type, status, genres, upvotes)')
    .eq('list_id', id)
    .order('added_at', { ascending: false })

  const items = (itemsData ?? []) as any[]

  // Check if viewer has starred this list
  let isStarred = false
  if (user && !isOwner) {
    const { data: star } = await (supabase as any)
      .from('list_stars')
      .select('id')
      .eq('user_id', user.id)
      .eq('list_id', id)
      .maybeSingle()
    isStarred = !!star
  }

  const statusCounts = items.reduce((acc: Record<string, number>, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1
    return acc
  }, {})

  const ownerInitials = (owner?.display_name || owner?.username || '??')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

      {/* Back link */}
      <Link
        href={isOwner ? '/reader/dashboard/lists' : (owner ? `/profile/${owner.username}` : '/lists')}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        {isOwner ? 'Back to My Lists' : owner ? `Back to @${owner.username}'s profile` : 'Back to Lists'}
      </Link>

      {/* Pass everything to client for interactive owner controls + star */}
      <PublicListDetailClient
        list={list}
        owner={owner}
        items={items}
        statusCounts={statusCounts}
        ownerInitials={ownerInitials}
        isOwner={isOwner}
        isLoggedIn={!!user}
        initialStarred={isStarred}
        typeColors={TYPE_COLORS}
        statusMeta={STATUS_META}
        myListsHref={myListsHref}
      />
    </div>
  )
}
