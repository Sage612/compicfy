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

  // If the comic itself is adult/mature, we want similar adult content.
  // If it's a regular comic, we exclude adult content.
  const isAdultComic = contentRating === 'adult' || contentRating === 'mature'

  useEffect(() => {
    const fetchSimilar = async () => {
      try {
        const res = await fetch(
          `/api/recommendations/personalized?mode=similar&comic_id=${comicId}&limit=8&exclude_adult=${!isAdultComic}`
        )
        const data = await res.json()

        const filtered = (data.recommendations ?? []).filter((r: Recommendation) => {
          if (isAdultComic) {
            // Adult comic — only show adult/mature similar comics
            return r.content_rating === 'adult' || r.content_rating === 'mature'
          } else {
            // Regular comic — exclude adult/mature
            return r.content_rating !== 'adult' && r.content_rating !== 'mature'
          }
        })

        setComics(filtered)
      } catch {
        console.error('Failed to fetch similar comics')
      } finally {
        setLoading(false)
      }
    }
    fetchSimilar()
  }, [comicId, isAdultComic])

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