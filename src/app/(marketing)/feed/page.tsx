import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BookOpen, Rss, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { timeAgo } from '@/lib/utils/format'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Following Feed | Compicfy' }

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-violet-500/10 text-violet-500 border-violet-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
}

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check following count separately — reliable
  const { count: followingCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', user.id)

  // Use RPC function — bypasses RLS join issues entirely
  const { data: feedData, error } = await (supabase as any)
    .rpc('get_following_feed', {
      p_user_id: user.id,
      p_limit: 30,
    })

  if (error) console.error('Feed error:', error)

  const items = (feedData ?? []) as any[]
  const isFollowingNobody = (followingCount ?? 0) === 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-lg shadow-primary/20">
          <Rss size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Following Feed</h1>
          <p className="text-muted-foreground text-sm">
            Latest recommendations from people you follow
          </p>
        </div>
      </div>

      {/* Not following anyone */}
      {isFollowingNobody && (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <UserPlus size={22} className="text-muted-foreground opacity-40" />
          </div>
          <div>
            <h3 className="font-black text-lg">You're not following anyone yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
              Follow users whose taste you trust to see their picks here
            </p>
          </div>
          <Link href="/browse">
            <Button className="gap-2 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0">
              <BookOpen size={14} />
              Discover Comics
            </Button>
          </Link>
        </div>
      )}

      {/* Following but no items */}
      {!isFollowingNobody && items.length === 0 && (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <Rss size={22} className="text-muted-foreground opacity-40" />
          </div>
          <div>
            <h3 className="font-black text-lg">Nothing here yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              The people you follow haven't shared any approved recommendations yet
            </p>
          </div>
          <Link href="/browse">
            <Button variant="outline" className="gap-2">
              <BookOpen size={14} />
              Browse All Comics
            </Button>
          </Link>
        </div>
      )}

      {/* Feed items */}
      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((rec: any) => {
            const typeStyle = TYPE_COLORS[rec.type] ?? 'bg-muted text-muted-foreground border-border'
            const initials = (rec.display_name || rec.username || '?')
              .slice(0, 2).toUpperCase()

            return (
              <div
                key={rec.id}
                className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors"
              >
                {/* Who posted */}
                <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-border/50">
                  <Link href={`/profile/${rec.username}`}>
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={rec.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px] font-black bg-gradient-to-br from-primary to-violet-500 text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/profile/${rec.username}`}
                      className="text-xs font-bold hover:text-primary transition-colors"
                    >
                      @{rec.username}
                    </Link>
                    <span className="text-xs text-muted-foreground ml-1.5">
                      recommended · {timeAgo(rec.created_at)}
                    </span>
                  </div>
                </div>

                {/* Comic */}
                <Link href={`/comic/${rec.id}`} className="group flex gap-4 p-4">
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
                  <div className="flex-1 min-w-0 space-y-2 py-0.5">
                    <p className="font-black text-sm line-clamp-1 group-hover:text-primary transition-colors">
                      {rec.title}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${typeStyle}`}>
                        {rec.type}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-border bg-muted text-muted-foreground capitalize">
                        {rec.status}
                      </span>
                    </div>
                    {rec.genres?.slice(0, 3).map((g: string) => (
                      <span key={g} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-muted border border-border text-muted-foreground mr-1">
                        {g}
                      </span>
                    ))}
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {rec.description}
                    </p>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}