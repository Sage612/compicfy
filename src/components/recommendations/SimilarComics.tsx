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
    const fetch_ = async () => {
      try {
        const res = await fetch(
          `/api/recommendations/personalized?mode=similar&comic_id=${comicId}&limit=8`
        )
        const data = await res.json()
        setComics(data.recommendations ?? [])
      } catch {
        console.error('Failed to fetch similar comics')
      } finally {
        setLoading(false)
      }
    }
    fetch_()
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
    <div className="space-y-3">
      <h2 className="text-base font-semibold">Similar Comics</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {comics.map((rec) => (
          <ComicCard key={rec.id} recommendation={rec} />
        ))}
      </div>
    </div>
  )
}