import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen, Bookmark, ArrowRight,
  Sparkles, ThumbsUp, Star, Crown, Radar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils/format'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Saved Comics' }

const FREE_SAVE_LIMIT = 100

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-violet-500/10 text-violet-500 border-violet-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
}

const STATUS_COLORS: Record<string, string> = {
  ongoing:   'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  completed: 'bg-blue-500/10   text-blue-600    border-blue-500/20',
  hiatus:    'bg-amber-500/10  text-amber-600   border-amber-500/20',
  cancelled: 'bg-red-500/10    text-red-600     border-red-500/20',
}

export default async function SavedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('is_pro, pro_expires_at, role')
    .eq('id', user.id)
    .single()

  const isPro = profile
    ? profile.role === 'admin' ||
      ['admin', 'moderator'].includes(profile.role) ||
      (profile.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
    : false

  const { data: savesData } = await supabase
    .from('saves')
    .select('*, recommendations(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const saves = (savesData ?? []) as any[]
  const savedComics = saves.map((s) => ({ savedAt: s.created_at, rec: s.recommendations }))

  const saveCount   = savedComics.length
  const atLimit     = !isPro && saveCount >= FREE_SAVE_LIMIT
  const nearLimit   = !isPro && saveCount >= FREE_SAVE_LIMIT - 10
  const usagePct    = Math.min(100, Math.round((saveCount / FREE_SAVE_LIMIT) * 100))

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Bookmark size={16} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-tight leading-tight truncate">Saved Comics</h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              {saveCount} saved
              {!isPro && (
                <span className="text-muted-foreground/60 ml-1">
                  · {Math.max(0, FREE_SAVE_LIMIT - saveCount)} slots left
                </span>
              )}
            </p>
          </div>
        </div>
        <Link href="/browse" className="shrink-0">
          <Button variant="outline" size="sm" className="gap-2 hover:border-primary/40 hover:text-primary transition-colors">
            <Radar size={14} />
            Browse More
          </Button>
        </Link>
      </div>

      {/* Free user usage bar */}
      {!isPro && saveCount > 0 && (
        <div className={`rounded-2xl border p-4 space-y-3 ${
          atLimit
            ? 'border-amber-500/30 bg-amber-500/5'
            : nearLimit
            ? 'border-amber-500/20 bg-amber-500/5'
            : 'border-border bg-card'
        }`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bookmark size={13} className={atLimit || nearLimit ? 'text-amber-500' : 'text-muted-foreground'} />
              <span className="text-xs font-semibold">
                {saveCount} / {FREE_SAVE_LIMIT} saves used
              </span>
            </div>
            {(atLimit || nearLimit) && (
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-500 hover:underline shrink-0"
              >
                <Crown size={10} className="fill-amber-500" />
                Upgrade for unlimited
              </Link>
            )}
          </div>

          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usagePct >= 100
                  ? 'bg-red-500'
                  : usagePct >= 80
                  ? 'bg-amber-500'
                  : 'bg-primary'
              }`}
              style={{ width: `${usagePct}%` }}
            />
          </div>

          {atLimit && (
            <p className="text-xs text-amber-600 font-medium">
              You've reached your save limit. Upgrade to Pro for unlimited saves.
            </p>
          )}
        </div>
      )}

      {/* Empty state */}
      {savedComics.length === 0 ? (
        <div className="relative overflow-hidden text-center py-20 rounded-2xl border border-dashed border-border bg-card">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

          <div className="relative w-28 h-28 mx-auto mb-6">
            <div className="absolute top-0 left-2 w-16 h-22 rounded-xl border-2 border-border bg-muted/60 rotate-[-8deg]" />
            <div className="absolute top-2 left-5 w-16 h-22 rounded-xl border-2 border-border bg-muted/80 rotate-[-3deg]" />
            <div className="absolute top-4 left-8 w-16 h-22 rounded-xl border-2 border-primary/30 bg-card flex items-center justify-center shadow-lg">
              <Bookmark size={20} className="text-primary/50" />
            </div>
          </div>

          <h3 className="font-black text-xl mb-2">Your saved list is empty</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto leading-relaxed">
            Browse comics and hit the bookmark icon to save them here for later.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/browse">
              <Button className="gap-2">
                <BookOpen size={14} />
                Browse Comics
              </Button>
            </Link>
            <Link href="/browse?sort=recent">
              <Button variant="outline" className="gap-2 hover:border-primary/40 hover:text-primary">
                <Sparkles size={14} />
                Recent Recs
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {savedComics.map(({ savedAt, rec }) => (
            <Link
              key={rec.id}
              href={`/comic/${rec.id}`}
              className="group flex gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200"
            >
              <div className="relative w-14 h-20 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm">
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
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow-sm">
                  <Bookmark size={8} className="text-primary-foreground fill-primary-foreground" />
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-black text-sm truncate group-hover:text-primary transition-colors leading-tight">
                    {rec.title}
                  </h3>
                  <ArrowRight size={13} className="text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${TYPE_COLORS[rec.type] ?? 'bg-muted text-muted-foreground border-border'}`}>
                    {rec.type}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${STATUS_COLORS[rec.status] ?? 'bg-muted text-muted-foreground border-border'}`}>
                    {rec.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {rec.genres?.slice(0, 2).map((g: string) => (
                    <span key={g} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted border border-border text-muted-foreground">
                      {g}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ThumbsUp size={9} className="text-emerald-500" />
                    {rec.upvotes ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star size={9} className="text-amber-500" />
                    {rec.review_count ?? 0}
                  </span>
                  <span className="ml-auto">Saved {formatDate(savedAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Bottom upgrade CTA */}
      {!isPro && saveCount > 0 && saveCount < FREE_SAVE_LIMIT && (
        <div className="flex items-center justify-center pt-2">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-amber-500 transition-colors"
          >
            <Sparkles size={11} />
            Upgrade to Pro for unlimited saves
          </Link>
        </div>
      )}

    </div>
  )
}