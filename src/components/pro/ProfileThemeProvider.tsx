'use client'

import { useEffect } from 'react'

const VALID_THEMES = ['default', 'gold', 'rose', 'teal', 'violet', 'amber', 'midnight'] as const
type ProfileTheme = typeof VALID_THEMES[number]

// Exported so ThemesClient can call it directly after saving
export function applyProfileTheme(theme: string) {
  const html = document.documentElement
  if (!theme || theme === 'default') {
    html.removeAttribute('data-theme')
  } else {
    html.setAttribute('data-theme', theme)
  }
}

interface Props {
  profileTheme: string
}

// Reads profile_theme from server and applies it on mount.
// Re-applies whenever profileTheme prop changes.
export function ProfileThemeProvider({ profileTheme }: Props) {
  useEffect(() => {
    applyProfileTheme(profileTheme)
    // Cleanup: remove data-theme when component unmounts
    // (e.g. user navigates away from pro area)
    return () => {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [profileTheme])

  return null
}