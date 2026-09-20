import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { Bookmark, Radar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Saved Comics | Pro' }

export default async function ProReaderSavedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: saves } = await supabase
    .from('saves')
    .select('recommendation_id, created_at, recommendations(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const comics = (saves ?? [])
    .map((s: any) => Array.isArray(s.recommendations) ? s.recommendations[0] : s.recommendations)
    .filter(Boolean)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Bookmark size={17} className="text-amber-500" />
            </div>
            <h1 className="text-xl font-black tracking-tight truncate">Saved Comics</h1>
          </div>
          <p className="text-xs text-muted-foreground pl-0.5">{comics.length} saved · unlimited on Pro</p>
        </div>
        <Link href="/browse" className="shrink-0">
          <Button size="sm" className="gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 border-0 text-white">
            <Radar size={13} />Browse
          </Button>
        </Link>
      </div>

      {!comics.length ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border space-y-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Bookmark size={24} className="text-primary" />
          </div>
          <div>
            <p className="font-black text-sm">Nothing saved yet</p>
            <p className="text-xs text-muted-foreground mt-1">Browse comics and hit save to build your collection</p>
          </div>
          <Link href="/browse">
            <Button size="sm" className="gap-1.5"><Radar size={13} />Browse Comics</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {comics.map((rec: any) => <ComicCard key={rec.id} recommendation={rec} />)}
        </div>
      )}
    </div>
  )
}