const CACHE_KEY = 'ComPicfy_profile_cache'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export interface CachedProfile {
  avatar_url:    string | null
  display_name:  string | null
  username:      string
  role:          string
  user_type:     string
  is_pro:        boolean | null
  pro_expires_at: string | null
}

export function getCachedProfile(): CachedProfile | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw) as { data: CachedProfile; ts: number }
    if (Date.now() - ts > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    return data
  } catch {
    return null
  }
}

export function setCachedProfile(data: CachedProfile): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch {}
}

export function clearCachedProfile(): void {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {}
}

// Derives isPro from a profile object (cached or fresh)
export function deriveIsPro(profile: Pick<CachedProfile, 'role' | 'is_pro' | 'pro_expires_at'>): boolean {
  return (
    profile.role === 'admin' ||
    profile.role === 'moderator' ||
    !!(profile.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
  )
}