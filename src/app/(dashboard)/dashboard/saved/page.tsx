import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Bookmark } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils/format'


import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Saved Comics' }

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

const savedComics = saves.map((s) => ({
  savedAt: s.created_at,
  rec: s.recommendations,
}))

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bookmark size={22} />
            Saved Comics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {savedComics.length} comic{savedComics.length !== 1 ? 's' : ''} saved
          </p>
        </div>
        <Link href="/browse">
          <Button variant="outline" size="sm" className="gap-2">
            <BookOpen size={14} />
            Browse More
          </Button>
        </Link>
      </div>

      {savedComics.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Bookmark size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
          <h3 className="font-semibold mb-1">No saved comics yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Browse comics and click Save to add them here
          </p>
          <Link href="/browse">
            <Button className="gap-2">
              <BookOpen size={16} />
              Browse Comics
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {savedComics.map(({ savedAt, rec }) => (
            <Link
              key={rec.id}
              href={`/comic/${rec.id}`}
              className="flex gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors"
            >
              {/* Cover */}
              <div className="w-14 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                {rec.cover_url ? (
                  <img
                    src={rec.cover_url}
                    alt={rec.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen size={18} className="text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <h3 className="font-semibold text-sm truncate">{rec.title}</h3>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs capitalize">
                    {rec.type}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize">
                    {rec.status}
                  </Badge>
                </div>
                {rec.genres?.slice(0, 2).map((g: string) => (
                  <Badge key={g} variant="secondary" className="text-xs mr-1">
                    {g}
                  </Badge>
                ))}
                <p className="text-xs text-muted-foreground">
                  Saved {formatDate(savedAt)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}