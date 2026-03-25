'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ProStatus {
  isPro: boolean
  isAdmin: boolean
  isMod: boolean
  hasProAccess: boolean // true for admin, mod, or paid pro
  role: string
  proExpiresAt: string | null
  loading: boolean
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

  const supabase = createClient()

  useEffect(() => {
    const getProStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setStatus(s => ({ ...s, loading: false }))
        return
      }

      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('is_pro, pro_expires_at, role')
        .eq('id', user.id)
        .single()

      if (!profile) {
        setStatus(s => ({ ...s, loading: false }))
        return
      }

      const isAdmin = profile.role === 'admin'
      const isMod = profile.role === 'moderator'
      const isPro = profile.is_pro &&
        (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date())
      const hasProAccess = isAdmin || isMod || isPro

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

    getProStatus()
  }, [supabase])

  return status
}