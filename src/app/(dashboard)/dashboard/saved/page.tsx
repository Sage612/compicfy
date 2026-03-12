import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Bookmark, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils/format'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Saved Comics' }

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

  const { data: savesData } = await supabase
    .from('saves')
    .select('*, recommendations(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const saves = (savesData ?? []) as { created_at: string; recommendations: any }[]
  const savedComics = saves.map((s) => ({ savedAt: s.created_at, rec: s.recommendations }))

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Bookmark size={16} className="text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">Saved Comics</h1>
          </div>
          <p className="text-muted-foreground text-sm pl-0.5">
            {savedComics.length} comic{savedComics.length !== 1 ? 's' : ''} saved
          </p>
        </div>
        <Link href="/browse">
          <Button variant="outline" size="sm" className="gap-2 shrink-0">
            <BookOpen size={14} />
            Browse More
          </Button>
        </Link>
      </div>

      {/* Empty state */}
      {savedComics.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Bookmark size={24} className="text-muted-foreground opacity-40" />
          </div>
          <h3 className="font-black text-lg mb-1">No saved comics yet</h3>
          <p className="text-sm text-muted-foreground mb-5">Browse comics and click Save to add them here</p>
          <Link href="/browse">
            <Button className="gap-2"><BookOpen size={15} />Browse Comics</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {savedComics.map(({ savedAt, rec }) => (
            <Link
              key={rec.id}
              href={`/comic/${rec.id}`}
              className="group flex gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200"
            >
              {/* Cover */}
              <div className="w-14 h-20 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm">
                {rec.cover_url ? (
                  <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen size={16} className="text-muted-foreground opacity-40" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-black text-sm truncate group-hover:text-primary transition-colors">{rec.title}</h3>
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
                {rec.genres?.slice(0, 2).map((g: string) => (
                  <span key={g} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted border border-border text-muted-foreground mr-1">
                    {g}
                  </span>
                ))}
                <p className="text-[10px] text-muted-foreground">Saved {formatDate(savedAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}