'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { AgeGate } from './AgeGate'

const STORAGE_KEY = 'compicfy_age_verified'
const STORAGE_DATE_KEY = 'compicfy_age_verified_date'
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
const ONE_YEAR = 365 * 24 * 60 * 60 * 1000

interface AgeContextType {
  canSeeAdult: boolean
  canSeeMature: boolean
  ageStatus: 'adult' | 'mature' | 'teen' | 'under18' | 'unknown'
}

const AgeContext = createContext<AgeContextType>({
  canSeeAdult: false,
  canSeeMature: false,
  ageStatus: 'unknown',
})

export const useAge = () => useContext(AgeContext)

export function AgeGateProvider({ children }: { children: React.ReactNode }) {
  const [showGate, setShowGate] = useState(false)
  const [ageStatus, setAgeStatus] = useState<AgeContextType['ageStatus']>('unknown')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const status = localStorage.getItem(STORAGE_KEY)
    const verifiedAt = localStorage.getItem(STORAGE_DATE_KEY)

    if (!status || !verifiedAt) {
      setShowGate(true)
      return
    }

    const elapsed = Date.now() - parseInt(verifiedAt)

    // Under-18 users: ask again after 1 year
    if (status === 'under18') {
      if (elapsed > ONE_YEAR) {
        setShowGate(true)
      } else {
        setAgeStatus('under18')
      }
      return
    }

    // Adult/mature/teen users: ask again after 30 days
    if (elapsed > THIRTY_DAYS) {
      setShowGate(true)
      return
    }

    setAgeStatus(status as AgeContextType['ageStatus'])
  }, [])

  const handleVerified = (canSeeAdult: boolean) => {
    const status = localStorage.getItem(STORAGE_KEY) as AgeContextType['ageStatus']
    setAgeStatus(status || (canSeeAdult ? 'adult' : 'teen'))
    setShowGate(false)
  }

  if (!mounted) return <>{children}</>

  return (
    <AgeContext.Provider value={{
      canSeeAdult: ageStatus === 'adult',
      canSeeMature: ageStatus === 'adult' || ageStatus === 'mature',
      ageStatus,
    }}>
      {showGate && <AgeGate onVerified={handleVerified} />}
      {children}
    </AgeContext.Provider>
  )
}