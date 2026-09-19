import Link from 'next/link'
import { UserPlus, Users, Radar } from 'lucide-react'
import { timeAgo } from '@/lib/utils/format'

type FeedItem = {
  id:         string
  title:      string
  cover_url:  string | null
  type:       string | null
  created_at: string
  profiles:   { username: string | null } | null
}

interface Props {
  items:              FeedItem[]
  isFollowingNobody:  boolean
  feedHref:           string
  discoverHref:       string
  browseHref:         string
}

function proxyCover(url: string | null) {
  if (!url) return ''
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

export function CircleSection({ items, isFollowingNobody, feedHref, discoverHref, browseHref }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60">Circle</p>
        {!isFollowingNobody && (
          <Link href={feedHref} className="text-[11px] uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors">
            Feed
          </Link>
        )}
      </div>
      <h2 className="font-dashboard-serif text-xl mb-3">
        {isFollowingNobody ? 'Nobody here yet' : "What they're reading"}
      </h2>

      {isFollowingNobody ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Follow readers you trust and their picks will show up here.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Link href={discoverHref} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-border text-xs font-medium hover:border-foreground/30 transition-colors">
              <Users size={12} />Discover readers
            </Link>
            <Link href={browseHref} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-border text-xs font-medium hover:border-foreground/30 transition-colors">
              <Radar size={12} />Browse
            </Link>
          </div>
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-1">
          {items.map(item => (
            <Link
              key={item.id}
              href={`/comic/${item.id}`}
              className="flex items-center gap-3 py-2.5 hover:opacity-70 transition-opacity"
            >
              <div className="w-9 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                {item.cover_url && <img src={proxyCover(item.cover_url)} alt={item.title} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">
                  <span className="text-muted-foreground">@{item.profiles?.username ?? 'someone'}</span> recommended <span className="font-medium">{item.title}</span>
                </p>
                <p className="text-xs text-muted-foreground/60">{timeAgo(item.created_at)}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
          <UserPlus size={14} className="text-muted-foreground/40 shrink-0" />
          <span>Nothing from your circle yet.</span>
          <Link href={discoverHref} className="ml-auto text-xs font-medium hover:underline">Discover more</Link>
        </div>
      )}
    </div>
  )
}