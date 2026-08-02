export interface RoleProfile {
  role: string
  is_pro: boolean | null
  pro_expires_at: string | null
  is_patron?: boolean | null
  patron_expires_at?: string | null
}

export function isAdmin(profile: Pick<RoleProfile, 'role'>): boolean {
  return profile.role === 'admin'
}

export function isModerator(profile: Pick<RoleProfile, 'role'>): boolean {
  return profile.role === 'moderator'
}

// Patron-specific check — used only where Patron needs to be distinguished
// from Pro (e.g. badges, Patron-only feature gates). Patron does NOT require
// is_pro to also be true in the DB — Patron is additive/superset by design,
// so this checks the patron fields independently.
export function isPatronUser(profile: RoleProfile): boolean {
  return (
    isAdmin(profile) ||
    !!(
      profile.is_patron &&
      (!profile.patron_expires_at || new Date(profile.patron_expires_at) > new Date())
    )
  )
}

// Patron implies Pro — every existing Pro check across the app (60+ call
// sites) continues to work unmodified for Patron users, because Patron
// status alone now satisfies isProUser().
export function isProUser(profile: RoleProfile): boolean {
  return (
    isAdmin(profile) ||
    isPatronUser(profile) ||
    !!(
      profile.is_pro &&
      (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date())
    )
  )
}

export function hasUnlimitedPerks(profile: RoleProfile): boolean {
  return isModerator(profile) || isProUser(profile)
}

export function canAccessProDashboard(profile: RoleProfile): boolean {
  return isProUser(profile)
}

export function canAccessAdminDashboard(profile: Pick<RoleProfile, 'role'>): boolean {
  return isAdmin(profile) || isModerator(profile)
}

export function shouldHideProUpsell(profile: RoleProfile): boolean {
  return isProUser(profile)
}

// Patron-only feature gate — for the handful of features that are Patron-
// exclusive (not shared with Pro), e.g. full shelf reorder, unlimited
// nested folders, audience-overlap analytics.
export function canAccessPatronFeature(profile: RoleProfile): boolean {
  return isPatronUser(profile)
}