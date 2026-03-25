'use client'

import { useEffect, useState } from 'react'
import { ComicCard } from './ComicCard'
import { Loader2 } from 'lucide-react'
import type { Recommendation } from '@/types/database.types'

interface Props {
  comicId: string
  contentRating: string
}

export function SimilarComics({ comicId, contentRating }: Props) {
  const [comics, setComics] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSimilar = async () => {
      try {
        // Always exclude adult/mature from similar comics — adult content
        // belongs exclusively on /browse/adult regardless of user toggle.
        // We pass exclude_adult=true so the API never returns 18+ here.
        const res = await fetch(
          `/api/recommendations/personalized?mode=similar&comic_id=${comicId}&limit=8&exclude_adult=true`
        )
        const data = await res.json()

        // Double-filter client-side as a safety net in case the API
        // doesn't yet support exclude_adult param
        const safe = (data.recommendations ?? []).filter(
          (r: Recommendation) => r.content_rating !== 'adult' && r.content_rating !== 'mature'
        )
        setComics(safe)
      } catch {
        console.error('Failed to fetch similar comics')
      } finally {
        setLoading(false)
      }
    }
    fetchSimilar()
  }, [comicId])

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