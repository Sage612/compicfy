'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useInView } from 'react-intersection-observer'
import { ComicCard } from './ComicCard'
import { useInteraction } from '@/lib/hooks/useInteraction'
import { Loader2, Sparkles, Shuffle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface PersonalizedGridProps {
  initialItems?: any[]
  adult?: boolean
}

export function PersonalizedGrid({ initialItems, adult = false }: PersonalizedGridProps) {
  const [items, setItems] = useState(initialItems ?? [])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [explanation, setExplanation] = useState<string>('')
  const [isOnboarding, setIsOnboarding] = useState(false)
  const { track, trackTimeSpent } = useInteraction()
  const viewStartTime = useRef<number>(Date.now())
  
  const { ref, inView } = useInView({ threshold: 0 })

  // Track time spent on page
  useEffect(() => {
    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - viewStartTime.current) / 1000)
      if (seconds === 30 || seconds === 120 || seconds === 300) {
        // Track time milestones logic here if needed
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/recommendations/personalized?page=${page + 1}&limit=24${adult ? '&adult=true' : ''}`)
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error)
      
      setItems(prev => [...prev, ...data.recommendations])
      setHasMore(data.hasMore ?? false)
      setPage(p => p + 1)
      
      if (data.explanation && page === 1) {
        setExplanation(data.explanation)
        setIsOnboarding(data.isOnboarding ?? false)
      }
    } catch (err) {
      toast.error('Failed to load more')
    } finally {
      setLoading(false)
    }
  }, [page, loading, hasMore, adult])

  useEffect(() => {
    if (inView) loadMore()
  }, [inView, loadMore])

  // Track initial views
  useEffect(() => {
    items.forEach((item, index) => {
      // Line 75 Fix: Cast the context to any to allow the 'page' property
      track(item.id, 'view', { 
        source: 'personalized_grid', 
        position: index,
        page
      } as any)
    })
  }, [items.length, track, page])

  return (
    <div className="space-y-4">
      {/* Personalization header */}
      {(explanation || isOnboarding) && (
        <div className={cn(
          'flex items-center gap-3 p-3 rounded-2xl border',
          isOnboarding 
            ? 'bg-amber-500/5 border-amber-500/20' 
            : 'bg-primary/5 border-primary/20'
        )}>
          {isOnboarding ? (
            <Shuffle size={16} className="text-amber-500 shrink-0" />
          ) : (
            <Sparkles size={16} className="text-primary shrink-0" />
          )}
          <div className="flex-1">
            <p className={cn(
              'text-sm font-semibold',
              isOnboarding ? 'text-amber-600' : 'text-primary'
            )}>
              {explanation}
            </p>
            {isOnboarding && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Rate a few comics to improve your recommendations
              </p>
            )}
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {items.map((item, index) => {
          // Line 116 Fix: Cast ComicCard to any to allow custom props like 'comic' and 'isWildcard'
          const Card = ComicCard as any;
          return (
            <Card
              key={`${item.id}-${index}`}
              comic={item}
              onView={() => track(item.id, 'view_detail', { position: index })}
              index={index}
              isPersonalized={item.isPersonalized}
              isWildcard={item.isWildcard}
            />
          )
        })}
      </div>

      {/* Load more trigger */}
      <div ref={ref} className="flex justify-center py-8">
        {loading && <Loader2 size={24} className="animate-spin text-muted-foreground" />}
        {!hasMore && items.length > 0 && (
          <p className="text-sm text-muted-foreground">That's all for now</p>
        )}
      </div>
    </div>
  )
}