import Link from 'next/link'
import { BookOpen, TrendingUp, MessageSquare, PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500',
  manhwa:  'bg-blue-500/10 text-blue-500',
  manhua:  'bg-amber-500/10  text-amber-500',
  webtoon: 'bg-teal-500/10   text-teal-500',
  comic:   'bg-blue-500/10   text-blue-500',
}

interface TrendingItem {
  id: string
  title: string
  cover_url: string | null
  type: string
  upvotes: number
  review_count: number
}

interface Props {
  trending: TrendingItem[]
}

export function TrendingSidebar({ trending }: Props) {
  return (
    <div className="space-y-4">

      {/* Trending */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
          <TrendingUp size={14} className="text-primary" />
          <h3 className="text-xs font-black uppercase tracking-widest">Trending This Week</h3>
        </div>
        <div className="p-3 space-y-2">
          {trending.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nothing trending yet</p>
          ) : (
            trending.map((item, i) => {
              const typeColor = TYPE_COLORS[item.type] ?? 'bg-muted text-muted-foreground'
              return (
                <Link
                  key={item.id}
                  href={`/comic/${item.id}`}
                  className="group flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <span className="text-xs font-black text-muted-foreground/40 w-4 shrink-0">
                    {i + 1}
                  </span>
                  <div className="w-8 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                    {item.cover_url ? (
                      <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={10} className="text-muted-foreground opacity-40" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold line-clamp-1 group-hover:text-primary transition-colors">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize', typeColor)}>
                        {item.type}
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        ↑ {item.upvotes}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>

      {/* Posts — coming soon */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden opacity-60">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
          <PenLine size={14} className="text-muted-foreground" />
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Community Posts</h3>
          <span className="ml-auto text-[9px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            Coming Soon
          </span>
        </div>
        <div className="p-4 space-y-3">
          {/* Fake post teasers */}
          {['Just finished this — the ending 🔥', 'Anyone reading this?', 'Hidden gem alert 💎'].map((text, i) => (
            <div key={i} className="space-y-1.5 opacity-50">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-muted" />
                <div className="h-2 bg-muted rounded w-16" />
              </div>
              <p className="text-xs text-muted-foreground pl-7">{text}</p>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground/50 text-center pt-1">
            Share your thoughts with the community
          </p>
        </div>
      </div>

      {/* Comments — coming soon */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden opacity-60">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
          <MessageSquare size={14} className="text-muted-foreground" />
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Discussion Threads</h3>
          <span className="ml-auto text-[9px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            Coming Soon
          </span>
        </div>
        <div className="p-4 space-y-2">
          {['Is the anime worth it?', 'Best arc discussion', 'Chapter 150 thoughts'].map((text, i) => (
            <div key={i} className="flex items-center gap-2 opacity-50">
              <MessageSquare size={10} className="text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground truncate">{text}</p>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground/50 text-center pt-1">
            Join the conversation
          </p>
        </div>
      </div>

    </div>
  )
}