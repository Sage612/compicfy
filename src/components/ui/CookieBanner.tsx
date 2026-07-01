'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type ConsentValue = 'all' | 'necessary' | null

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('ComPicfy_cookie_consent')
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  function handleConsent(value: ConsentValue) {
    if (!value) return
    localStorage.setItem('ComPicfy_cookie_consent', value)
    localStorage.setItem('ComPicfy_cookie_consent_date', new Date().toISOString())
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6"
    >
      <div className="mx-auto max-w-4xl rounded-xl border border-border bg-background/95 shadow-2xl backdrop-blur-sm p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground mb-1">
              🍪 We use cookies
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We use essential cookies to keep the site working, plus analytics and referral tracking 
              to support the community. No ads, no data selling ever.{' '}
              <Link
                href="/cookies"
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Cookie Policy
              </Link>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              onClick={() => handleConsent('necessary')}
              className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Necessary Only
            </button>

            <button
              onClick={() => handleConsent('all')}
              className="rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Accept All
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}