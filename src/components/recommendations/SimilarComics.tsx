'use client'

import { useEffect, useState } from 'react'
import { ComicCard } from './ComicCard'
import { Loader2, Sparkles } from 'lucide-react'
import { useInteraction } from '@/lib/hooks/useInteraction'
import { cn } from '@/lib/utils'

interface Props {
  comicId: string
  contentRating: string
}

export function SimilarComics({ comicId, contentRating }: Props) {
  const [comics, setComics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [explanation, setExplanation] = useState<string>('')
  const { track } = useInteraction()

  const isAdultComic = contentRating === 'adult' || contentRating === 'mature'

  useEffect(() => {
    const fetchSimilar = async () => {
      try {
        const res = await fetch(
          `/api/recommendations/personalized?mode=similar&comic_id=${comicId}&limit=8&adult=${isAdultComic}`,
          { cache: 'no-store' }
        )
        const data = await res.json()

        if (!res.ok) throw new Error(data.error)

        // Filter by content rating safety
        const filtered = (data.recommendations ?? []).filter((r: any) => {
          if (isAdultComic) {
            return r.content_rating === 'adult' || r.content_rating === 'mature'
          } else {
            return r.content_rating !== 'adult' && r.content_rating !== 'mature'
          }
        })

        setComics(filtered)
        setExplanation(data.explanation || '')

        // Track views for these recommendations
        filtered.forEach((comic: any, index: number) => {
          track(comic.id, 'view', { 
            source: 'similar_comics', 
            position: index,
            context_comic_id: comicId 
          } as any) // Type assertion added here to bypass the strict check
        })
      } catch (err) {
        console.error('Failed to fetch similar comics:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSimilar()
  }, [comicId, isAdultComic, track])

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-black">You Might Also Like</h2>
          <div className="h-0.5 flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
        </div>
        {explanation && (
          <span className={cn(
            "text-xs font-medium flex items-center gap-1",
            "text-primary"
          )}>
            <Sparkles size={12} />
            {explanation}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {comics.map((rec, index) => (
          <ComicCard 
            key={rec.id} 
            recommendation={rec}
            isPersonalized={rec.isPersonalized}
            isWildcard={rec.isWildcard}
            onView={() => track(rec.id, 'view_detail', { 
              source: 'similar_comics', 
              position: index,
              context_comic_id: comicId 
            } as any)} // Type assertion added here to bypass the strict check
          />
        ))}
      </div>
    </div>
  )
}