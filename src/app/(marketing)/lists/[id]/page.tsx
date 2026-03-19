import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  BookOpen, Globe, ArrowLeft, BookMarked, ThumbsUp,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-violet-500/10 text-violet-500 border-violet-500/20',
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
    .eq('is_public', true)
    .single()
  return { title: data?.name ?? 'Reading List' }
}

export default async function PublicListPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch the list — must be public
  const { data: list } = await (supabase as any)
    .from('reading_lists')
    .select('*')
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (!list) notFound()

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

  // Group by status for stats
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
      {owner && (
        <Link
          href={`/profile/${owner.username}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Back to @{owner.username}'s profile
        </Link>
      )}

      {/* List header card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="h-16 bg-gradient-to-br from-teal-500/20 via-cyan-500/10 to-transparent" />
        <div className="px-6 pb-6 -mt-6 space-y-4">
          <div className="flex items-end gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20 ring-2 ring-card shrink-0">
              <BookMarked size={20} className="text-white" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight">{list.name}</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <Globe size={9} />
                Public
              </span>
            </div>
            {list.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{list.description}</p>
            )}
          </div>

          {/* Owner + stats */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            {owner && (
              <Link
                href={`/profile/${owner.username}`}
                className="flex items-center gap-2 group"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={owner.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px] font-black bg-gradient-to-br from-primary to-violet-500 text-white">
                    {ownerInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  by <strong className="text-foreground">@{owner.username}</strong>
                </span>
              </Link>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                <strong className="text-foreground font-black">{items.length}</strong>{' '}
                comic{items.length !== 1 ? 's' : ''}
              </span>
              <span>Updated {formatDate(list.updated_at ?? list.created_at)}</span>
            </div>
          </div>

          {/* Status breakdown */}
          {Object.keys(statusCounts).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(statusCounts).map(([status, count]) => {
                const meta = STATUS_META[status]
                if (!meta) return null
                return (
                  <span
                    key={status}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted border border-border text-muted-foreground"
                  >
                    {meta.emoji} {meta.label} · {count as number}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <BookOpen size={22} className="text-muted-foreground opacity-40" />
          </div>
          <p className="text-sm text-muted-foreground">This list has no comics yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => {
            const rec = item.recommendations
            if (!rec) return null
            const typeStyle = TYPE_COLORS[rec.type] ?? 'bg-muted text-muted-foreground border-border'
            const statusMeta = STATUS_META[item.status]

            return (
              <Link
                key={item.id}
                href={`/comic/${rec.id}`}
                className="group flex gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200"
              >
                {/* Cover */}
                <div className="w-14 h-20 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm">
                  {rec.cover_url ? (
                    <img
                      src={rec.cover_url}
                      alt={rec.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={16} className="text-muted-foreground opacity-40" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-2 py-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-black text-sm line-clamp-1 group-hover:text-primary transition-colors">
                      {rec.title}
                    </p>
                    {rec.upvotes > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                        <ThumbsUp size={10} />
                        {rec.upvotes}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${typeStyle}`}>
                      {rec.type}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-border bg-muted text-muted-foreground capitalize">
                      {rec.status}
                    </span>
                    {statusMeta && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted border border-border text-muted-foreground">
                        {statusMeta.emoji} {statusMeta.label}
                      </span>
                    )}
                  </div>

                  {rec.genres?.slice(0, 2).map((g: string) => (
                    <span
                      key={g}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted border border-border text-muted-foreground mr-1"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}