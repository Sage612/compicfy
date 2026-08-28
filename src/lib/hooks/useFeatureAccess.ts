'use client'
import { usePro } from './usePro'
type Feature =
  | 'unlimited_recommendations'
  | 'unlimited_saves'
  | 'unlimited_lists'
  | 'advanced_filters'
  | 'priority_review'
  | 'ad_free'
  | 'premium_news'
  | 'export_lists'
  | 'custom_themes'
  | 'rec_analytics'
  | 'profile_views'
  | 'who_viewed_profile'
  | 'suggested_match_filters'
// Features mods get for free (no payment needed)
const MOD_FREE_FEATURES: Feature[] = [
  'unlimited_recommendations',
  'unlimited_saves',
  'unlimited_lists',
  'advanced_filters',
  'priority_review',
  'ad_free',
  'premium_news',
  'export_lists',
]
// Features mods must pay for
const MOD_PAID_FEATURES: Feature[] = [
  'custom_themes',
  'rec_analytics',
  'profile_views',
  'who_viewed_profile',
  'suggested_match_filters',
]
export function useFeatureAccess(feature: Feature): {
  hasAccess: boolean
  loading: boolean
  reason: 'admin' | 'mod_free' | 'mod_paid' | 'pro' | 'upgrade_required' | null
} {
  const { isPro, isAdmin, isMod, loading } = usePro()
  if (loading) return { hasAccess: false, loading: true, reason: null }
  // Admin has everything
  if (isAdmin) return { hasAccess: true, loading: false, reason: 'admin' }
  // Mod free features
  if (isMod && MOD_FREE_FEATURES.includes(feature)) {
    return { hasAccess: true, loading: false, reason: 'mod_free' }
  }
  // Mod paid features — needs Pro subscription
  if (isMod && MOD_PAID_FEATURES.includes(feature)) {
    if (isPro) return { hasAccess: true, loading: false, reason: 'mod_paid' }
    return { hasAccess: false, loading: false, reason: 'upgrade_required' }
  }
  // Regular Pro user
  if (isPro) return { hasAccess: true, loading: false, reason: 'pro' }
  return { hasAccess: false, loading: false, reason: 'upgrade_required' }
}