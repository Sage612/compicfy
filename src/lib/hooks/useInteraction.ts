'use client'

import { useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type InteractionType = 
  | 'view'
  | 'view_detail'
  | 'vote_up'
  | 'vote_down'
  | 'save'
  | 'unsave'
  | 'review'
  | 'share'
  | 'dismiss'
  | 'time_spent_30s'
  | 'time_spent_2m'
  | 'time_spent_5m'

interface InteractionContext {
  source?: string
  position?: number
  filter_active?: string
  search_query?: string
}

export function useInteraction() {
  const supabase = createClient()
  const trackedViews = useRef<Set<string>>(new Set())

  const track = useCallback(async (
    recommendationId: string,
    action: InteractionType,
    context?: InteractionContext
  ) => {
    try {
      // Debounce views
      if (action === 'view' && trackedViews.current.has(recommendationId)) {
        return
      }
      if (action === 'view') {
        trackedViews.current.add(recommendationId)
      }

      await (supabase as any).from('user_interactions').insert({
        recommendation_id: recommendationId,
        action,
        context: context ?? {},
      })

      // Trigger taste profile update in background
      if (['vote_up', 'vote_down', 'save', 'unsave'].includes(action)) {
        await (supabase as any).rpc('update_taste_profile', {
          p_user_id: (await supabase.auth.getUser()).data.user?.id,
          p_recommendation_id: recommendationId,
          p_action: action
        })
      }
    } catch (err) {
      // Silent fail - don't break UX for analytics
      console.error('Interaction track failed:', err)
    }
  }, [supabase])

  // Time tracking helpers
  const trackTimeSpent = useCallback((recommendationId: string, seconds: number) => {
    if (seconds >= 300) return track(recommendationId, 'time_spent_5m')
    if (seconds >= 120) return track(recommendationId, 'time_spent_2m')
    if (seconds >= 30) return track(recommendationId, 'time_spent_30s')
  }, [track])

  return { track, trackTimeSpent }
}