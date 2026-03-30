'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'

interface Props {
  themePreference: 'dark' | 'light' | 'system'
}

// Reads the saved theme_preference from the user's profile
// and applies it via next-themes on mount.
// Must be a client component — useTheme only works client-side.
export function ThemeSync({ themePreference }: Props) {
  const { setTheme } = useTheme()

  useEffect(() => {
    if (themePreference) {
      setTheme(themePreference)
    }
  }, [themePreference, setTheme])

  return null
}