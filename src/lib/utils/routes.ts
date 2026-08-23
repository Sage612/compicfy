export type UserType = 'reader' | 'creator'

export function getDashboardRoutes(userType: UserType, isPro: boolean) {
  if (userType === 'creator') {
    const base = isPro ? '/pro/creator/dashboard' : '/creator/dashboard'
    return {
      dashboard:     base,
      works:         `${base}/works`,
      newWork:       `${base}/works/new`,
      audience:      `${base}/audience`,
      links:         `${base}/links`,
      notifications: `${base}/notifications`,
      settings:      `${base}/settings`,
      billing:       `${base}/billing`,
      analytics:     isPro ? `${base}/analytics` : '/pricing?reason=pro_required',
      newRec:        `${base}/works/new`,
    }
  }

  const base = isPro ? '/pro/reader/dashboard' : '/reader/dashboard'
  return {
    dashboard:       base,
    saved:           `${base}/saved`,
    lists:           `${base}/lists`,
    recommendations: `${base}/recommendations`,
    newRec:          `${base}/recommendations/new`,
    notifications:   `${base}/notifications`,
    reviews:         `${base}/reviews`,
    settings:        `${base}/settings`,
    billing:         `${base}/billing`,
    analytics:       isPro ? `${base}/analytics` : '/pricing?reason=pro_required',
    export:          isPro ? `${base}/export`    : '/pricing?reason=pro_required',
    leaderboard:     isPro ? `${base}/leaderboard` : '/pricing?reason=pro_required',
  }
}

export function getAdminRoutes() {
  return {
    dashboard:     '/admin',
    notifications: '/admin/notifications',
    reports:       '/admin/reports',
  }
}

export function getProfileRoute(username: string, userType: UserType) {
  return userType === 'creator' ? `/creator/${username}` : `/profile/${username}`
}

// Legacy redirect map — old routes → new routes (used in middleware)
export const ROUTE_REDIRECTS: Record<string, string> = {
  '/dashboard':                              '/reader/dashboard',
  '/dashboard/saved':                        '/reader/dashboard/saved',
  '/dashboard/lists':                        '/reader/dashboard/lists',
  '/dashboard/recommendations':              '/reader/dashboard/recommendations',
  '/dashboard/recommendations/new':          '/reader/dashboard/recommendations/new',
  '/dashboard/notifications':                '/reader/dashboard/notifications',
  '/dashboard/reviews':                      '/reader/dashboard/reviews',
  '/dashboard/settings':                     '/reader/dashboard/settings',
  '/dashboard/billing':                      '/reader/dashboard/billing',
  '/pro/dashboard':                          '/pro/reader/dashboard',
  '/pro/recommendations':                    '/pro/reader/dashboard/recommendations',
  '/pro/recommendations/new':                '/pro/reader/dashboard/recommendations/new',
  '/pro/lists':                              '/pro/reader/dashboard/lists',
  '/pro/saved':                              '/pro/reader/dashboard/saved',
  '/pro/notifications':                      '/pro/reader/dashboard/notifications',
  '/pro/reviews':                            '/pro/reader/dashboard/reviews',
  '/pro/settings':                           '/pro/reader/dashboard/settings',
  '/pro/billing':                            '/pro/reader/dashboard/billing',
  '/pro/analytics':                          '/pro/reader/dashboard/analytics',
  '/pro/export':                             '/pro/reader/dashboard/export',
  '/pro/leaderboard':                        '/pro/reader/dashboard/leaderboard',
  '/pro/profile-views':                      '/pro/reader/dashboard',
}