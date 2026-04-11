'use client'

import { useEffect, useState } from 'react'
import { ComicCard } from './ComicCard'
import { Loader2 } from 'lucide-react'
import type { Recommendation } from '@/types/database.types'

interface Props {
  comicId:       string
  contentRating: string
  // true  → this comic is adult/mature, show only adult/mature similar
  // false → safe browse context, never show adult/mature
  showAdult?:    boolean
}

export function SimilarComics({ comicId, contentRating, showAdult = false }: Props) {
  const [comics,  setComics]  = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSimilar = async () => {
      try {
        const params = new URLSearchParams({
          mode:          'similar',
          comic_id:      comicId,
          limit:         '8',
          exclude_adult: showAdult ? 'false' : 'true',
        })
        const res  = await fetch(`/api/recommendations/personalized?${params}`)
        const data = await res.json()

        const recs = (data.recommendations ?? []) as Recommendation[]

        // Client-side safety net — always match the context
        const filtered = showAdult
          // Adult context: only show adult/mature
          ? recs.filter(r => r.content_rating === 'adult' || r.content_rating === 'mature')
          // Safe context: never show adult/mature
          : recs.filter(r => r.content_rating !== 'adult' && r.content_rating !== 'mature')

        setComics(filtered)
      } catch {
        console.error('Failed to fetch similar comics')
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