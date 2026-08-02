'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  hasUnlimitedPerks,
  isAdmin as isAdminCheck,
  isModerator as isModeratorCheck,
  isProUser,
  type RoleProfile,
} from '@/lib/access'

interface ProStatus {
  isPro: boolean
  isAdmin: boolean
  isMod: boolean
  hasProAccess: boolean // unlimited perks (admin, mod, or paid pro), not Pro dashboard access
  role: string
  proExpiresAt: string | null
  loading: boolean
}

interface ProfileRow {
  role: string | null
  is_pro: boolean | null
  pro_expires_at: string | null
}

export function usePro(): ProStatus {
  const [status, setStatus] = useState<ProStatus>({
    isPro: false,
    isAdmin: false,
    isMod: false,
    hasProAccess: false,
    role: 'user',
    proExpiresAt: null,
    loading: true,
  })

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let isMounted = true

    const getProStatus = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          if (isMounted) {
            setStatus(prev => ({ ...prev, loading: false }))
          }
          return
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('is_pro, pro_expires_at, is_patron, patron_expires_at, role')
          .eq('id', user.id)
          .single<ProfileRow>()

        if (profileError || !profileData) {
          if (isMounted) {
            setStatus(prev => ({ ...prev, loading: false }))
          }
          return
        }

        const profile: RoleProfile = {
          role: profileData.role ?? 'user',
          is_pro: profileData.is_pro ?? false,
          pro_expires_at: profileData.pro_expires_at ?? null,
        }

        const isAdmin = isAdminCheck(profile)
        const isMod = isModeratorCheck(profile)
        const isPro = isProUser(profile)
        const hasProAccess = hasUnlimitedPerks(profile)

        if (isMounted) {
          setStatus({
            isPro,
            isAdmin,
            isMod,
            hasProAccess,
            role: profile.role,
            proExpiresAt: profile.pro_expires_at,
            loading: false,
          })
        }
      } catch {
        if (isMounted) {
          setStatus(prev => ({ ...prev, loading: false }))
        }
      }
    }

    void getProStatus()

    return () => {
      isMounted = false
    }
  }, [supabase])

  return status
}