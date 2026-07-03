export interface RoleProfile {
  role: string
  is_pro: boolean | null
  pro_expires_at: string | null
}

export function isAdmin(profile: Pick<RoleProfile, 'role'>): boolean {
  return profile.role === 'admin'
}

export function isModerator(profile: Pick<RoleProfile, 'role'>): boolean {
  return profile.role === 'moderator'
}

export function isProUser(profile: RoleProfile): boolean {
  return (
    isAdmin(profile) ||
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