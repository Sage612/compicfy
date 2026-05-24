import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { Bookmark, Radar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Recommendation } from '@/types/database.types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Saved Comics' }

export default async function ProReaderSavedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: saves } = await supabase
    .from('saves')
    .select('recommendation_id, created_at, recommendations(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const comics = (saves ?? []).map((s: any) => Array.isArray(s.recommendations) ? s.recommendations[0] : s.recommendations).filter(Boolean) as Recommendation[]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Saved Comics</h1>
          <p className="text-sm text-muted-foreground mt-1">{comics.length} saved · unlimited on Pro</p>
        </div>
        <Link href="/browse"><Button variant="outline" size="sm" className="gap-1.5"><Radar size={13} />Browse More</Button></Link>
      </div>
      {!comics.length ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center"><Bookmark size={24} className="text-primary" /></div>
          <p className="font-black text-sm">Nothing saved yet</p>
          <Link href="/browse"><Button size="sm" className="gap-1.5"><Radar size={13} />Browse Comics</Button></Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {comics.map(rec => <ComicCard key={rec.id} recommendation={rec} />)}
        </div>
      )}
    </div>
  )
}
