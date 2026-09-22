'use client'

import { useEffect, useState } from 'react'
import { ComicCard } from './ComicCard'
import { Loader2 } from 'lucide-react'
import type { Recommendation } from '@/types/app.types'

interface Props {
  comicId:       string
  contentRating: string | null
  showAdult?:    boolean
  /** 'grid' (default, unchanged) — existing grid layout.
   *  'scroll' — horizontal single-row scroll, each card fixed-width.
   *  Used by the Community tab's "Next Reads" section. */
  layout?:       'grid' | 'scroll'
  /** 'scroll' layout only — hides the built-in heading/divider, since
   *  the Community tab already renders its own "Next Reads" <h2>. */
  hideHeading?:  boolean
}

export function SimilarComics({
  comicId,
  contentRating,
  showAdult = false,
  layout = 'grid',
  hideHeading = false,
}: Props) {
  const [comics,  setComics]  = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSimilar = async () => {
      try {
        const params = new URLSearchParams({
          mode:            'similar',
          comic_id:        comicId,
          limit:           '8',
          content_ratings: showAdult
            ? 'all_ages,teen,mature,adult'
            : 'all_ages,teen',
        })
        const res  = await fetch(`/api/recommendations/personalized?${params}`)
        const data = await res.json()

        const recs     = (data.recommendations ?? []) as Recommendation[]
        const filtered = recs.filter(r => r.id !== comicId)
        setComics(filtered)
      } catch {
        console.error('Failed to fetch similar comics')
        setComics([])
      } finally {
        setLoading(false)
      }
    }
    fetchSimilar()
  }, [comicId, showAdult])

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!comics.length) return null

  if (layout === 'scroll') {
    return (
      <div className="space-y-4">
        {!hideHeading && (
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black">Similar Comics</h2>
            <div className="h-0.5 flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
          </div>
        )}
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4">
          {comics.map((rec) => (
            <div key={rec.id} className="w-32 shrink-0">
              <ComicCard recommendation={rec} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-black">Similar Comics</h2>
        <div className="h-0.5 flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {comics.map((rec) => (
          <ComicCard key={rec.id} recommendation={rec} />
        ))}
      </div>
    </div>
  )
}