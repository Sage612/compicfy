'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { AgeGate } from './AgeGate'

const STORAGE_KEY = 'compicfy_age_verified'
const STORAGE_DATE_KEY = 'compicfy_age_verified_date'
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
const ONE_YEAR = 365 * 24 * 60 * 60 * 1000

export type AgeStatus = 'adult' | 'mature' | 'teen' | 'under18' | 'unknown'

interface AgeContextType {
  canSeeAdult: boolean
  canSeeMature: boolean
  ageStatus: AgeStatus
  isAllowedRating: (rating: string) => boolean
}

const AgeContext = createContext<AgeContextType>({
  canSeeAdult: false,
  canSeeMature: false,
  ageStatus: 'unknown',
  isAllowedRating: () => true,
})

export const useAge = () => useContext(AgeContext)

export function AgeGateProvider({ children }: { children: React.ReactNode }) {
  const [showGate, setShowGate] = useState(false)
  const [ageStatus, setAgeStatus] = useState<AgeStatus>('unknown')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const status = localStorage.getItem(STORAGE_KEY) as AgeStatus | null
    const verifiedAt = localStorage.getItem(STORAGE_DATE_KEY)

    if (!status || !verifiedAt) {
      setShowGate(true)
      return
    }

    const elapsed = Date.now() - parseInt(verifiedAt)

    if (status === 'under18') {
      if (elapsed > ONE_YEAR) {
        setShowGate(true)
      } else {
        setAgeStatus('under18')
      }
      return
    }

    if (elapsed > THIRTY_DAYS) {
      setShowGate(true)
      return
    }

    setAgeStatus(status)
  }, [])

  const handleVerified = () => {
    const status = localStorage.getItem(STORAGE_KEY) as AgeStatus
    setAgeStatus(status ?? 'teen')
    setShowGate(false)
  }

  const canSeeAdult = ageStatus === 'adult'
  const canSeeMature = ageStatus === 'adult' || ageStatus === 'mature'

  const isAllowedRating = (rating: string): boolean => {
    if (rating === 'adult') return canSeeAdult
    if (rating === 'mature') return canSeeMature
    return true // all_ages and teen are always visible
  }

  if (!mounted) return <>{children}</>

  return (
    <AgeContext.Provider value={{ canSeeAdult, canSeeMature, ageStatus, isAllowedRating }}>
      {showGate && <AgeGate onVerified={handleVerified} />}
      {children}
    </AgeContext.Provider>
  )
}